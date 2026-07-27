import { createContext, useContext, useState, useEffect } from 'react';
import apiClient, {
  endAuthSession,
  refreshAccessToken,
  setAccessToken,
  startAuthSession,
} from '../services/apiClient';

const AuthContext = createContext(null);
let sessionRestorePromise = null;

const restoreSession = () => {
  if (!sessionRestorePromise) {
    sessionRestorePromise = (async () => {
      await refreshAccessToken();
      const userRes = await apiClient.get('/users/me');
      return userRes.data.data;
    })().finally(() => {
      sessionRestorePromise = null;
    });
  }

  return sessionRestorePromise;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initial load: try to refresh session
  useEffect(() => {
    let isActive = true;

    const initAuth = async () => {
      try {
        const restoredUser = await restoreSession();
        if (isActive) setUser(restoredUser);
      } catch {
        setAccessToken(null);
        if (isActive) setUser(null);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      isActive = false;
    };
  }, []);

  // Listen to forced unauth from axios interceptor
  useEffect(() => {
    const handleUnauth = () => {
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauth);
    return () => window.removeEventListener('auth:unauthorized', handleUnauth);
  }, []);

  const login = (userData, token) => {
    startAuthSession(token);
    setUser(userData);
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    endAuthSession();
    setUser(null);

    try {
      await apiClient.post('/auth/logout', {});
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
