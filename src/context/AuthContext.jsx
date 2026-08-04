import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient, {
  endAuthSession,
  refreshAccessToken,
  setAccessToken,
  startAuthSession,
} from '../services/apiClient';
import * as authStorage from '../auth/authStorage';

const AuthContext = createContext(null);
let sessionRestorePromise = null;

const TERMINAL_UNAUTH_CODES = new Set([
  'REFRESH_TOKEN_INVALID',
  'REFRESH_TOKEN_EXPIRED',
  'SESSION_REVOKED',
  'UNAUTHORIZED',
  'AUTH_REFRESH_TOKEN_INVALID',
  'AUTH_REFRESH_TOKEN_EXPIRED',
  'AUTH_REFRESH_TOKEN_REUSED',
  'AUTH_TOKEN_EXPIRED',
  'AUTH_TOKEN_INVALID',
  'AUTH_UNAUTHORIZED',
  'AUTH_USER_NOT_FOUND',
  'AUTH_ACCOUNT_SUSPENDED',
]);

const restoreSession = () => {
  if (!sessionRestorePromise) {
    sessionRestorePromise = (async () => {
      await refreshAccessToken();
      const userRes = await apiClient.get('/users/me');
      return userRes.data?.data || userRes.data;
    })().finally(() => {
      sessionRestorePromise = null;
    });
  }

  return sessionRestorePromise;
};

export const AuthProvider = ({ children }) => {
  // Synchronous initialization from localStorage
  const [user, setUser] = useState(() => authStorage.getCachedUser());
  const [isLoading, setIsLoading] = useState(() => !authStorage.getCachedUser());
  const [sessionStatus, setSessionStatus] = useState(() => (authStorage.getCachedUser() ? 'verifying' : 'idle'));
  const [serverStatus, setServerStatus] = useState('online');

  const applyAuthenticatedSession = useCallback(({ accessToken, user: userData }) => {
    if (!userData) return;
    const normalized = authStorage.normalizeMinimalUser(userData);
    if (accessToken) {
      startAuthSession(accessToken);
    }
    authStorage.setCachedUser(normalized);
    setUser(normalized);
    setSessionStatus('valid');
    setServerStatus('online');
    setIsLoading(false);
  }, []);

  const clearLocalAuth = useCallback(() => {
    endAuthSession();
    setAccessToken(null);
    authStorage.clearAuthCache();
    setUser(null);
    setSessionStatus('unauthenticated');
    setIsLoading(false);
  }, []);

  // Background session verification
  useEffect(() => {
    let isActive = true;

    const verifySessionInBackground = async () => {
      try {
        const restoredUser = await restoreSession();
        if (isActive) {
          const normalized = authStorage.normalizeMinimalUser(restoredUser);
          authStorage.setCachedUser(normalized);
          setUser(normalized);
          setSessionStatus('valid');
          setServerStatus('online');
        }
      } catch (error) {
        if (!isActive) return;

        const status = error.response?.status;
        const code = error.response?.data?.error_code || error.response?.data?.errorCode || error.response?.data?.code || error.response?.data?.error?.code;

        const isConfirmedInvalid = status === 401 || (code && TERMINAL_UNAUTH_CODES.has(code));

        if (isConfirmedInvalid) {
          clearLocalAuth();
        } else {
          // Network drop, timeout, 502/503/504, 500 -> KEEP cached user UI visible!
          setSessionStatus('reconnecting');
          if (!status || [502, 503, 504].includes(status)) {
            setServerStatus('waking');
          }
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    verifySessionInBackground();

    return () => {
      isActive = false;
    };
  }, [clearLocalAuth]);

  // Listen to forced unauth from axios interceptor
  useEffect(() => {
    const handleUnauth = () => {
      clearLocalAuth();
    };
    window.addEventListener('auth:unauthorized', handleUnauth);
    return () => window.removeEventListener('auth:unauthorized', handleUnauth);
  }, [clearLocalAuth]);

  // Cross-tab synchronization via localStorage events
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === authStorage.AUTH_USER_KEY || e.key === authStorage.AUTH_CACHE_VERSION_KEY) {
        const updatedUser = authStorage.getCachedUser();
        setUser(updatedUser);
        if (!updatedUser) {
          setSessionStatus('unauthenticated');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = (userData, token) => {
    applyAuthenticatedSession({ accessToken: token, user: userData });
  };

  const updateUser = (userData) => {
    const updated = authStorage.updateCachedUser(userData);
    if (updated) {
      setUser(updated);
    } else {
      setUser((prev) => (prev ? { ...prev, ...userData } : null));
    }
  };

  const logout = async () => {
    clearLocalAuth();

    try {
      await apiClient.post('/auth/logout', {});
    } catch (err) {
      console.error('Logout request failed on server', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        sessionStatus,
        serverStatus,
        login,
        logout,
        updateUser,
        applyAuthenticatedSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
