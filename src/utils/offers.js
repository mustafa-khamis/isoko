const toAmount = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

// Same rule as the backend: rounded down so the saving is never overstated.
export const getOfferDiscount = (previousPrice, price) => {
  const previous = toAmount(previousPrice);
  const current = toAmount(price);
  if (previous === null || current === null || previous <= 0 || previous <= current) return null;
  return Math.floor(((previous - current) / previous) * 100);
};

export const hasOffer = (listing) => getOfferDiscount(listing?.previous_price, listing?.price) !== null;

export const offerBadgeLabel = (discount) => (discount >= 1 ? `${discount}% OFF` : 'Promotion');

// Returns an error message, or null when the two prices form a valid offer.
export const validateOffer = (previousPrice, price) => {
  const previous = toAmount(previousPrice);
  const current = toAmount(price);
  if (previous === null || previous < 0) return 'Enter the price before the offer.';
  if (current === null || current < 0) return 'Enter the offer price.';
  if (previous <= current) return 'The offer price must be lower than the previous price.';
  return null;
};

// Availability comes from the plan capability returned by the backend.
export const offersAllowed = (sellingUsage) => sellingUsage?.promotional_offers?.enabled === true;
