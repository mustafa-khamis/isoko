import axios from 'axios';
import * as authStorage from '../auth/authStorage';

// Create a centralized Axios instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // required to send/receive HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

let accessToken = authStorage.getAccessToken();
let refreshPromise = null;
let authSessionVersion = 0;
const REFRESH_LOCK_NAME = 'isoko-refresh-token';
const REFRESH_CONFLICT_CODE = 'AUTH_REFRESH_TOKEN_CONCURRENT';
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

const isFormData = (value) =>
  typeof FormData !== 'undefined' && value instanceof FormData;

const getHeaderValue = (headers, name) => {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') return headers.get(name);
  const key = Object.keys(headers).find((header) => header.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
};

const setHeaderValue = (headers, name, value) => {
  if (typeof headers.set === 'function') headers.set(name, value);
  else headers[name] = value;
};

const deleteHeaderValue = (headers, name) => {
  if (typeof headers.delete === 'function') headers.delete(name);
  else {
    const key = Object.keys(headers).find((header) => header.toLowerCase() === name.toLowerCase());
    if (key) delete headers[key];
  }
};

const restoreRetryPayload = (config) => {
  if (!config) return config;

  if (config._originalData !== undefined) {
    config.data = config._originalData;
  } else {
    const contentType = getHeaderValue(config.headers, 'Content-Type') || '';
    if (typeof config.data === 'string' && contentType.toLowerCase().includes('application/json')) {
      try {
        config.data = JSON.parse(config.data);
      } catch {
        // Keep non-JSON strings as-is.
      }
    }
  }

  if (isFormData(config.data)) {
    deleteHeaderValue(config.headers, 'Content-Type');
  }

  return config;
};

// Token storage
export const setAccessToken = (token) => {
  accessToken = token;
  authStorage.setAccessToken(token);
};

export const startAuthSession = (token) => {
  authSessionVersion += 1;
  setAccessToken(token);
};

export const endAuthSession = () => {
  authSessionVersion += 1;
  accessToken = null;
  authStorage.clearAuthCache();
};

export const getAccessToken = () => {
  if (!accessToken) {
    accessToken = authStorage.getAccessToken();
  }
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
    config.headers = config.headers || {};
    config._originalData ??= config.data;
    config._accessTokenAtRequest = accessToken;
    config._authSessionVersion = authSessionVersion;

    if (isFormData(config.data)) {
      deleteHeaderValue(config.headers, 'Content-Type');
    }

    if (accessToken) {
      setHeaderValue(config.headers, 'Authorization', `Bearer ${accessToken}`);
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
        setHeaderValue(originalRequest.headers, 'Authorization', `Bearer ${accessToken}`);
        return apiClient(restoreRetryPayload(originalRequest));
      }

      const requestSessionVersion = authSessionVersion;

      try {
        const token = await refreshAccessToken();

        if (requestSessionVersion !== authSessionVersion) {
          return Promise.reject(error);
        }

        // Retry original request
        originalRequest.headers = originalRequest.headers || {};
        setHeaderValue(originalRequest.headers, 'Authorization', `Bearer ${token}`);
        return apiClient(restoreRetryPayload(originalRequest));
      } catch (err) {
        if (requestSessionVersion === authSessionVersion) {
          const status = err.response?.status;
          const code = err.response?.data?.error_code || err.response?.data?.errorCode || err.response?.data?.code || err.response?.data?.error?.code;

          const isConfirmedInvalid = status === 401 || (code && TERMINAL_UNAUTH_CODES.has(code));

          if (isConfirmedInvalid) {
            endAuthSession();
            window.dispatchEvent(new Event('auth:unauthorized'));
          }
        }
        
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export const normalizeApiError = (error) => {
  if (!error.response) {
    return {
      status: 0,
      code: 'SERVICE_UNAVAILABLE',
      message: 'The RwanMart API is unavailable. Check the backend and try again.',
      fieldErrors: [],
    };
  }

  const data = error.response.data || {};
  const rawErrors = Array.isArray(data.errors)
    ? data.errors
    : Array.isArray(data.error?.errors)
      ? data.error.errors
      : [];

  return {
    status: error.response.status,
    code: data.errorCode || data.error_code || data.code || data.error?.code || 'REQUEST_FAILED',
    message:
      data.message ||
      data.error?.message ||
      (error.response.status === 422 ? 'The submitted data is invalid.' : 'The request could not be completed.'),
    fieldErrors: rawErrors.map((fieldError) => ({
      field: fieldError.field || fieldError.path || '',
      message: fieldError.message || String(fieldError),
    })),
  };
};

export default apiClient;
