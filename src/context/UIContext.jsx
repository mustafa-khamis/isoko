import { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
  
  // Fake favorites for now, in a real app this would go through an API
  const [favorites, setFavorites] = useState([]);

  const showAuth = useCallback((reason = '') => {
    setAuthReason(reason);
    setIsAuthOpen(true);
  }, []);

  const hideAuth = useCallback(() => {
    setIsAuthOpen(false);
    setAuthReason('');
  }, []);

  const toggleFavorite = useCallback((id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  }, []);

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
