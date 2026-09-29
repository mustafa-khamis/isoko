import { render, screen } from '@testing-library/react';
import { getOfferDiscount, hasOffer, offerBadgeLabel, offersAllowed, validateOffer } from './offers';
import { buildPlanFeatures } from './planFeatures';
import { OfferBadge, PriceBadge } from '../components/listings/ListingCard';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('../context/UIContext', () => ({ useUI: () => ({}) }));

describe('offer calculation', () => {
  it.each([
    [20, 15, 25],
    [100, 80, 20],
    [100, 50, 50],
    ['20000.00', '15000.00', 25],
  ])('%s -> %s is %i%% off', (previous, current, expected) => {
    expect(getOfferDiscount(previous, current)).toBe(expected);
  });

  it('rounds down so the saving is never overstated', () => {
    expect(getOfferDiscount(30, 20)).toBe(33);
  });

  it.each([[100, 100], [100, 120], [0, 0], ['', 10], [null, 10]])('is not an offer for %s -> %s', (previous, current) => {
    expect(getOfferDiscount(previous, current)).toBeNull();
  });

  it('labels the badge with the percentage', () => {
    expect(offerBadgeLabel(25)).toBe('25% OFF');
    expect(offerBadgeLabel(0)).toBe('Promotion');
  });

  it('detects an offer on a listing', () => {
    expect(hasOffer({ price: '15000.00', previous_price: '20000.00' })).toBe(true);
    expect(hasOffer({ price: '15000.00', previous_price: null })).toBe(false);
  });
});

describe('offer validation', () => {
  it('accepts a lower offer price', () => {
    expect(validateOffer('20000', '15000')).toBeNull();
  });

  it.each([
    ['', '15000', 'Enter the price before the offer.'],
    ['20000', '', 'Enter the offer price.'],
    ['100', '100', 'The offer price must be lower than the previous price.'],
    ['100', '120', 'The offer price must be lower than the previous price.'],
    ['0', '0', 'The offer price must be lower than the previous price.'],
    ['-5', '1', 'Enter the price before the offer.'],
    ['abc', '1', 'Enter the price before the offer.'],
  ])('rejects previous %s / current %s', (previous, current, message) => {
    expect(validateOffer(previous, current)).toBe(message);
  });
});

describe('offer availability', () => {
  it('comes only from the backend capability', () => {
    expect(offersAllowed({ promotional_offers: { enabled: true } })).toBe(true);
    expect(offersAllowed({ promotional_offers: { enabled: false } })).toBe(false);
    expect(offersAllowed({ plan: { code: 'trader_premium' } })).toBe(false);
    expect(offersAllowed(undefined)).toBe(false);
  });

  it('is listed as a plan feature when the plan includes it', () => {
    expect(buildPlanFeatures({ max_active_listings: 20, features: { promotional_offers: true } })).toContain('Promotional offers');
    expect(buildPlanFeatures({ max_active_listings: 2, features: {} })).not.toContain('Promotional offers');
  });
});

describe('price display', () => {
  it('strikes through the previous price and leads with the current price', () => {
    const { container } = render(<PriceBadge price="15000.00" previousPrice="20000.00" priceType="fixed" />);

    const previous = container.querySelector('del');
    expect(previous).toHaveTextContent(/Previous price:.*20,000/);
    expect(container.querySelector('.listing-price--offer')).toHaveTextContent(/Current price:.*15,000/);
    expect(previous.compareDocumentPosition(container.querySelector('.listing-price--offer')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows a plain price without an offer', () => {
    const { container } = render(<PriceBadge price="20000.00" previousPrice={null} priceType="fixed" />);

    expect(container.querySelector('del')).toBeNull();
    expect(container.querySelector('.listing-price--offer')).toBeNull();
    expect(container).toHaveTextContent(/20,000/);
  });

  it('shows a text discount badge only when there is an offer', () => {
    render(<OfferBadge previousPrice="20000" price="15000" />);
    expect(screen.getByText('25% OFF')).toBeInTheDocument();

    const { container } = render(<OfferBadge previousPrice={null} price="15000" />);
    expect(container).toBeEmptyDOMElement();
  });
});
