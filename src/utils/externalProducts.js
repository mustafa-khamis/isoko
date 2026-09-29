export const LISTING_TYPE = {
  REGULAR: 'regular',
  EXTERNAL: 'external',
};

export const isExternalProduct = (listing) => listing?.listing_type === LISTING_TYPE.EXTERNAL;

export const buyButtonLabel = (platformName) => `Buy from ${platformName || 'the seller’s store'}`;

// The backend only stores https links, but the link is still checked here
// before it is placed in an href.
export const safeExternalUrl = (value) => {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
};

export const externalUrlHost = (value) => {
  const safe = safeExternalUrl(value);
  return safe ? new URL(safe).hostname.replace(/^www\./, '') : '';
};

// Mirrors the backend rule for the create/edit forms.
export const isValidExternalUrl = (value) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed || /\s/.test(trimmed)) return false;
  const safe = safeExternalUrl(trimmed);
  if (!safe) return false;
  const url = new URL(safe);
  return !url.username && !url.password && url.hostname.includes('.');
};

// Availability comes from the plan configuration returned by the backend.
export const externalProductAllowance = (sellingUsage) => sellingUsage?.external_products || { enabled: false };
