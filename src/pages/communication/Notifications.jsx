import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, MessageCircle, CheckCircle, XCircle, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { notificationsApi } from '../../services/notificationsApi';
import { timeAgo } from '../../utils/formatters';

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMobile, showAuth } = useUI();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    if (notif.action_url) {
      navigate(notif.action_url);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-full px-6">
        <div className="w-20 h-20 bg-ink-100 rounded-3xl flex items-center justify-center mb-4">
          <Bell size={40} className="text-ink-300" />
        </div>
        <h3 className="text-lg font-bold text-ink-800 mb-2">Sign in to see notifications</h3>
        <p className="text-sm text-ink-500 mb-6">We'll let you know when your listing is approved or when someone messages you.</p>
        <button onClick={() => showAuth()} className="btn btn-primary px-6">Sign In</button>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="bg-ink-50 min-h-full animate-fade-in">
      {/* Header */}
      <div className={`bg-white border-b border-ink-100 ${isMobile ? 'sticky top-0 z-30' : ''}`}>
        <div className={`flex items-center gap-3 px-4 py-4 ${isMobile ? '' : 'max-w-screen-xl mx-auto lg:px-8 max-w-2xl'}`}>
          {isMobile && (
            <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-ink-100">
              <ArrowLeft size={20} className="text-ink-600" />
            </button>
          )}
          <h1 className="text-lg font-bold text-ink-950">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-brand-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
          )}
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="ml-auto text-xs text-brand-600 font-semibold flex items-center gap-1">
              <Check size={14} />Mark all read
            </button>
          )}
        </div>
      </div>

      <div className={`${isMobile ? 'px-3 pt-4' : 'max-w-screen-xl mx-auto px-4 lg:px-8 pt-6 max-w-2xl'}`}>
        {loading ? (
          <div className="text-center py-10">Loading...</div>
        ) : notifications.length === 0 ? (
          <EmptyNotifications />
        ) : (
          <div className="flex flex-col gap-2">
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
    'message':          <MessageCircle size={20} className="text-brand-600" />,
    'listing-approved': <CheckCircle size={20} className="text-brand-600" />,
    'listing-rejected': <XCircle size={20} className="text-red-500" />,
  };

  const bgColors = {
    'message':          'bg-brand-50',
    'listing-approved': 'bg-brand-50',
    'listing-rejected': 'bg-red-50',
  };

  const icon = icons[notif.type] || <Bell size={20} className="text-ink-500" />;
  const bg = bgColors[notif.type] || 'bg-ink-100';

  return (
    <button
      onClick={onClick}
      className={`w-full flex gap-3 p-3.5 rounded-xl border text-left transition-all ${
        !notif.is_read
          ? 'bg-white border-brand-200 shadow-sm shadow-brand-50'
          : 'bg-white border-ink-200 hover:border-ink-300'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${!notif.is_read ? 'font-semibold text-ink-900' : 'font-medium text-ink-800'}`}>
          {notif.title}
        </p>
        <p className="text-xs text-ink-500 mt-0.5 line-clamp-2 leading-relaxed">{notif.message}</p>
        <p className="text-[10px] text-ink-400 mt-1">{timeAgo(notif.created_at)}</p>
      </div>
      {!notif.is_read && (
        <div className="w-2 h-2 bg-brand-500 rounded-full shrink-0 mt-2" />
      )}
    </button>
  );
}

function EmptyNotifications() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="w-20 h-20 bg-ink-100 rounded-3xl flex items-center justify-center mb-4">
        <Bell size={40} className="text-ink-300" />
      </div>
      <h3 className="text-lg font-bold text-ink-800 mb-2">All caught up!</h3>
      <p className="text-sm text-ink-500 max-w-xs">You'll be notified when your listings are approved or when someone sends you a message.</p>
    </div>
  );
}
