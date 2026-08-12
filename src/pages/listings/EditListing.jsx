import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  CheckCircle,
  ImagePlus,
  Loader2,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { normalizeApiError } from '../../services/apiClient';
import { listingsApi } from '../../services/listingsApi';
import { categoriesApi } from '../../services/categoriesApi';
import { locationsApi } from '../../services/locationsApi';
import './EditListing.css';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const optionalUuid = (v) => (v && v.trim() ? v.trim() : null);
const optionalText = (v) => { const t = v?.trim(); return t || null; };

/* ─── Tabs ────────────────────────────────────────────────────────────────── */
const TABS = [
  { key: 'details', label: 'Details' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'location', label: 'Location' },
  { key: 'photos',   label: 'Photos'  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function EditListing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isMobile } = useUI();

  /* ── Remote data ──────────────────────────────────────────────────────── */
  const [categories,    setCategories]    = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [provinces,     setProvinces]     = useState([]);
  const [cities,        setCities]        = useState([]);

  /* ── Page state ───────────────────────────────────────────────────────── */
  const [activeTab,   setActiveTab]   = useState('details');
  const [pageLoading, setPageLoading] = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState('');

  /* ── Form state ───────────────────────────────────────────────────────── */
  const [form, setForm] = useState({
    title:          '',
    category_id:    '',
    subcategory_id: '',
    description:    '',
    priceType:      'fixed',
    price:          '',
    province_id:    '',
    city_id:        '',
    whatsappEnabled: false,
    whatsapp:       '',
  });
  const [touched, setTouched] = useState({});

  /* ── Image state ──────────────────────────────────────────────────────── */
  const [existingImages, setExistingImages] = useState([]);
  const [newImages,      setNewImages]      = useState([]);
  const [newImageUrls,   setNewImageUrls]   = useState([]);
  const [deletingImgId,  setDeletingImgId]  = useState(null);

  const fileInputRef   = useRef(null);
  const cameraInputRef = useRef(null);

  /* ── Load categories / provinces ─────────────────────────────────────── */
  useEffect(() => {
    Promise.all([
      categoriesApi.getCategories(),
      locationsApi.getProvinces(),
    ]).then(([catRes, provRes]) => {
      setCategories(catRes.data?.data  || catRes.data  || []);
      setProvinces( provRes.data?.data || provRes.data || []);
    }).catch(console.error);
  }, []);

  /* ── Load subcategories when category changes ─────────────────────────── */
  useEffect(() => {
    if (!form.category_id) { setSubcategories([]); return; }
    categoriesApi.getSubcategories(form.category_id)
      .then(r => setSubcategories(r.data?.data || r.data || []))
      .catch(console.error);
  }, [form.category_id]);

  /* ── Load cities when province changes ───────────────────────────────── */
  useEffect(() => {
    if (!form.province_id) { setCities([]); return; }
    locationsApi.getCities({ province_id: form.province_id })
      .then(r => setCities(r.data?.data || r.data || []))
      .catch(console.error);
  }, [form.province_id]);

  /* ── Load listing ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (authLoading || !user) return;
    if (!id) return;

    listingsApi.getListingForManage(id)
      .then(res => {
        const l = res.data?.data || res.data;
        if (!l) { navigate('/my-listings'); return; }

        let pt = 'fixed';
        if (l.price_type === 'negotiable')        pt = 'negotiable';
        if (l.price_type === 'contact_for_price') pt = 'contact';

        setForm({
          title:           l.title          || '',
          category_id:     l.category_id    || '',
          subcategory_id:  l.subcategory_id || '',
          description:     l.description    || '',
          priceType:       pt,
          price:           l.price != null ? String(l.price) : '',
          province_id:     l.province_id    || '',
          city_id:         l.city_id        || '',
          whatsappEnabled: Boolean(l.whatsapp_enabled),
          whatsapp:        l.whatsapp_number_override || '',
        });

        const imgs = (l.images || []).map(img =>
          typeof img === 'string'
            ? { id: null, url: img }
            : { id: img.id, url: img.url || img.image_url }
        );
        setExistingImages(imgs);
      })
      .catch(() => navigate('/my-listings'))
      .finally(() => setPageLoading(false));
  }, [id, user, authLoading, navigate]);

  /* ── Helpers ──────────────────────────────────────────────────────────── */
  const update = (partial) => setForm(f => ({ ...f, ...partial }));
  const touch  = (field)   => setTouched(t => ({ ...t, [field]: true }));

  const validate = () => {
    const title = form.title.trim();
    const desc  = form.description.trim();
    if (title.length < 5)  { setError('Title must be at least 5 characters.'); return false; }
    if (!form.category_id) { setError('Please select a category.'); return false; }
    if (desc.length < 20)  { setError('Description must be at least 20 characters.'); return false; }
    if (form.priceType !== 'contact') {
      const p = Number.parseFloat(form.price);
      if (form.price.trim() === '' || Number.isNaN(p) || p < 0) {
        setError('Enter a valid price, or choose "Contact for price".');
        return false;
      }
    }
    return true;
  };

  /* ── Image handlers ───────────────────────────────────────────────────── */
  const handleImageAdd = (e, source = 'gallery') => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const accepted = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const maxSize  = 5 * 1024 * 1024;
    const invalid  = files.find(f => !accepted.has(f.type) || f.size > maxSize);

    if (invalid) {
      setError('Images must be JPG, PNG, or WebP, up to 5 MB each.');
      const ref = source === 'camera' ? cameraInputRef : fileInputRef;
      if (ref.current) ref.current.value = '';
      return;
    }

    const totalCurrent = existingImages.length + newImages.length;
    const maxAllowed   = 10 - totalCurrent;
    const toAdd        = files.slice(0, maxAllowed);

    if (files.length > maxAllowed) setError('Max 10 images per listing.');
    else setError('');

    setNewImages(n    => [...n, ...toAdd]);
    setNewImageUrls(u => [...u, ...toAdd.map(f => URL.createObjectURL(f))]);
    const ref = source === 'camera' ? cameraInputRef : fileInputRef;
    if (ref.current) ref.current.value = '';
  };

  const removeNewImage = (i) => {
    setNewImageUrls(u => {
      URL.revokeObjectURL(u[i]);
      return u.filter((_, idx) => idx !== i);
    });
    setNewImages(n => n.filter((_, idx) => idx !== i));
  };

  const removeExistingImage = async (img, i) => {
    if (img.id) {
      setDeletingImgId(img.id);
      try {
        await listingsApi.deleteListingImage(id, img.id);
      } catch { /* silently remove from UI */ }
      setDeletingImgId(null);
    }
    setExistingImages(imgs => imgs.filter((_, idx) => idx !== i));
  };

  /* ── Save ─────────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (saving) return;
    setError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const parsedPrice = Number.parseFloat(form.price);
      const priceVal    = Number.isNaN(parsedPrice) ? null : parsedPrice;

      await listingsApi.updateListing(id, {
        title:                    form.title.trim(),
        description:              form.description.trim(),
        price:                    form.priceType !== 'contact' ? priceVal : null,
        price_type:               form.priceType === 'contact' ? 'contact_for_price' : form.priceType,
        category_id:              form.category_id || undefined,
        subcategory_id:           optionalUuid(form.subcategory_id),
        province_id:              optionalUuid(form.province_id),
        city_id:                  optionalUuid(form.city_id),
        whatsapp_enabled:         form.whatsappEnabled,
        whatsapp_number_override: form.whatsappEnabled ? optionalText(form.whatsapp) : null,
      });

      if (newImages.length > 0) {
        const fd = new FormData();
        newImages.forEach(img => fd.append('images', img));
        await listingsApi.uploadListingImages(id, fd);
      }

      setSaved(true);
    } catch (err) {
      const apiError = normalizeApiError(err);
      setError(apiError.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  /* ─── Loading / success screens ──────────────────────────────────────── */
  if (authLoading || pageLoading) {
    return (
      <div className="el-loading-screen">
        <Loader2 size={28} className="el-loading-spinner" />
      </div>
    );
  }

  if (saved) {
    return (
      <div className="el-success-screen">
        <CheckCircle size={48} className="el-success-icon" />
        <h1 className="el-success-title">Changes saved!</h1>
        <p className="el-success-copy">Your listing has been updated and will be reviewed shortly.</p>
        <button onClick={() => navigate('/my-listings')} className="el-success-btn">
          Back to my listings
        </button>
      </div>
    );
  }

  const totalImages = existingImages.length + newImages.length;

  /* ─── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className={`el-page ${isMobile ? 'el-page--mobile' : 'el-page--desktop'}`}>
      <div className="el-inner">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className={`el-header ${isMobile ? 'el-header--sticky' : ''}`}>
          <button
            onClick={() => navigate('/my-listings')}
            className="el-back-btn"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="el-header-text">
            <h1 className="el-title">Edit listing</h1>
            <p className="el-subtitle">Changes go back for review</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="el-save-btn"
            id="edit-listing-save-btn"
          >
            {saving ? <Loader2 size={15} className="el-save-spinner" /> : 'Save'}
          </button>
        </header>

        {/* ── Tab bar ─────────────────────────────────────────────────── */}
        <div className="el-tabs" role="tablist">
          {TABS.map(tab => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => { setActiveTab(tab.key); setError(''); }}
              className={`el-tab ${activeTab === tab.key ? 'el-tab--active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Error banner ────────────────────────────────────────────── */}
        {error && <div className="el-error-banner" role="alert">{error}</div>}

        {/* ── Tab panels ──────────────────────────────────────────────── */}
        <div className="el-body">

          {/* Details tab */}
          {activeTab === 'details' && (
            <div className="el-panel">
              <div className="el-field">
                <div className="el-field-header">
                  <label htmlFor="el-title-input">Title *</label>
                  <span className={`el-char-count ${form.title.length < 5 && touched.title ? 'el-char-count--error' : ''}`}>
                    {form.title.length}/160
                  </span>
                </div>
                <input
                  id="el-title-input"
                  type="text"
                  value={form.title}
                  maxLength={160}
                  placeholder="Clear, descriptive title"
                  onChange={e => { update({ title: e.target.value }); touch('title'); }}
                  onBlur={() => touch('title')}
                  className={`el-input ${touched.title && form.title.trim().length < 5 ? 'el-input--error' : ''}`}
                />
                {touched.title && form.title.trim().length < 5 && (
                  <p className="el-hint el-hint--error">
                    {form.title.trim().length === 0 ? 'Title is required.' : `${5 - form.title.trim().length} more character(s) needed.`}
                  </p>
                )}
                {touched.title && form.title.trim().length >= 5 && (
                  <p className="el-hint el-hint--ok">✓ Looks good</p>
                )}
              </div>

              <div className="el-field">
                <label>Category *</label>
                <div className="el-cat-grid">
                  {categories.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => update({ category_id: c.id, subcategory_id: '' })}
                      className={`el-cat-option ${form.category_id === c.id ? 'el-cat-option--active' : ''}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {subcategories.length > 0 && (
                <div className="el-field">
                  <label>Subcategory</label>
                  <div className="el-tag-list">
                    {subcategories.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => update({ subcategory_id: s.id })}
                        className={`el-tag ${form.subcategory_id === s.id ? 'el-tag--active' : ''}`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="el-field">
                <div className="el-field-header">
                  <label htmlFor="el-desc-input">Description *</label>
                  <span className={`el-char-count ${form.description.length < 20 && touched.description ? 'el-char-count--error' : ''}`}>
                    {form.description.length} chars
                  </span>
                </div>
                <textarea
                  id="el-desc-input"
                  rows={6}
                  value={form.description}
                  placeholder="Describe your item — condition, features, reason for selling…"
                  onChange={e => { update({ description: e.target.value }); touch('description'); }}
                  onBlur={() => touch('description')}
                  className={`el-input el-textarea ${touched.description && form.description.trim().length < 20 ? 'el-input--error' : ''}`}
                />
                {touched.description && form.description.trim().length < 20 && (
                  <p className="el-hint el-hint--error">
                    {form.description.trim().length === 0
                      ? 'Description is required.'
                      : `${20 - form.description.trim().length} more character(s) needed.`}
                  </p>
                )}
                {touched.description && form.description.trim().length >= 20 && (
                  <p className="el-hint el-hint--ok">✓ Great description</p>
                )}
              </div>
            </div>
          )}

          {/* Pricing tab */}
          {activeTab === 'pricing' && (
            <div className="el-panel">
              <div className="el-field">
                <label>Price type *</label>
                <div className="el-price-types">
                  {[
                    { key: 'fixed',      label: 'Fixed price',       desc: 'Set a firm asking price' },
                    { key: 'negotiable', label: 'Negotiable',        desc: 'Open to offers' },
                    { key: 'contact',    label: 'Contact for price', desc: "Don't show a number" },
                  ].map(pt => (
                    <button
                      key={pt.key}
                      type="button"
                      onClick={() => update({ priceType: pt.key })}
                      className={`el-price-opt ${form.priceType === pt.key ? 'el-price-opt--active' : ''}`}
                    >
                      <span className="el-radio">
                        {form.priceType === pt.key && <span className="el-radio__dot" />}
                      </span>
                      <span className="el-price-opt__text">
                        <span className="el-price-opt__label">{pt.label}</span>
                        <span className="el-price-opt__desc">{pt.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {form.priceType !== 'contact' && (
                <div className="el-field">
                  <label htmlFor="el-price-input">Amount (RWF) *</label>
                  <div className="el-price-field">
                    <span className="el-price-prefix">RWF</span>
                    <input
                      id="el-price-input"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.price}
                      onChange={e => update({ price: e.target.value })}
                      className="el-price-input"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Location tab */}
          {activeTab === 'location' && (
            <div className="el-panel">
              <div className="el-field">
                <label htmlFor="el-province-select">Province</label>
                <select
                  id="el-province-select"
                  value={form.province_id}
                  onChange={e => update({ province_id: e.target.value, city_id: '' })}
                  className="el-select"
                >
                  <option value="">Select province</option>
                  {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {cities.length > 0 && (
                <div className="el-field">
                  <label htmlFor="el-city-select">City</label>
                  <select
                    id="el-city-select"
                    value={form.city_id}
                    onChange={e => update({ city_id: e.target.value })}
                    className="el-select"
                  >
                    <option value="">Select city</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div className="el-field">
                <label>WhatsApp contact</label>
                <label className="el-toggle">
                  <input
                    type="checkbox"
                    checked={form.whatsappEnabled}
                    onChange={e => update({ whatsappEnabled: e.target.checked })}
                  />
                  <span className="el-toggle__track">
                    <span className="el-toggle__thumb" />
                  </span>
                  <span className="el-toggle__label">Allow buyers to contact via WhatsApp</span>
                </label>

                {form.whatsappEnabled && (
                  <div className="el-phone-field">
                    <span className="el-phone-prefix">+250</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="794101251"
                      maxLength={9}
                      value={form.whatsapp}
                      onChange={e => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                        update({ whatsapp: digits });
                        touch('whatsapp');
                      }}
                      onBlur={() => touch('whatsapp')}
                      className={`el-phone-input${touched.whatsapp && form.whatsapp.length !== 9 ? ' el-input--error' : ''}`}
                    />
                    <span className={`el-phone-count ${form.whatsapp.length === 9 ? 'el-phone-count--ok' : touched.whatsapp ? 'el-phone-count--error' : ''}`}>
                      {form.whatsapp.length}/9
                    </span>
                  </div>
                )}
                {form.whatsappEnabled && touched.whatsapp && form.whatsapp.length !== 9 && (
                  <p className="el-hint el-hint--error">
                    {form.whatsapp.length === 0 ? 'Phone number is required.' : `Must be 9 digits — ${9 - form.whatsapp.length} more needed.`}
                  </p>
                )}
                {form.whatsappEnabled && form.whatsapp.length === 9 && (
                  <p className="el-hint el-hint--ok">✓ Number looks good (+250 {form.whatsapp})</p>
                )}
              </div>
            </div>
          )}

          {/* Photos tab */}
          {activeTab === 'photos' && (
            <div className="el-panel">
              <p className="el-photos-help">
                Up to 10 images. Removing an existing image is permanent.
              </p>
              <div className="el-photo-grid">
                {existingImages.map((img, i) => (
                  <div key={`existing-${i}`} className="el-photo-cell">
                    {i === 0 && <span className="el-photo-badge">Cover</span>}
                    <img src={img.url} alt="" className="el-photo-img" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(img, i)}
                      className="el-photo-remove"
                      disabled={deletingImgId === img.id}
                      aria-label="Remove image"
                    >
                      {deletingImgId === img.id
                        ? <Loader2 size={12} className="el-save-spinner" />
                        : <X size={12} />}
                    </button>
                  </div>
                ))}

                {newImageUrls.map((url, i) => (
                  <div key={`new-${i}`} className="el-photo-cell el-photo-cell--new">
                    <img src={url} alt="" className="el-photo-img" />
                    <button
                      type="button"
                      onClick={() => removeNewImage(i)}
                      className="el-photo-remove"
                      aria-label="Remove image"
                    >
                      <X size={12} />
                    </button>
                    <span className="el-photo-new-badge">New</span>
                  </div>
                ))}

                {totalImages < 10 && (
                  <div className="el-photo-add">
                    <button
                      type="button"
                      className="el-photo-add-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus size={20} />
                      <span>Gallery</span>
                    </button>
                    <div className="el-photo-add-divider" />
                    <button
                      type="button"
                      className="el-photo-add-btn"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <Camera size={20} />
                      <span>Camera</span>
                    </button>
                  </div>
                )}
              </div>
              <input type="file" multiple accept="image/jpeg,image/png,image/webp" ref={fileInputRef} onChange={e => handleImageAdd(e, 'gallery')} className="el-file-input" />
              <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={e => handleImageAdd(e, 'camera')} className="el-file-input" />
            </div>
          )}
        </div>

        {/* ── Sticky footer (mobile) ───────────────────────────────────── */}
        {isMobile && (
          <div className="el-footer">
            <button onClick={handleSave} disabled={saving} className="el-footer-btn">
              {saving
                ? <><Loader2 size={16} className="el-save-spinner" />Saving…</>
                : 'Save changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
