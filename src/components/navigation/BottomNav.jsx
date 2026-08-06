import { Home, LayoutGrid, Plus, MessageCircle, User as UserIcon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import './BottomNav.css';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showAuth, unreadMessageCount } = useUI();

  const handleSell = () => {
    if (!user) { showAuth('Create a free account to start listing your items.'); return; }
    navigate('/create-listing');
  };

  const handleMessages = () => {
    if (!user) { showAuth('Sign in to send and receive messages.'); return; }
    navigate('/messages');
  };

  const handleProfile = () => {
    if (!user) { showAuth('Sign in to view and manage your profile.'); return; }
    navigate('/profile');
  };

  const isActive = (paths) => paths.some(p => location.pathname.startsWith(p) && (p !== '/' || location.pathname === '/'));

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
        <NavButton
          icon={<Home size={20} />}
          label="Home"
          active={isActive(['/']) && location.pathname === '/'}
          onClick={() => navigate('/')}
        />

        <NavButton
          icon={<LayoutGrid size={20} />}
          label="Browse"
          active={isActive(['/browse'])}
          onClick={() => navigate('/browse')}
        />

        <div className="bottom-nav-sell-wrapper">
          <button onClick={handleSell} className="bottom-nav-sell-btn" aria-label="Create listing">
            <Plus size={24} strokeWidth={2.5} />
          </button>
        </div>

        <NavButton
          icon={<MessageCircle size={20} />}
          label="Messages"
          active={isActive(['/messages'])}
          onClick={handleMessages}
          badge={unreadMessageCount > 0 ? unreadMessageCount : null}
        />

        <NavButton
          icon={user ? (
            <img 
              src={user.profile?.avatar_url || '/images/default-avatar.svg'} 
              alt="" 
              className="bottom-nav-avatar"
              onError={(e) => { e.target.onerror = null; e.target.src = '/images/default-avatar.svg'; }}
            />
          ) : (
            <UserIcon size={20} />
          )}
          label="Profile"
          active={isActive(['/profile', '/favorites', '/notifications', '/my-listings'])}
          onClick={handleProfile}
        />
      </div>
    </nav>
  );
}

function NavButton({ icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} className={`bottom-nav-btn ${active ? 'bottom-nav-btn--active' : ''}`}>
      <div className={`bottom-nav-btn__icon ${active ? 'bottom-nav-btn__icon--active' : ''}`}>
        {icon}
        {badge && badge > 0 && (
          <span className="bottom-nav-badge">{badge}</span>
        )}
      </div>
      <span className="bottom-nav-label">
        {label}
      </span>
    </button>
  );
}
