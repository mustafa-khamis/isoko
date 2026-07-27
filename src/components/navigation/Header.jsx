import { useState } from 'react';
import { Search, MapPin, Bell, Heart, MessageCircle, User, ShoppingBag, ChevronDown, X, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
// We will replace categories hardcode with an API call later if needed, but for layout we can mock or keep static constants.
// For MVP, since we don't have the constants file yet, we just stub a few categories.
const CATEGORIES = [
  { id: 'electronics', label: 'Electronics' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'property', label: 'Property' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'agriculture', label: 'Agriculture' },
];

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showAuth } = useUI();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const handleSearch = () => {
    if (searchQuery.trim()) navigate(`/browse?search=${searchQuery.trim()}`);
  };

  const handleSell = () => {
    if (!user) { showAuth('Sign in to start selling on Isoko.'); return; }
    navigate('/create-listing');
  };

  const handleFavorites = () => {
    if (!user) { showAuth('Sign in to save your favourite listings.'); return; }
    navigate('/favorites');
  };

  const handleMessages = () => {
    if (!user) { showAuth('Sign in to send and receive messages.'); return; }
    navigate('/messages');
  };

  const handleNotifications = () => {
    if (!user) { showAuth('Sign in to see your notifications.'); return; }
    navigate('/notifications');
  };

  const isHome = location.pathname === '/';
  const currentCategory = new URLSearchParams(location.search).get('category');

  return (
    <header className="header">
      <div className="header-main">
        <button onClick={() => navigate('/')} className="header-logo-btn">
          <div className="header-logo-icon-bg">
            <ShoppingBag size={16} strokeWidth={2.5} color="white" />
          </div>
          <span className="header-logo-text">isoko</span>
        </button>

        <div className="header-search-container">
          <div className={`header-search-box ${searchFocused ? 'focused' : ''}`}>
            <Search size={16} color="var(--color-ink-400)" />
            <input
              type="text"
              placeholder="Search listings…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="header-search-input"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{color: 'var(--color-ink-400)'}}>
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => navigate('/browse')}
          className="header-location-btn hidden-mobile flex"
        >
          <MapPin size={16} color="var(--color-brand-600)" />
          <span>Kigali</span>
          <ChevronDown size={14} color="var(--color-ink-400)" />
        </button>

        <div className="header-actions">
          <button onClick={handleFavorites} className="header-icon-btn">
            <Heart size={20} />
          </button>
          <button onClick={handleMessages} className="header-icon-btn">
            <MessageCircle size={20} />
          </button>
          <button onClick={handleNotifications} className="header-icon-btn">
            <Bell size={20} />
            <span className="notification-dot" />
          </button>

          {user ? (
            <button onClick={() => navigate('/profile')} className="header-avatar-btn" style={{overflow: 'hidden'}}>
              {user.profile?.avatar_url ? (
                <img 
                  src={user.profile.avatar_url} 
                  alt={user.full_name || 'User'} 
                  style={{width:'100%', height:'100%', objectFit:'cover'}} 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div style={{display: user.profile?.avatar_url ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-ink-200)', color: 'var(--color-ink-600)'}}>
                <User size={16} />
              </div>
            </button>
          ) : (
            <button onClick={() => showAuth()} className="header-icon-btn">
              <User size={20} />
            </button>
          )}
        </div>

        <button onClick={handleSell} className="header-sell-btn">
          <Plus size={16} />
          Sell
        </button>
      </div>

      <div className="header-categories">
        <div className="header-categories-inner">
          <div className="header-categories-scroll no-scrollbar">
            <CategoryTab
              label="All"
              active={isHome || (location.pathname === '/browse' && !currentCategory)}
              onClick={() => navigate('/')}
            />
            {CATEGORIES.map(cat => (
              <CategoryTab
                key={cat.id}
                label={cat.label}
                active={currentCategory === cat.id}
                onClick={() => navigate(`/browse?category=${cat.id}`)}
              />
            ))}
            <CategoryTab
              label="More"
              active={false}
              onClick={() => navigate('/browse')}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function CategoryTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`category-tab ${active ? 'active' : ''}`}
    >
      {label}
    </button>
  );
}
