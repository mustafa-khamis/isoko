import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Check, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { usersApi } from '../../services/usersApi';
import './ProfileEdit.css';

export default function ProfileEdit() {
  const { user, updateUser, isLoading } = useAuth();
  const { isMobile } = useUI();
  const navigate = useNavigate();

  const fileInputRef = useRef(null);
  const [name, setName] = useState(user?.name || user?.full_name || '');
  const [city, setCity] = useState(user?.city || '');
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp || '');
  const [whatsappEnabled, setWhatsappEnabled] = useState(!!user?.whatsapp);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '/images/default-avatar.svg');
  const [avatarFile, setAvatarFile] = useState(null);

  if (isLoading) {
    return <div className="profile-edit-page" style={{ minHeight: '100vh' }}></div>;
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const contactPreferences = {
        whatsapp_enabled: whatsappEnabled,
        whatsapp_number: whatsapp,
      };
      await usersApi.updateProfile({ full_name: name });
      await usersApi.updateContactPreferences(contactPreferences);

      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        await usersApi.uploadAvatar(formData);
      }

      const meRes = await usersApi.getMe();
      if (meRes.data?.data) {
        updateUser(meRes.data.data);
      }

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        navigate('/profile');
      }, 1200);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-edit-page">
      <header className={`profile-edit-header ${isMobile ? 'profile-edit-header--sticky' : ''}`}>
        <div className={`profile-edit-header__inner ${isMobile ? '' : 'profile-edit-header__inner--desktop'}`}>
          <button onClick={() => navigate('/profile')} className="profile-edit-back-button" aria-label="Back to profile">
            <ArrowLeft size={20} />
          </button>
          <h1 className="profile-edit-title">Edit profile</h1>
          <button onClick={handleSave} disabled={loading} className="profile-edit-save-button">
            {saved ? <><Check size={14} />Saved!</> : 'Save'}
          </button>
        </div>
      </header>

      <div className={`profile-edit-content ${isMobile ? '' : 'profile-edit-content--desktop'}`}>
        <div className="profile-edit-avatar">
          <div className="profile-edit-avatar__frame">
            <img
              src={avatarPreview}
              alt=""
              className="profile-edit-avatar__image"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = '/images/default-avatar.svg';
              }}
            />
            <button className="profile-edit-avatar__overlay" onClick={() => fileInputRef.current?.click()} aria-label="Change profile photo">
              <Camera size={24} />
            </button>
          </div>
          <button className="profile-edit-avatar__button" onClick={() => fileInputRef.current?.click()}>Change photo</button>
          <input type="file" ref={fileInputRef} onChange={handleAvatarChange} style={{ display: 'none' }} accept="image/*" />
        </div>

        <div className="profile-edit-form">
          <Field label="Full name" value={name} onChange={setName} placeholder="Your full name" />
          <div>
            <label className="profile-edit-field__label">Email address</label>
            <div className="profile-edit-email">
              <Mail size={16} className="profile-edit-email__icon" />
              <span className="profile-edit-email__address">{user?.email}</span>
              <span className="profile-edit-email__badge">Verified</span>
            </div>
          </div>
          <Field label="City / District (optional)" value={city} onChange={setCity} placeholder="e.g. Kigali, Musanze" />

          <div>
            <label className="profile-edit-field__label profile-edit-field__label--spaced">WhatsApp contact</label>
            <button
              onClick={() => setWhatsappEnabled((value) => !value)}
              className={`profile-edit-whatsapp-toggle ${whatsappEnabled ? 'profile-edit-whatsapp-toggle--enabled' : ''}`}
              aria-pressed={whatsappEnabled}
            >
              <span className="profile-edit-whatsapp-toggle__label">Allow WhatsApp contact</span>
              <div className={`profile-edit-switch ${whatsappEnabled ? 'profile-edit-switch--enabled' : ''}`}>
                <div className={`profile-edit-switch__thumb ${whatsappEnabled ? 'profile-edit-switch__thumb--enabled' : ''}`} />
              </div>
            </button>

            {whatsappEnabled && (
              <div className="profile-edit-whatsapp-field">
                <div className="profile-edit-whatsapp-field__input">
                  <span className="profile-edit-whatsapp-field__prefix">+250</span>
                  <input
                    type="tel"
                    placeholder="788 000 000"
                    value={whatsapp}
                    onChange={(event) => setWhatsapp(event.target.value)}
                    className="profile-edit-whatsapp-field__number"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="profile-edit-field__label">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="profile-edit-field__input"
      />
    </div>
  );
}
