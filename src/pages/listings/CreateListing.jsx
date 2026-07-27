import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ImagePlus, X, ChevronRight, CheckCircle, Loader2 } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { listingsApi } from '../../services/listingsApi';
import { categoriesApi } from '../../services/categoriesApi';
import { locationsApi } from '../../services/locationsApi';

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
  const { user } = useAuth();
  
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

  useEffect(() => {
    Promise.all([
      categoriesApi.getCategories(),
      locationsApi.getProvinces()
    ]).then(([catRes, provRes]) => {
      setCategories(catRes.data.data);
      setProvinces(provRes.data.data);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (draft.category_id) {
      categoriesApi.getSubcategories(draft.category_id).then(res => {
        setSubcategories(res.data.data);
      }).catch(console.error);
    } else {
      setSubcategories([]);
    }
  }, [draft.category_id]);

  useEffect(() => {
    if (draft.province_id) {
      locationsApi.getCities({ province_id: draft.province_id }).then(res => {
        setCities(res.data.data);
      }).catch(console.error);
    } else {
      setCities([]);
    }
  }, [draft.province_id]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-full px-6">
        <div className="w-20 h-20 bg-ink-100 rounded-3xl flex items-center justify-center mb-4">
          <ImagePlus size={40} className="text-ink-300" />
        </div>
        <h3 className="text-lg font-bold text-ink-800 mb-2">Sign in to post a listing</h3>
        <p className="text-sm text-ink-500 mb-6">You need an account to create listings and manage your store.</p>
        <button onClick={() => showAuth()} className="btn btn-primary px-6">Sign In</button>
      </div>
    );
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const parsedPrice = parseFloat(draft.price);
      const priceVal = !isNaN(parsedPrice) ? parsedPrice : null;
      
      const payload = {
        title: draft.title || undefined,
        description: draft.description || undefined,
        price: draft.priceType !== 'contact' ? priceVal : null,
        price_type: draft.priceType === 'contact' ? 'contact_for_price' : draft.priceType,
        category_id: draft.category_id || undefined,
        subcategory_id: draft.subcategory_id || null,
        province_id: draft.province_id || null,
        city_id: draft.city_id || null,
        whatsapp_enabled: draft.whatsappEnabled,
        whatsapp_number_override: draft.whatsapp || null,
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
      console.error(err);
      let errorMsg = err.response?.data?.message || err.message || 'Failed to create listing';
      if (err.response?.data?.errors?.length > 0) {
        const firstErr = err.response.data.errors[0];
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
    
    const maxAllowed = 10 - draft.images.length;
    const toAdd = files.slice(0, maxAllowed);
    
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
      <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-ink-50 animate-fade-in">
        <CheckCircle size={48} color="var(--color-brand-600)" style={{marginBottom: '1rem'}} />
        <h1 className="text-2xl font-bold mb-2">Listing submitted!</h1>
        <p className="text-ink-500 mb-6">Your listing is being reviewed.</p>
        <button onClick={() => navigate('/')} className="btn btn-primary w-full max-w-sm mb-3">Go Home</button>
      </div>
    );
  }

  const stepTitle = ['Add photos', 'Listing details', 'Set price', 'Location & contact', 'Review & submit'][step - 1];

  return (
    <div className={`create-listing-container ${isMobile ? 'mobile' : 'desktop'}`}>
      <div className="cl-inner">
        {/* Header */}
        <div className="cl-header">
          <button onClick={() => step === 1 ? navigate('/') : setStep(s => s - 1)} className="cl-back-btn">
            <ArrowLeft size={20} />
          </button>
          <div className="cl-progress-info">
            <div className="cl-progress-text">
              <span>{stepTitle}</span>
              <span className="text-xs text-ink-400">Step {step} of {totalSteps}</span>
            </div>
            <div className="cl-progress-bar">
              <div className="cl-progress-fill" style={{ width: `${(step / totalSteps) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="cl-content">
          {error && <div className="error-text mb-4">{error}</div>}

          {step === 1 && (
            <div className="cl-step">
              <p className="cl-help-text">Add clear photos to help buyers trust your listing. You can add up to 10 images.</p>
              <div className="cl-photo-grid">
                {draft.imageUrls.map((url, i) => (
                  <div key={i} className={`cl-photo-box ${i===0?'cover':''}`}>
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
                    <input type="file" multiple accept="image/jpeg,image/png,image/webp" ref={fileInputRef} onChange={handleImageChange} style={{display:'none'}} />
                  </>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="cl-step">
              <div className="form-group">
                <label>Listing title *</label>
                <input type="text" placeholder="e.g. Samsung Galaxy A54" value={draft.title} onChange={e => update({ title: e.target.value })} maxLength={80} />
              </div>
              <div className="form-group">
                <label>Category *</label>
                <div className="cl-cat-grid">
                  {categories.map(c => (
                    <button key={c.id} onClick={() => update({ category_id: c.id, subcategory_id: '' })} className={draft.category_id === c.id ? 'active' : ''}>{c.name}</button>
                  ))}
                </div>
              </div>
              {subcategories.length > 0 && (
                <div className="form-group">
                  <label>Subcategory</label>
                  <div className="cl-tag-list">
                    {subcategories.map(sub => (
                      <button key={sub.id} onClick={() => update({ subcategory_id: sub.id })} className={draft.subcategory_id === sub.id ? 'active' : ''}>{sub.name}</button>
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
                    <button key={pt} onClick={() => update({ priceType: pt })} className={draft.priceType === pt ? 'active' : ''}>
                      <span className="radio"><span className="inner"/></span>
                      <span style={{textTransform:'capitalize'}}>{pt}</span>
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
                <label style={{display:'flex', alignItems:'center', gap:'0.5rem', fontWeight:'normal'}}>
                  <input type="checkbox" checked={draft.whatsappEnabled} onChange={e => update({ whatsappEnabled: e.target.checked })} />
                  Allow WhatsApp contact
                </label>
                {draft.whatsappEnabled && (
                  <input type="tel" placeholder="788000000" value={draft.whatsapp} onChange={e => update({ whatsapp: e.target.value })} style={{marginTop:'0.5rem'}} />
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
            <button onClick={() => setStep(s => s + 1)} className="btn btn-primary w-full">Continue <ChevronRight size={16}/></button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary w-full">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit for review'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
