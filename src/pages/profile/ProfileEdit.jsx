import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Check, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { usersApi } from '../../services/usersApi';

export default function ProfileEdit() {
  const { user, updateUser } = useAuth();
  const { isMobile } = useUI();
  const navigate = useNavigate();
  
  const [name, setName] = useState(user?.name || '');
  const [city, setCity] = useState(user?.city || '');
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp || '');
  const [whatsappEnabled, setWhatsappEnabled] = useState(!!user?.whatsapp);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        name,
        contact_preferences: {
          whatsapp_enabled: whatsappEnabled,
          whatsapp_number: whatsapp,
        }
      };
      await usersApi.updateProfile({ name });
      await usersApi.updateContactPreferences(payload.contact_preferences);
      
      // refresh user
      const meRes = await usersApi.getMe();
      if (meRes.data && meRes.data.data) {
        updateUser(meRes.data.data);
      }
      
      setSaved(true);
      setTimeout(() => { setSaved(false); navigate('/profile'); }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-ink-50 min-h-full animate-fade-in">
      <div className={`bg-white border-b border-ink-100 ${isMobile ? 'sticky top-0 z-30' : ''}`}>
        <div className={`flex items-center gap-3 px-4 py-4 ${isMobile ? '' : 'max-w-screen-xl mx-auto lg:px-8 max-w-3xl'}`}>
          <button onClick={() => navigate('/profile')} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-ink-100">
            <ArrowLeft size={20} className="text-ink-600" />
          </button>
          <h1 className="text-lg font-bold text-ink-950">Edit profile</h1>
          <button onClick={handleSave} disabled={loading} className="ml-auto bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors flex items-center gap-1 disabled:opacity-50">
            {saved ? <><Check size={14} />Saved!</> : 'Save'}
          </button>
        </div>
      </div>

      <div className={`px-4 pt-5 ${isMobile ? '' : 'max-w-screen-xl mx-auto lg:px-8 max-w-3xl'}`}>
        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-sm">
            <img 
              src={user?.avatar_url || '/images/default-avatar.svg'} 
              alt="" 
              className="w-full h-full object-cover" 
              onError={(e) => { e.target.onerror = null; e.target.src = '/images/default-avatar.svg'; }}
            />
            <button className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white" />
            </button>
          </div>
          <button className="mt-2 text-xs text-brand-600 font-semibold">Change photo</button>
        </div>

        <div className="flex flex-col gap-4">
          <Field label="Full name" value={name} onChange={setName} placeholder="Your full name" />
          <div>
            <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Email address</label>
            <div className="flex items-center gap-2 border border-ink-200 rounded-xl px-4 py-3 bg-ink-50">
              <Mail size={16} className="text-ink-400" />
              <span className="text-sm text-ink-500">{user?.email}</span>
              <span className="ml-auto text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-medium">Verified</span>
            </div>
          </div>
          <Field label="City / District (optional)" value={city} onChange={setCity} placeholder="e.g. Kigali, Musanze" />

          <div>
            <label className="text-xs font-semibold text-ink-600 mb-2 block">WhatsApp contact</label>
            <button
              onClick={() => setWhatsappEnabled(v => !v)}
              className={`w-full flex items-center justify-between px-4 py-3 border rounded-xl transition-all ${whatsappEnabled ? 'border-brand-400 bg-brand-50' : 'border-ink-200'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink-800">Allow WhatsApp contact</span>
              </div>
              <div className={`w-10 h-6 rounded-full transition-colors relative ${whatsappEnabled ? 'bg-brand-500' : 'bg-ink-300'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${whatsappEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </button>
            {whatsappEnabled && (
              <div className="mt-2 animate-fade-in">
                <div className="flex items-center gap-2 border border-ink-200 rounded-xl px-4 py-3 focus-within:border-brand-500 transition-all">
                  <span className="text-sm text-ink-500">+250</span>
                  <input type="tel" placeholder="788 000 000" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="flex-1 text-sm text-ink-800 outline-none bg-transparent" />
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
      <label className="text-xs font-semibold text-ink-600 mb-1.5 block">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-ink-200 rounded-xl px-4 py-3 text-sm text-ink-800 placeholder-ink-300 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
      />
    </div>
  );
}
