const ACCESS_TOKEN_KEY = 'isoko_access_token';
const AUTH_USER_KEY = 'isoko_auth_user';
const AUTH_CACHE_VERSION_KEY = 'isoko_auth_cache_version';

export function getAccessToken() {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setAccessToken(token) {
  try {
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  } catch (err) {
    console.error('Failed to set access token in localStorage', err);
  }
}

export function removeAccessToken() {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch (err) {
    console.error('Failed to remove access token from localStorage', err);
  }
}

export function normalizeMinimalUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email || '',
    full_name: user.full_name || user.name || '',
    name: user.name || user.full_name || '',
    profile_image_path: user.profile_image_path || user.avatar_url || user.profile?.avatar_url || null,
    avatar_url: user.avatar_url || user.profile_image_path || user.profile?.avatar_url || null,
    roles: Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : []),
    selling_plan: user.selling_plan || null,
    status: user.status || 'active',
  };
}

export function getCachedUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

export function setCachedUser(user) {
  try {
    if (user) {
      const normalized = normalizeMinimalUser(user);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(normalized));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  } catch (err) {
    console.error('Failed to set cached user in localStorage', err);
  }
}

export function updateCachedUser(partialUser) {
  try {
    const existing = getCachedUser();
    if (existing) {
      const merged = { ...existing, ...partialUser };
      setCachedUser(merged);
      return merged;
    }
    return null;
  } catch (err) {
    console.error('Failed to update cached user in localStorage', err);
    return null;
  }
}

export function removeCachedUser() {
  try {
    localStorage.removeItem(AUTH_USER_KEY);
  } catch (err) {
    console.error('Failed to remove cached user from localStorage', err);
  }
}

export function clearAuthCache() {
  removeAccessToken();
  removeCachedUser();
  try {
    const currentVersion = Number(localStorage.getItem(AUTH_CACHE_VERSION_KEY) || 0);
    localStorage.setItem(AUTH_CACHE_VERSION_KEY, String(currentVersion + 1));
  } catch {
    // ignore
  }
}

export function bumpAuthCacheVersion() {
  try {
    const currentVersion = Number(localStorage.getItem(AUTH_CACHE_VERSION_KEY) || 0);
    localStorage.setItem(AUTH_CACHE_VERSION_KEY, String(currentVersion + 1));
  } catch {
    // ignore
  }
}

export { ACCESS_TOKEN_KEY, AUTH_USER_KEY, AUTH_CACHE_VERSION_KEY };
