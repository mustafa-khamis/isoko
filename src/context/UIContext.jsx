import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { usersApi } from '../services/usersApi';
import { listingsApi } from '../services/listingsApi';
import { messagesApi } from '../services/messagesApi';
import { notificationsApi } from '../services/notificationsApi';
import { onForegroundMessage } from '../utils/firebase';

const UIContext = createContext(null);
const displayedForegroundNotifications = new Set();

const showForegroundNotification = async (payload) => {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const data = payload?.data || {};
  const notificationId = data.notificationId || `${data.type}:${data.title}:${data.body}`;
  if (displayedForegroundNotifications.has(notificationId)) return;
  displayedForegroundNotifications.add(notificationId);
  if (displayedForegroundNotifications.size > 100) {
    displayedForegroundNotifications.delete(displayedForegroundNotifications.values().next().value);
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(data.title || 'RwanMart', {
      body: data.body || 'You have a new RwanMart notification.',
      icon: '/favicon.ico',
      tag: notificationId,
      data: { url: data.url || '/notifications' },
    });
  } catch (error) {
    console.error('Failed to display foreground notification:', error);
  }
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

export const UIProvider = ({ children }) => {
  const isMobile = useIsMobile();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState('');
  
  const { user, isLoading } = useAuth();
  
  const [favorites, setFavorites] = useState([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const refreshUnreadRef = useRef(() => {});
  // Bumped when notifications are marked read, so an unread-count response
  // requested before that cannot bring the badge back.
  const notificationCountVersion = useRef(0);
  const markAllReadRequest = useRef(null);

  useEffect(() => {
    if (isLoading) return;

    let isMounted = true;
    let pollInterval;
    let unsubscribeForeground = () => {};

    if (user) {
      // Fetch favorites
      usersApi.getFavorites().then(res => {
        if (isMounted) setFavorites(res.data?.data?.map(f => f.id) || []);
      }).catch(err => console.error('Failed to load favorites', err));

      // Fetch unread messages and notifications
      const fetchUnread = async () => {
        const countVersion = notificationCountVersion.current;
        try {
          const [msgRes, notifRes] = await Promise.all([
            messagesApi.getUnreadCount(),
            notificationsApi.getUnreadCount()
          ]);
          if (isMounted) {
            setUnreadMessageCount(msgRes.data?.data?.count || 0);
            if (countVersion === notificationCountVersion.current && !markAllReadRequest.current) {
              setUnreadNotificationCount(notifRes.data?.data?.count || 0);
            }
          }
        } catch (err) {
          console.error('Failed to load unread counts', err);
        }
      };
      refreshUnreadRef.current = fetchUnread;

      fetchUnread();
      onForegroundMessage((payload) => {
        showForegroundNotification(payload);
        fetchUnread();
      }).then(unsubscribe => {
        if (isMounted) unsubscribeForeground = unsubscribe;
        else unsubscribe();
      });
      pollInterval = setInterval(fetchUnread, 15000); // poll every 15s
    } else {
      setFavorites([]);
      setUnreadMessageCount(0);
      setUnreadNotificationCount(0);
    }

    return () => {
      isMounted = false;
      refreshUnreadRef.current = () => {};
      if (pollInterval) clearInterval(pollInterval);
      if (unsubscribeForeground) unsubscribeForeground();
    };
  }, [user, isLoading]);

  const refreshUnreadCounts = useCallback(() => refreshUnreadRef.current(), []);

  // Clears the notification badge straight away and marks everything read on
  // the server. Resolves to false (and restores the real count) on failure.
  const markAllNotificationsRead = useCallback(() => {
    if (markAllReadRequest.current) return markAllReadRequest.current;
    notificationCountVersion.current += 1;
    setUnreadNotificationCount(0);

    const request = notificationsApi.markAllAsRead()
      .then(() => true, (err) => {
        console.error('Failed to mark notifications as read', err);
        return false;
      })
      .then((ok) => {
        markAllReadRequest.current = null;
        notificationCountVersion.current += 1;
        if (!ok) refreshUnreadRef.current();
        return ok;
      });
    markAllReadRequest.current = request;
    return request;
  }, []);

  // Lets the notifications page load after a pending "mark all read" lands.
  const whenNotificationsMarkedRead = useCallback(
    () => markAllReadRequest.current || Promise.resolve(true),
    []
  );

  const showAuth = useCallback((reason = '') => {
    setAuthReason(reason);
    setIsAuthOpen(true);
  }, []);

  const hideAuth = useCallback(() => {
    setIsAuthOpen(false);
    setAuthReason('');
  }, []);

  const toggleFavorite = useCallback(async (id) => {
    if (!user) {
      showAuth('Sign in to save this listing');
      return;
    }
    
    // Optimistic UI
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
    
    try {
      await listingsApi.toggleFavorite(id);
    } catch (err) {
      console.error('Toggle favorite failed', err);
      // Revert on error
      setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
    }
  }, [user, showAuth]);

  const isFavorite = useCallback((id) => favorites.includes(id), [favorites]);

  return (
    <UIContext.Provider value={{
      isMobile,
      isAuthOpen,
      authReason,
      showAuth,
      hideAuth,
      favorites,
      toggleFavorite,
      isFavorite,
      unreadMessageCount,
      unreadNotificationCount,
      refreshUnreadCounts,
      markAllNotificationsRead,
      whenNotificationsMarkedRead
    }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
};
