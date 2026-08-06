import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { usersApi } from '../services/usersApi';
import { listingsApi } from '../services/listingsApi';
import { messagesApi } from '../services/messagesApi';
import { notificationsApi } from '../services/notificationsApi';

const UIContext = createContext(null);

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

  useEffect(() => {
    if (isLoading) return;

    let isMounted = true;
    let pollInterval;

    if (user) {
      // Fetch favorites
      usersApi.getFavorites().then(res => {
        if (isMounted) setFavorites(res.data?.data?.map(f => f.id) || []);
      }).catch(err => console.error('Failed to load favorites', err));

      // Fetch unread messages and notifications
      const fetchUnread = async () => {
        try {
          const [msgRes, notifRes] = await Promise.all([
            messagesApi.getUnreadCount(),
            notificationsApi.getUnreadCount()
          ]);
          if (isMounted) {
            setUnreadMessageCount(msgRes.data?.data?.count || 0);
            setUnreadNotificationCount(notifRes.data?.data?.count || 0);
          }
        } catch (err) {
          console.error('Failed to load unread counts', err);
        }
      };
      
      fetchUnread();
      pollInterval = setInterval(fetchUnread, 15000); // poll every 15s
    } else {
      setFavorites([]);
      setUnreadMessageCount(0);
      setUnreadNotificationCount(0);
    }

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [user, isLoading]);

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
      unreadNotificationCount
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
