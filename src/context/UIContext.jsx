import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { usersApi } from '../services/usersApi';
import { listingsApi } from '../services/listingsApi';

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
  
  const { user } = useAuth();
  
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (user) {
      usersApi.getFavorites().then(res => {
        setFavorites(res.data?.data?.map(f => f.id) || []);
      }).catch(err => console.error('Failed to load favorites', err));
    } else {
      setFavorites([]);
    }
  }, [user]);

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
      isFavorite
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
