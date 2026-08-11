export const buildPlanFeatures = (plan) => {
  const rawFeatures = [];

  // Active listings limit
  if (plan.max_active_listings === null || plan.max_active_listings === undefined) {
    rawFeatures.push('Unlimited active listings');
  } else {
    rawFeatures.push(`${plan.max_active_listings} active ${plan.max_active_listings === 1 ? 'listing' : 'listings'}`);
  }

  // Listings per period limit
  if (plan.max_listings_per_period === null || plan.max_listings_per_period === undefined) {
    rawFeatures.push('Unlimited listings');
  } else if (plan.max_listings_per_period > 0) {
    rawFeatures.push(
      `${plan.max_listings_per_period} ${plan.max_listings_per_period === 1 ? 'listing' : 'listings'}${
        plan.listing_period_days ? ` every ${plan.listing_period_days} days` : ''
      }`
    );
  }

  // Sponsored Ads
  if (plan.max_sponsored_ads_per_period === null || plan.max_sponsored_ads_per_period === undefined) {
    rawFeatures.push('Unlimited sponsored ads');
  } else if (plan.max_sponsored_ads_per_period === 0) {
    rawFeatures.push('No sponsored ads included');
  } else {
    const periodText = plan.sponsored_ads_period_days ? ` every ${plan.sponsored_ads_period_days} days` : '';
    rawFeatures.push(
      `${plan.max_sponsored_ads_per_period} sponsored ${plan.max_sponsored_ads_per_period === 1 ? 'ad' : 'ads'}${periodText}`
    );
  }

  // Additional generic JSON features, if present
  if (plan.features && typeof plan.features === 'object') {
    Object.values(plan.features).forEach(val => {
      rawFeatures.push(val);
    });
  }

  // Filter out empty rows, "-" strings, "Not set", "N/A" and deduplicate
  const cleanFeatures = rawFeatures
    .map(f => (typeof f === 'string' ? f.trim() : ''))
    .filter(f => f && f !== '-' && f.toLowerCase() !== 'not set' && f.toLowerCase() !== 'n/a' && f.toLowerCase() !== 'no feature');

  return [...new Set(cleanFeatures)];
};

export const getPlanDescription = (code) => {
  switch (code) {
    case 'free':
      return 'Perfect for casual sellers who want to start selling on Isoko with the essential tools to create listings and connect with buyers.';
    case 'trader_plus':
    case 'trader-plus':
      return 'Built for active sellers who need more room to grow, manage more listings, and promote their products to reach more buyers.';
    case 'trader_premium':
    case 'trader-premium':
      return 'Designed for professional and high-volume sellers who want the highest selling limits, greater visibility, and the most powerful tools available on Isoko.';
    default:
      return 'Unlock advanced selling tools to grow your business on Isoko.';
  }
};
