import {
  buyButtonLabel,
  externalUrlHost,
  isExternalProduct,
  isValidExternalUrl,
  safeExternalUrl,
} from './externalProducts';
import { buildPlanFeatures } from './planFeatures';

describe('external product helpers', () => {
  it('builds the buy button label from the platform name', () => {
    expect(buyButtonLabel('Amazon')).toBe('Buy from Amazon');
    expect(buyButtonLabel('AliExpress')).toBe('Buy from AliExpress');
    expect(buyButtonLabel('Etsy')).toBe('Buy from Etsy');
  });

  it('identifies external products', () => {
    expect(isExternalProduct({ listing_type: 'external' })).toBe(true);
    expect(isExternalProduct({ listing_type: 'regular' })).toBe(false);
    expect(isExternalProduct({})).toBe(false);
  });

  it('only ever places https links in an href', () => {
    expect(safeExternalUrl('https://www.amazon.com/dp/1?tag=a-20')).toBe('https://www.amazon.com/dp/1?tag=a-20');
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl('data:text/html,hi')).toBeNull();
    expect(safeExternalUrl('http://www.amazon.com/dp/1')).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
  });

  it('shows the destination host without www', () => {
    expect(externalUrlHost('https://www.aliexpress.com/item/1.html')).toBe('aliexpress.com');
    expect(externalUrlHost('javascript:alert(1)')).toBe('');
  });

  it('validates the product link the way the backend does', () => {
    expect(isValidExternalUrl('https://www.amazon.com/dp/1')).toBe(true);
    expect(isValidExternalUrl('https://user:pw@evil.example.com')).toBe(false);
    expect(isValidExternalUrl('https://localhost/x')).toBe(false);
    expect(isValidExternalUrl('https://www.amazon.com/dp/ 1')).toBe(false);
    expect(isValidExternalUrl('file:///etc/passwd')).toBe(false);
  });
});

describe('plan features for external products', () => {
  const basePlan = { max_active_listings: 20, max_listings_per_period: null, max_sponsored_ads_per_period: 5 };

  it('shows the configured allowance', () => {
    expect(buildPlanFeatures({ ...basePlan, max_external_products_per_period: 20, external_products_period_days: 30 }))
      .toContain('20 external products every 30 days');
    expect(buildPlanFeatures({ ...basePlan, max_external_products_per_period: 50, external_products_period_days: 30 }))
      .toContain('50 external products every 30 days');
  });

  it('says external products are not available on plans without an allowance', () => {
    expect(buildPlanFeatures({ ...basePlan, max_external_products_per_period: 0 }))
      .toContain('External products not available');
  });

  it('adds nothing when the backend does not send the field', () => {
    expect(buildPlanFeatures(basePlan).some((feature) => feature.toLowerCase().includes('external'))).toBe(false);
  });
});
