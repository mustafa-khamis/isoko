import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, MessageCircle, CheckCircle, XCircle, Check, Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { notificationsApi } from '../../services/notificationsApi';
import { timeAgo } from '../../utils/formatters';
import './Notifications.css';

export default function Notifications() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const { isMobile, showAuth } = useUI();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }
    const fetchNotifs = async () => {
      try {
        const res = await notificationsApi.getNotifications();
        if (res.data && res.data.data) {
          setNotifications(res.data.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifs();
  }, [user]);

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(ns => ns.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const markRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotifClick = (notif) => {
    if (!notif.is_read) {
      markRead(notif.id);
    }
    // For follow notifications, navigate to the follower's profile
    if (notif.type === 'user_followed' && notif.data && notif.data.follower_id) {
      navigate(`/sellers/${notif.data.follower_id}`);
    }
  };

  if (!user) {
    return (
      <div className="notifications-auth-state">
        <div className="notifications-auth-icon">
          <Bell size={40} />
        </div>
        <h3 className="notifications-state-title">Sign in to see notifications</h3>
        <p className="notifications-state-copy">We'll let you know when your listing is approved or when someone messages you.</p>
        <button onClick={() => showAuth()} className="notifications-state-button">Sign In</button>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="notifications-page">
      {/* Header */}
      <div className={`notifications-header ${isMobile ? 'notifications-header--sticky' : ''}`}>
        <div className="notifications-header-inner">
          {isMobile && (
            <button onClick={() => navigate(-1)} className="notifications-back-button">
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="notifications-title">Notifications</h1>
          {unreadCount > 0 && (
            <span className="notifications-count-badge">{unreadCount}</span>
          )}
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="notifications-mark-all-button">
              <Check size={14} />Mark all read
            </button>
          )}
        </div>
      </div>

      <div className={`notifications-content ${isMobile ? 'notifications-content--mobile' : ''}`}>
        {loading ? (
          <div className="notifications-loading">Loading...</div>
        ) : notifications.length === 0 ? (
          <EmptyNotifications />
        ) : (
          <div className="notifications-list">
            {notifications.map(notif => (
              <NotificationRow key={notif.id} notif={notif} onClick={() => handleNotifClick(notif)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationRow({ notif, onClick }) {
  const icons = {
    'message':          <MessageCircle size={20} className="notifications-icon notifications-icon--brand" />,
    'listing-approved': <CheckCircle size={20} className="notifications-icon notifications-icon--brand" />,
    'listing-rejected': <XCircle size={20} className="notifications-icon notifications-icon--danger" />,
    'user_followed':    <Heart size={20} className="notifications-icon notifications-icon--love" />,
    'broadcast':        <Bell size={20} className="notifications-icon notifications-icon--brand" />,
  };

  const bgColors = {
    'message':          'notifications-row-icon--brand',
    'listing-approved': 'notifications-row-icon--brand',
    'listing-rejected': 'notifications-row-icon--danger',
    'user_followed':    'notifications-row-icon--love',
    'broadcast':        'notifications-row-icon--brand',
  };

  const icon = icons[notif.type] || <Bell size={20} className="notifications-icon notifications-icon--muted" />;
  const bg = bgColors[notif.type] || 'notifications-row-icon--muted';

  return (
    <button
      onClick={onClick}
      className={`notifications-row ${
        !notif.is_read
          ? 'notifications-row--unread'
          : 'notifications-row--read'
      }`}
    >
      <div className={`notifications-row-icon ${bg}`}>
        {icon}
      </div>
      <div className="notifications-row-content">
        <p className={`notifications-row-title ${!notif.is_read ? 'notifications-row-title--unread' : ''}`}>
          {notif.title}
        </p>
        <p className="notifications-row-message">{notif.body || notif.message}</p>
        <p className="notifications-row-time">{timeAgo(notif.created_at)}</p>
      </div>
      {!notif.is_read && (
        <div className="notifications-unread-dot" />
      )}
    </button>
  );
}

function EmptyNotifications() {
  return (
    <div className="notifications-empty-state">
      <div className="notifications-empty-icon">
        <Bell size={40} />
      </div>
      <h3 className="notifications-state-title">All caught up!</h3>
      <p className="notifications-state-copy">You'll be notified when your listings are approved or when someone sends you a message.</p>
    </div>
  );
}
