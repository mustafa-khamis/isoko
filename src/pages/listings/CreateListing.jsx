import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ImagePlus, X, ChevronRight, CheckCircle, Loader2 } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { normalizeApiError } from '../../services/apiClient';
import { listingsApi } from '../../services/listingsApi';
import { categoriesApi } from '../../services/categoriesApi';
import { locationsApi } from '../../services/locationsApi';
import './CreateListing.css';

const INITIAL_DRAFT = {
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
  const { isMobile, showAuth } = useUI();
  const { user, isLoading } = useAuth();
  
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(INITIAL_DRAFT);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const fileInputRef = useRef(null);

  const totalSteps = 5;
  const update = (partial) => setDraft(d => ({ ...d, ...partial }));
  const requiredUuid = (value) => value.trim() || undefined;
  const optionalUuid = (value) => value.trim() || null;
  const optionalText = (value) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  };
  const setStepError = (message) => {
    setError(message);
    return false;
  };
  const validateStep = (stepToValidate = step) => {
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
        return setStepError('Enter a valid price, or choose contact for price.');
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
    Promise.all([
      categoriesApi.getCategories(),
      locationsApi.getProvinces()
    ]).then(([catRes, provRes]) => {
      setCategories(catRes.data?.data || catRes.data || []);
      setProvinces(provRes.data?.data || provRes.data || []);
    }).catch(console.error);
  }, []);

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
        <button onClick={() => showAuth()} className="listing-create-auth-state__button">Sign In</button>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (submitting) return;
    for (let stepToValidate = 2; stepToValidate <= 3; stepToValidate += 1) {
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
      };
      
      const res = await listingsApi.createListing(payload);
      const listingId = res.data.data.id;

      if (draft.images.length > 0) {
        const formData = new FormData();
        draft.images.forEach(img => {
          formData.append('images', img);
        });
        await listingsApi.uploadListingImages(listingId, formData);
      }

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
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const maxFileSize = 5 * 1024 * 1024;
    const invalidFile = files.find((file) => !acceptedTypes.has(file.type) || file.size > maxFileSize);

    if (invalidFile) {
      setError('Images must be JPG, PNG, or WebP files up to 5 MB each.');
      if (fileInputRef.current) fileInputRef.current.value = '';
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
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  const stepTitle = ['Add photos', 'Listing details', 'Set price', 'Location & contact', 'Review & submit'][step - 1];

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
              <p className="cl-help-text">Add clear photos to help buyers trust your listing. You can add up to 10 images.</p>
              <div className="cl-photo-grid">
                {draft.imageUrls.map((url, i) => (
                  <div key={i} className="cl-photo-box">
                    <img src={url} alt="" />
                    <button onClick={() => removeImage(i)}><X size={14}/></button>
                  </div>
                ))}
                {draft.images.length < 10 && (
                  <>
                    <button onClick={() => fileInputRef.current?.click()} className="cl-photo-add">
                      <ImagePlus size={24} />
                      <span>Add photo</span>
                    </button>
                    <input type="file" multiple accept="image/jpeg,image/png,image/webp" ref={fileInputRef} onChange={handleImageChange} className="listing-create-file-input" />
                  </>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="cl-step">
              <div className="form-group">
                <label>Listing title *</label>
                <input type="text" placeholder="Enter a clear title for your listing" value={draft.title} onChange={e => update({ title: e.target.value })} maxLength={80} />
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
                <label>Description *</label>
                <textarea rows={5} placeholder="Describe your item..." value={draft.description} onChange={e => update({ description: e.target.value })} />
              </div>
            </div>
          )}

          {step === 3 && (
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

          {step === 4 && (
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
                  <input type="tel" placeholder="788000000" value={draft.whatsapp} onChange={e => update({ whatsapp: e.target.value })} className="listing-create-whatsapp-input" />
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
