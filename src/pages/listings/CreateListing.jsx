import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Camera, X, ChevronRight, CheckCircle, Loader2 } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { normalizeApiError } from '../../services/apiClient';
import { listingsApi } from '../../services/listingsApi';
import { categoriesApi } from '../../services/categoriesApi';
import { locationsApi } from '../../services/locationsApi';
import { usersApi } from '../../services/usersApi';
import { externalPlatformsApi } from '../../services/externalPlatformsApi';
import ExternalProductFields from '../../components/listings/ExternalProductFields';
import ListingTypePicker from '../../components/listings/ListingTypePicker';
import { LISTING_TYPE, externalProductAllowance, isValidExternalUrl } from '../../utils/externalProducts';
import './CreateListing.css';

// External-product errors that the seller fixes on the "Store & link" step.
const EXTERNAL_DETAIL_ERROR_CODES = new Set(['EXTERNAL_PLATFORM_INVALID', 'EXTERNAL_PLATFORM_NAME_REQUIRED']);

// Backend errors caused by the photos; the user is sent back to step 1 to fix them.
const IMAGE_ERROR_CODES = new Set([
  'LISTING_IMAGE_REQUIRED',
  'IMAGE_LIMIT_EXCEEDED',
  'FILE_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'STORAGE_UPLOAD_FAILED',
  'STORAGE_UNAVAILABLE',
]);

const INITIAL_DRAFT = {
  listingType: LISTING_TYPE.REGULAR,
  externalPlatformId: '',
  externalPlatformOtherName: '',
  externalUrl: '',
  images: [],
  imageUrls: [],
  title: '',
  category_id: '',
  subcategory_id: '',
  description: '',
  priceType: 'fixed',
  price: '',
  province_id: '',
  city_id: '',
  whatsappEnabled: false,
  whatsapp: '',
};

export default function CreateListing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isMobile } = useUI();
  const { user, isLoading } = useAuth();
  const [externalAllowance, setExternalAllowance] = useState({ enabled: false });
  const [allowanceStatus, setAllowanceStatus] = useState('loading');
  const [allowanceRequest, setAllowanceRequest] = useState(0);
  const [platforms, setPlatforms] = useState([]);

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(INITIAL_DRAFT);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Track which fields the user has already interacted with
  const [touched, setTouched] = useState({});

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const totalSteps = 5;
  const update = (partial) => setDraft(d => ({ ...d, ...partial }));
  const requiredUuid = (value) => value.trim() || undefined;
  const optionalUuid = (value) => value.trim() || null;
  const optionalText = (value) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  };
  const isExternal = draft.listingType === LISTING_TYPE.EXTERNAL;
  const selectedPlatform = platforms.find(p => p.id === draft.externalPlatformId);
  const chooseListingType = (listingType) => {
    setError('');
    update(listingType === LISTING_TYPE.EXTERNAL
      ? { listingType, priceType: 'fixed', province_id: '', city_id: '', whatsappEnabled: false, whatsapp: '' }
      : { listingType });
  };
  const setStepError = (message) => {
    setError(message);
    return false;
  };
  const validateStep = (stepToValidate = step) => {
    if (stepToValidate === 1 && draft.images.length === 0) {
      return setStepError('Add at least one image before continuing.');
    }

    if (stepToValidate === 2) {
      const title = draft.title.trim();
      const description = draft.description.trim();

      if (title.length < 5) {
        return setStepError('Listing title must be at least 5 characters.');
      }
      if (!draft.category_id) {
        return setStepError('Please choose a category.');
      }
      if (description.length < 20) {
        return setStepError('Description must be at least 20 characters.');
      }
    }

    if (stepToValidate === 3 && draft.priceType !== 'contact') {
      const parsedPrice = Number.parseFloat(draft.price);
      if (draft.price.trim() === '' || Number.isNaN(parsedPrice) || parsedPrice < 0) {
        return setStepError(isExternal ? 'Enter the product price.' : 'Enter a valid price, or choose contact for price.');
      }
    }

    if (stepToValidate === 4 && isExternal) {
      if (!selectedPlatform) {
        return setStepError('Choose the platform the product is sold on.');
      }
      if (selectedPlatform.is_other && !draft.externalPlatformOtherName.trim()) {
        return setStepError('Enter the name of the platform.');
      }
      if (!isValidExternalUrl(draft.externalUrl)) {
        return setStepError('Enter a valid product link that starts with https://');
      }
    }

    setError('');
    return true;
  };
  const goToNextStep = () => {
    if (!validateStep(step)) return;
    setStep(s => s + 1);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  useEffect(() => {
    Promise.all([
      categoriesApi.getCategories(),
      locationsApi.getProvinces()
    ]).then(([catRes, provRes]) => {
      setCategories(catRes.data?.data || catRes.data || []);
      setProvinces(provRes.data?.data || provRes.data || []);
    }).catch(console.error);
  }, []);

  // External products are offered only when the seller's plan includes them.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    usersApi.getSellingUsage()
      .then(res => {
        if (!active) return;
        const allowance = externalProductAllowance(res.data?.data);
        setExternalAllowance(allowance);
        setAllowanceStatus('ready');
        if (!allowance.enabled) return;
        if (searchParams.get('type') === LISTING_TYPE.EXTERNAL && allowance.remaining > 0) {
          setDraft(d => ({ ...d, listingType: LISTING_TYPE.EXTERNAL, priceType: 'fixed' }));
        }
        externalPlatformsApi.getPlatforms()
          .then(platformRes => { if (active) setPlatforms(platformRes.data?.data || []); })
          .catch(console.error);
      })
      .catch(err => {
        console.error(err);
        if (active) setAllowanceStatus('error');
      });
    return () => { active = false; };
  }, [userId, searchParams, allowanceRequest]);

  const retryAllowance = () => {
    setAllowanceStatus('loading');
    setAllowanceRequest(n => n + 1);
  };

  useEffect(() => {
    if (draft.category_id) {
      categoriesApi.getSubcategories(draft.category_id).then(res => {
        setSubcategories(res.data?.data || res.data || []);
      }).catch(console.error);
    } else {
      setSubcategories([]);
    }
  }, [draft.category_id]);

  useEffect(() => {
    if (draft.province_id) {
      locationsApi.getCities({ province_id: draft.province_id }).then(res => {
        setCities(res.data?.data || res.data || []);
      }).catch(console.error);
    } else {
      setCities([]);
    }
  }, [draft.province_id]);

  if (isLoading) {
    return <div className="page-loading" style={{ minHeight: '100vh' }}></div>;
  }

  if (!user) {
    return (
      <div className="listing-create-auth-state">
        <div className="listing-create-auth-state__icon">
          <ImagePlus size={40} className="listing-create-muted-icon" />
        </div>
        <h3 className="listing-create-auth-state__title">Sign in to post a listing</h3>
        <p className="listing-create-auth-state__copy">You need an account to create listings and manage your store.</p>
        <button onClick={() => navigate('/login', { state: { from: '/create-listing' } })} className="listing-create-auth-state__button">Sign In</button>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (submitting) return;
    // Never send a listing without photos: stop here and take the user back to step 1.
    if (draft.images.length === 0) {
      setError('Add at least one photo before submitting your listing.');
      setStep(1);
      return;
    }
    for (let stepToValidate = 1; stepToValidate <= 4; stepToValidate += 1) {
      if (!validateStep(stepToValidate)) {
        setStep(stepToValidate);
        return;
      }
    }
    setSubmitting(true);
    setError('');
    try {
      const parsedPrice = Number.parseFloat(draft.price);
      const priceVal = Number.isNaN(parsedPrice) ? null : parsedPrice;
      
      const payload = {
        title: draft.title.trim() || undefined,
        description: draft.description.trim() || undefined,
        price: draft.priceType !== 'contact' ? priceVal : null,
        price_type: draft.priceType === 'contact' ? 'contact_for_price' : draft.priceType,
        category_id: requiredUuid(draft.category_id),
        subcategory_id: optionalUuid(draft.subcategory_id),
        province_id: optionalUuid(draft.province_id),
        city_id: optionalUuid(draft.city_id),
        whatsapp_enabled: draft.whatsappEnabled,
        whatsapp_number_override: draft.whatsappEnabled ? optionalText(draft.whatsapp) : null,
        ...(isExternal && {
          listing_type: LISTING_TYPE.EXTERNAL,
          price_type: 'fixed',
          province_id: null,
          city_id: null,
          whatsapp_enabled: false,
          whatsapp_number_override: null,
          external_platform_id: draft.externalPlatformId,
          external_platform_other_name: selectedPlatform?.is_other ? optionalText(draft.externalPlatformOtherName) : null,
          external_url: draft.externalUrl.trim(),
        }),
      };
      
      // Details and photos go in one request so the backend creates both or neither.
      const formData = new FormData();
      formData.append('data', JSON.stringify(payload));
      draft.images.forEach(img => {
        formData.append('images', img);
      });
      await listingsApi.createListing(formData);

      setSubmitted(true);
    } catch (err) {
      const responseCode = err.response?.data?.error?.code
        || err.response?.data?.code
        || err.response?.data?.error_code;
      console.error('Create listing failed', {
        status: err.response?.status,
        code: responseCode,
        message: err.response?.data?.error?.message
          || err.response?.data?.message
          || err.message,
      });
      const apiError = normalizeApiError(err);
      let errorMsg = responseCode === 'PLAN_CONFIGURATION_INVALID'
        ? 'Your selling plan is temporarily misconfigured. Please contact support.'
        : apiError.message || 'Failed to create listing';
      if (apiError.fieldErrors.length > 0) {
        const firstErr = apiError.fieldErrors[0];
        errorMsg += ` (${firstErr.field}: ${firstErr.message})`;
      }
      setError(errorMsg);
      if (IMAGE_ERROR_CODES.has(responseCode) || [413, 415].includes(err.response?.status)) {
        setStep(1);
      } else if (
        EXTERNAL_DETAIL_ERROR_CODES.has(responseCode)
        || apiError.fieldErrors.some(fieldError => String(fieldError.field).includes('external_'))
      ) {
        setStep(4);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = (e, source = 'gallery') => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const maxFileSize = 5 * 1024 * 1024;
    const invalidFile = files.find((file) => !acceptedTypes.has(file.type) || file.size > maxFileSize);

    if (invalidFile) {
      setError('Images must be JPG, PNG, or WebP files up to 5 MB each.');
      const ref = source === 'camera' ? cameraInputRef : fileInputRef;
    if (ref.current) ref.current.value = '';
      return;
    }
    
    const maxAllowed = 10 - draft.images.length;
    const toAdd = files.slice(0, maxAllowed);
    if (files.length > maxAllowed) {
      setError('You can add up to 10 images per listing.');
    } else {
      setError('');
    }
    
    const newImages = [...draft.images, ...toAdd];
    const newUrls = [...draft.imageUrls, ...toAdd.map(f => URL.createObjectURL(f))];
    
    update({ images: newImages, imageUrls: newUrls });
    const ref = source === 'camera' ? cameraInputRef : fileInputRef;
    if (ref.current) ref.current.value = '';
  };

  const removeImage = (i) => {
    setDraft(d => {
      const newUrls = [...d.imageUrls];
      URL.revokeObjectURL(newUrls[i]);
      newUrls.splice(i, 1);
      
      const newImages = [...d.images];
      newImages.splice(i, 1);
      
      return { ...d, images: newImages, imageUrls: newUrls };
    });
  };

  if (submitted) {
    return (
      <div className="listing-create-success">
        <CheckCircle size={48} className="listing-create-success__icon" />
        <h1 className="listing-create-success__title">Listing submitted!</h1>
        <p className="listing-create-success__copy">Your listing is being reviewed.</p>
        <button onClick={() => navigate('/')} className="listing-create-success__button">Go Home</button>
      </div>
    );
  }

  const stepTitle = ['Add photos', 'Listing details', 'Set price', isExternal ? 'Store & link' : 'Location & contact', 'Review & submit'][step - 1];

  return (
    <div className={`create-listing-container ${isMobile ? 'create-listing-container--mobile' : 'create-listing-container--desktop'}`}>
      <div className="cl-inner">
        {/* Header */}
        <div className="cl-header">
          <button onClick={() => step === 1 ? navigate('/') : setStep(s => s - 1)} className="cl-back-btn">
            <ArrowLeft size={20} />
          </button>
          <div className="cl-progress-info">
            <div className="cl-progress-text">
              <span>{stepTitle}</span>
              <span className="listing-create-progress__step-count">Step {step} of {totalSteps}</span>
            </div>
            <div className="cl-progress-bar">
              <div className="cl-progress-fill" style={{ width: `${(step / totalSteps) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="cl-content">
          {error && <div className="listing-create-error">{error}</div>}

          {step === 1 && (
            <div className="cl-step">
              <ListingTypePicker
                value={draft.listingType}
                onChange={chooseListingType}
                allowanceStatus={allowanceStatus}
                allowance={externalAllowance}
                onRetry={retryAllowance}
              />
              <p className="cl-help-text">
                Add clear photos to help buyers trust your listing. At least one photo is required; you can add up to 10.
              </p>
              <div className="cl-photo-grid">
                {draft.imageUrls.map((url, i) => (
                  <div key={i} className="cl-photo-box">
                    <img src={url} alt="" />
                    <button onClick={() => removeImage(i)}><X size={14}/></button>
                  </div>
                ))}
                {draft.images.length < 10 && (
                  <>
                    <div className="cl-photo-add">
                      <button
                        type="button"
                        className="cl-photo-add-btn"
                        onClick={() => fileInputRef.current?.click()}
                        title="Choose from gallery"
                      >
                        <ImagePlus size={22} />
                        <span>Gallery</span>
                      </button>
                      <div className="cl-photo-add-divider" />
                      <button
                        type="button"
                        className="cl-photo-add-btn"
                        onClick={() => cameraInputRef.current?.click()}
                        title="Take a photo"
                      >
                        <Camera size={22} />
                        <span>Camera</span>
                      </button>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      ref={fileInputRef}
                      onChange={(e) => handleImageChange(e, 'gallery')}
                      className="listing-create-file-input"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      ref={cameraInputRef}
                      onChange={(e) => handleImageChange(e, 'camera')}
                      className="listing-create-file-input"
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="cl-step">
              <div className="form-group">
                <div className="cl-field-header">
                  <label>Listing title *</label>
                  <span className={`cl-char-count ${draft.title.length < 5 && touched.title ? 'cl-char-count--error' : ''}`}>
                    {draft.title.length}/80
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Enter a clear title for your listing"
                  value={draft.title}
                  onChange={e => { update({ title: e.target.value }); setTouched(t => ({ ...t, title: true })); }}
                  onBlur={() => setTouched(t => ({ ...t, title: true }))}
                  maxLength={80}
                  className={touched.title && draft.title.trim().length < 5 ? 'cl-input--error' : ''}
                />
                {touched.title && draft.title.trim().length < 5 && (
                  <p className="cl-field-hint cl-field-hint--error">
                    {draft.title.trim().length === 0 ? 'Title is required.' : `${5 - draft.title.trim().length} more character${5 - draft.title.trim().length === 1 ? '' : 's'} needed.`}
                  </p>
                )}
                {touched.title && draft.title.trim().length >= 5 && (
                  <p className="cl-field-hint cl-field-hint--ok">✓ Looks good</p>
                )}
              </div>
              <div className="form-group">
                <label>Category *</label>
                <div className="cl-cat-grid">
                  {categories.map(c => (
                    <button
                      key={c.id}
                      onClick={() => update({ category_id: c.id, subcategory_id: '' })}
                      className={`cl-category-option ${draft.category_id === c.id ? 'cl-category-option--active' : ''}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              {subcategories.length > 0 && (
                <div className="form-group">
                  <label>Subcategory</label>
                  <div className="cl-tag-list">
                    {subcategories.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => update({ subcategory_id: sub.id })}
                        className={`cl-subcategory-option ${draft.subcategory_id === sub.id ? 'cl-subcategory-option--active' : ''}`}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="form-group">
                <div className="cl-field-header">
                  <label>Description *</label>
                  <span className={`cl-char-count ${draft.description.length < 20 && touched.description ? 'cl-char-count--error' : ''}`}>
                    {draft.description.length} chars
                  </span>
                </div>
                <textarea
                  rows={5}
                  placeholder="Describe your item — condition, size, features, reason for selling…"
                  value={draft.description}
                  onChange={e => { update({ description: e.target.value }); setTouched(t => ({ ...t, description: true })); }}
                  onBlur={() => setTouched(t => ({ ...t, description: true }))}
                  className={touched.description && draft.description.trim().length < 20 ? 'cl-input--error' : ''}
                />
                {touched.description && draft.description.trim().length < 20 && (
                  <p className="cl-field-hint cl-field-hint--error">
                    {draft.description.trim().length === 0
                      ? 'Description is required.'
                      : `At least ${20 - draft.description.trim().length} more character${20 - draft.description.trim().length === 1 ? '' : 's'} needed.`}
                  </p>
                )}
                {touched.description && draft.description.trim().length >= 20 && (
                  <p className="cl-field-hint cl-field-hint--ok">✓ Great description</p>
                )}
              </div>
            </div>
          )}

          {step === 3 && isExternal && (
            <div className="cl-step">
              <div className="form-group">
                <label>Price (RWF) *</label>
                <input type="number" min="0" placeholder="0" value={draft.price} onChange={e => update({ price: e.target.value })} />
                <p className="cl-field-hint">Use the current price on the external store. Buyers see the final price there.</p>
              </div>
            </div>
          )}

          {step === 3 && !isExternal && (
            <div className="cl-step">
              <div className="form-group">
                <label>Price type *</label>
                <div className="cl-price-types">
                  {['fixed', 'negotiable', 'contact'].map(pt => (
                    <button
                      key={pt}
                      onClick={() => update({ priceType: pt })}
                      className={`cl-price-type ${draft.priceType === pt ? 'cl-price-type--active' : ''}`}
                    >
                      <span className="radio"><span className="inner"/></span>
                      <span className="cl-price-type__label">{pt}</span>
                    </button>
                  ))}
                </div>
              </div>
              {draft.priceType !== 'contact' && (
                <div className="form-group">
                  <label>Price (RWF) *</label>
                  <input type="number" placeholder="0" value={draft.price} onChange={e => update({ price: e.target.value })} />
                </div>
              )}
            </div>
          )}

          {step === 4 && isExternal && (
            <div className="cl-step">
              <p className="cl-help-text">Tell buyers where to buy this product. They will be sent to your link.</p>
              <ExternalProductFields
                platforms={platforms}
                platformId={draft.externalPlatformId}
                otherName={draft.externalPlatformOtherName}
                url={draft.externalUrl}
                onChange={update}
                touched={touched}
                onTouch={field => setTouched(t => ({ ...t, [field]: true }))}
              />
            </div>
          )}

          {step === 4 && !isExternal && (
            <div className="cl-step">
              <div className="form-group">
                <label>Province</label>
                <select value={draft.province_id} onChange={e => update({ province_id: e.target.value, city_id: '' })}>
                  <option value="">Select province</option>
                  {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {cities.length > 0 && (
                <div className="form-group">
                  <label>City</label>
                  <select value={draft.city_id} onChange={e => update({ city_id: e.target.value })}>
                    <option value="">Select city</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>WhatsApp Contact</label>
                <label className="listing-create-whatsapp-toggle">
                  <input type="checkbox" checked={draft.whatsappEnabled} onChange={e => update({ whatsappEnabled: e.target.checked })} />
                  Allow WhatsApp contact
                </label>
                {draft.whatsappEnabled && (
                  <div className="cl-phone-field">
                    <span className="cl-phone-prefix">+250</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="794101251"
                      maxLength={9}
                      value={draft.whatsapp}
                      onChange={e => {
                        // Allow digits only
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                        update({ whatsapp: digits });
                        setTouched(t => ({ ...t, whatsapp: true }));
                      }}
                      onBlur={() => setTouched(t => ({ ...t, whatsapp: true }))}
                      className={`cl-phone-input${touched.whatsapp && draft.whatsapp.length !== 9 ? ' cl-input--error' : ''}`}
                    />
                    <span className={`cl-phone-count ${
                      draft.whatsapp.length === 9 ? 'cl-phone-count--ok' :
                      touched.whatsapp ? 'cl-phone-count--error' : ''
                    }`}>
                      {draft.whatsapp.length}/9
                    </span>
                  </div>
                )}
                {draft.whatsappEnabled && touched.whatsapp && draft.whatsapp.length !== 9 && (
                  <p className="cl-field-hint cl-field-hint--error">
                    {draft.whatsapp.length === 0 ? 'Phone number is required.' : `Must be exactly 9 digits — ${9 - draft.whatsapp.length} more needed.`}
                  </p>
                )}
                {draft.whatsappEnabled && draft.whatsapp.length === 9 && (
                  <p className="cl-field-hint cl-field-hint--ok">✓ Number looks good (+250 {draft.whatsapp})</p>
                )}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="cl-step">
              <h3>Review your listing</h3>
              <p>Please review your details before submitting.</p>
              <div className="cl-review-box">
                <b>Title:</b> {draft.title}
              </div>
              <div className="cl-review-box">
                <b>Category:</b> {categories.find(c => c.id === draft.category_id)?.name}
              </div>
              <div className="cl-review-box">
                <b>Price:</b> {draft.priceType} {draft.price && `(RWF ${draft.price})`}
              </div>
              <div className="cl-review-box">
                <b>Photos:</b> {draft.images.length}
              </div>
              {isExternal && (
                <>
                  <div className="cl-review-box">
                    <b>Sold on:</b> {selectedPlatform?.is_other ? draft.externalPlatformOtherName.trim() : selectedPlatform?.name}
                  </div>
                  <div className="cl-review-box cl-review-box--wrap">
                    <b>Product link:</b> {draft.externalUrl.trim()}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="cl-footer">
          {step < totalSteps ? (
            <button onClick={goToNextStep} className="listing-create-footer__button">Continue <ChevronRight size={16}/></button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} className="listing-create-footer__button">
              {submitting ? <Loader2 size={16} className="listing-create-submit-spinner" /> : 'Submit for review'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
