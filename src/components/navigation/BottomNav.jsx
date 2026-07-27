import { Home, LayoutGrid, Plus, MessageCircle, User as UserIcon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showAuth } = useUI();

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
          <button onClick={handleSell} className="bottom-nav-sell-btn">
            <Plus size={24} strokeWidth={2.5} />
          </button>
        </div>

        <NavButton
          icon={<MessageCircle size={20} />}
          label="Messages"
          active={isActive(['/messages'])}
          onClick={handleMessages}
          badge={1} // mock badge
        />

        <NavButton
          icon={user ? (
            <img 
              src={user.profile?.avatar_url || '/images/default-avatar.svg'} 
              alt="" 
              style={{width:'24px', height:'24px', borderRadius:'50%', objectFit:'cover'}} 
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
    <button onClick={onClick} className={`bottom-nav-btn ${active ? 'active' : ''}`}>
      <div style={{ position: 'relative', color: active ? 'var(--color-brand-600)' : 'var(--color-ink-400)' }}>
        {icon}
        {badge && badge > 0 && (
          <span className="badge">{badge}</span>
        )}
      </div>
      <span className="bottom-nav-label" style={{ color: active ? 'var(--color-brand-600)' : 'var(--color-ink-400)' }}>
        {label}
      </span>
    </button>
  );
}
