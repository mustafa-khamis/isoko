import axios from 'axios';

// Create a centralized Axios instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // required to send/receive HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

let accessToken = null;
let refreshPromise = null;
let authSessionVersion = 0;
const REFRESH_LOCK_NAME = 'isoko-refresh-token';
const REFRESH_CONFLICT_CODE = 'AUTH_REFRESH_TOKEN_CONCURRENT';
const AUTH_REQUESTS_WITHOUT_REFRESH_RETRY = new Set([
  '/auth/register',
  '/auth/verify-email',
  '/auth/resend-verification-code',
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/google',
]);

// In-memory token storage
export const setAccessToken = (token) => {
  accessToken = token;
};

export const startAuthSession = (token) => {
  authSessionVersion += 1;
  setAccessToken(token);
};

export const endAuthSession = () => {
  authSessionVersion += 1;
  setAccessToken(null);
};

export const getAccessToken = () => {
  return accessToken;
};

const requestAccessToken = async (retryCount = 0) => {
  try {
    const { data } = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    const token = data?.data?.accessToken;

    if (!token) {
      throw new Error('Refresh response did not include an access token');
    }

    return token;
  } catch (error) {
    const isConcurrentRotation =
      error.response?.status === 409 &&
      error.response?.data?.error_code === REFRESH_CONFLICT_CODE;

    if (isConcurrentRotation && retryCount < 2) {
      await new Promise((resolve) => setTimeout(resolve, 150 * (retryCount + 1)));
      return requestAccessToken(retryCount + 1);
    }

    throw error;
  }
};

const requestAccessTokenWithTabLock = () => {
  const locks = globalThis.navigator?.locks;

  if (locks?.request) {
    return locks.request(REFRESH_LOCK_NAME, () => requestAccessToken());
  }

  return requestAccessToken();
};

// Keep one refresh request in flight per tab, and use the browser lock manager
// to serialize refresh-cookie rotation across tabs when it is available.
export const refreshAccessToken = () => {
  if (!refreshPromise) {
    const sessionVersionAtRefreshStart = authSessionVersion;

    refreshPromise = requestAccessTokenWithTabLock()
      .then((token) => {
        // An explicit login/logout won the race while this request was pending.
        if (authSessionVersion === sessionVersionAtRefreshStart) {
          setAccessToken(token);
        }
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

apiClient.interceptors.request.use(
  (config) => {
    config._accessTokenAtRequest = accessToken;
    config._authSessionVersion = authSessionVersion;

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url?.split('?')[0];

    // If 401 and not already retrying
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !AUTH_REQUESTS_WITHOUT_REFRESH_RETRY.has(requestUrl)
    ) {
      // Never replay a request after an explicit logout or account change.
      if (originalRequest._authSessionVersion !== authSessionVersion) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      // Another request may already have refreshed this same login session.
      if (
        originalRequest._accessTokenAtRequest !== accessToken &&
        accessToken
      ) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      }

      const requestSessionVersion = authSessionVersion;

      try {
        const token = await refreshAccessToken();

        if (requestSessionVersion !== authSessionVersion) {
          return Promise.reject(error);
        }

        // Retry original request
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (err) {
        if (requestSessionVersion === authSessionVersion) {
          // Refresh failed, user is actually logged out
          endAuthSession();

          // Dispatch custom event to tell app to log out / redirect
          window.dispatchEvent(new Event('auth:unauthorized'));
        }
        
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
