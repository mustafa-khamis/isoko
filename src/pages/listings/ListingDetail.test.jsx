import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ListingDetail from './ListingDetail';
import { listingsApi } from '../../services/listingsApi';

let mockIsMobile = false;

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));
vi.mock('../../context/UIContext', () => ({
  useUI: () => ({
    isMobile: mockIsMobile,
    showAuth: vi.fn(),
    toggleFavorite: vi.fn(),
    isFavorite: () => false,
  }),
}));
vi.mock('../../services/listingsApi', () => ({
  listingsApi: { getListing: vi.fn(), getListings: vi.fn() },
}));

const baseListing = {
  id: 'listing-1',
  user_id: 'seller-1',
  title: 'Wireless headphones',
  description: 'Noise cancelling over-ear headphones with 30h battery.',
  price: '45000.00',
  price_type: 'fixed',
  images: ['https://cdn.example/photo.png'],
  created_at: '2026-09-01T10:00:00Z',
  seller_name: 'Mustafa',
};
const externalListing = {
  ...baseListing,
  listing_type: 'external',
  whatsapp_enabled: false,
  external_platform_name: 'Amazon',
  external_url: 'https://www.amazon.com/dp/B0EXAMPLE?tag=seller-20',
};

const renderDetail = (listing) => {
  listingsApi.getListing.mockResolvedValue({ data: { data: listing } });
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/listing/listing-1']}>
        <Routes>
          <Route path="/listing/:id" element={<ListingDetail />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>
  );
};

describe('ListingDetail for external products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMobile = false;
  });

  it.each([false, true])('offers "Buy from Amazon" instead of contact options (mobile: %s)', async (isMobile) => {
    mockIsMobile = isMobile;
    renderDetail(externalListing);

    const buy = await screen.findByRole('link', { name: /Buy from Amazon/ });
    expect(buy).toHaveAttribute('href', 'https://www.amazon.com/dp/B0EXAMPLE?tag=seller-20');
    expect(buy).toHaveAttribute('target', '_blank');
    expect(buy.getAttribute('rel')).toEqual(expect.stringContaining('noopener'));
    expect(buy.getAttribute('rel')).toEqual(expect.stringContaining('sponsored'));
    expect(screen.queryByRole('button', { name: /Message/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /WhatsApp/ })).not.toBeInTheDocument();
  });

  it('labels the button with the seller-entered platform for "Other"', async () => {
    renderDetail({ ...externalListing, external_platform_name: 'Etsy', external_url: 'https://www.etsy.com/listing/1' });
    expect(await screen.findByRole('link', { name: /Buy from Etsy/ })).toBeInTheDocument();
  });

  it('shows the disclosure below the description', async () => {
    renderDetail(externalListing);

    const disclosure = await screen.findByText(/External product: you will be redirected to Amazon/);
    expect(disclosure).toHaveTextContent('RwanMart does not process payment or fulfillment for this product');
    const description = screen.getByText(externalListing.description);
    expect(description.compareDocumentPosition(disclosure) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('never renders an unsafe link', async () => {
    renderDetail({ ...externalListing, external_url: 'javascript:alert(1)' });

    await screen.findByText(externalListing.description);
    expect(screen.queryByRole('link', { name: /Buy from/ })).not.toBeInTheDocument();
  });

  it('keeps messaging and WhatsApp for regular listings', async () => {
    renderDetail({ ...baseListing, listing_type: 'regular', whatsapp_enabled: true, seller_phone: '788000000' });

    expect(await screen.findByRole('button', { name: /Message seller/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /WhatsApp seller/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Buy from/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/External product:/)).not.toBeInTheDocument();
  });
});
