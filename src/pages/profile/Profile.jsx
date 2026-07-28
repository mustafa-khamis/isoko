import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Calendar,
  Check,
  ChevronRight,
  Crown,
  Heart,
  LogOut,
  Mail,
  Megaphone,
  Package,
  Pencil,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import './Profile.css';

export default function Profile() {
  const { user, logout } = useAuth();
  const { isMobile, showAuth } = useUI();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className={`profile-auth-state ${isMobile ? 'profile-auth-state--mobile' : 'profile-auth-state--desktop'}`}>
        <div className="profile-auth-state__icon">
          <Shield size={40} />
        </div>
        <h3 className="profile-auth-state__title">Sign in to view your profile</h3>
        <p className="profile-auth-state__copy">Manage your listings, messages, and account settings.</p>
        <button onClick={() => showAuth()} className="profile-auth-state__button">Sign In</button>
      </div>
    );
  }

  const planLabel = user.role === 'buyer' ? 'Free' : user.role === 'seller' ? 'Trader' : 'Admin';
  const menuItems = [
    { icon: <Package size={16} />, label: 'My Listings', onClick: () => navigate('/my-listings') },
    { icon: <Heart size={16} />, label: 'Saved Listings', onClick: () => navigate('/favorites') },
    { icon: <Bell size={16} />, label: 'Notifications', onClick: () => navigate('/notifications') },
    { icon: <Crown size={16} />, label: 'Trader Plans', onClick: () => navigate('/trader-plans'), premium: true },
    ...(user.role !== 'buyer'
      ? [{ icon: <Megaphone size={16} />, label: 'Sponsored Ads', onClick: () => navigate('/sponsored-ad') }]
      : []),
  ];

  return (
    <div className="profile-page">
      {isMobile && (
        <header className="profile-header">
          <div className="profile-header__inner">
            <h1 className="profile-header__title">Profile</h1>
            <button onClick={() => navigate('/profile/edit')} className="profile-header__edit-button">
              <Pencil size={14} />Edit
            </button>
          </div>
        </header>
      )}

      <div className={`profile-content ${isMobile ? 'profile-content--mobile' : 'profile-content--desktop'}`}>
        <section className="profile-card">
          <div className="profile-card__cover" />
          <div className="profile-card__body">
            <div className="profile-card__avatar-row">
              <div className="profile-avatar">
                <img
                  src={user.avatar_url || '/images/default-avatar.svg'}
                  alt={user.name}
                  className="profile-avatar__image"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = '/images/default-avatar.svg';
                  }}
                />
              </div>
              {!isMobile && (
                <button onClick={() => navigate('/profile/edit')} className="profile-card__edit-button">
                  <Pencil size={14} />Edit profile
                </button>
              )}
            </div>

            <div className="profile-name-row">
              <h2 className="profile-name">{user.name}</h2>
              {user.role !== 'buyer' && <Crown size={16} className="profile-icon--premium" />}
            </div>

            <div className="profile-metadata">
              <span className="profile-metadata__item"><Mail size={12} />{user.email}</span>
              <span className="profile-metadata__item">
                <Calendar size={12} />Joined {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>

            <div className="profile-status-row">
              <span className={`profile-plan-badge ${user.role === 'buyer' ? 'profile-plan-badge--free' : 'profile-plan-badge--trader'}`}>
                {planLabel}
              </span>
              <span className="profile-verification">
                <Check size={12} />Email verified
              </span>
            </div>
          </div>
        </section>

        {user.role === 'buyer' && (
          <button onClick={() => navigate('/trader-plans')} className="profile-upgrade-card">
            <Crown size={24} className="profile-upgrade-card__icon" />
            <div>
              <p className="profile-upgrade-card__title">Become a Trader</p>
              <p className="profile-upgrade-card__copy">Post up to 20 listings &middot; Sponsored ads &middot; Free for now</p>
            </div>
            <ChevronRight size={20} className="profile-upgrade-card__chevron" />
          </button>
        )}

        <nav className="profile-menu" aria-label="Profile">
          {menuItems.map((item) => (
            <button key={item.label} onClick={item.onClick} className="profile-menu__item">
              <div className={`profile-menu__icon ${item.premium ? 'profile-menu__icon--premium' : ''}`}>{item.icon}</div>
              <span className="profile-menu__label">{item.label}</span>
              <ChevronRight size={16} className="profile-menu__chevron" />
            </button>
          ))}
        </nav>

        <button onClick={logout} className="profile-logout-button">
          <LogOut size={16} />Sign out
        </button>
      </div>
    </div>
  );
}
