import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EditListing from './EditListing';
import { listingsApi } from '../../services/listingsApi';
import { usersApi } from '../../services/usersApi';

vi.mock('../../context/AuthContext', () => {
  const user = { id: 'seller-1' };
  return { useAuth: () => ({ user, isLoading: false }) };
});
vi.mock('../../context/UIContext', () => ({ useUI: () => ({ isMobile: false }) }));
vi.mock('../../services/listingsApi', () => ({
  listingsApi: {
    getListingForManage: vi.fn(),
    updateListing: vi.fn(),
    uploadListingImages: vi.fn(),
    deleteListingImage: vi.fn(),
  },
}));
vi.mock('../../services/usersApi', () => ({ usersApi: { getSellingUsage: vi.fn() } }));
vi.mock('../../services/categoriesApi', () => ({
  categoriesApi: {
    getCategories: vi.fn().mockResolvedValue({ data: { data: [{ id: 'cat-1', name: 'Sports' }] } }),
    getSubcategories: vi.fn().mockResolvedValue({ data: { data: [] } }),
  },
}));
vi.mock('../../services/locationsApi', () => ({
  locationsApi: {
    getProvinces: vi.fn().mockResolvedValue({ data: { data: [] } }),
    getCities: vi.fn().mockResolvedValue({ data: { data: [] } }),
  },
}));
vi.mock('../../services/externalPlatformsApi', () => ({
  externalPlatformsApi: { getPlatforms: vi.fn().mockResolvedValue({ data: { data: [] } }) },
}));

const listingOnOffer = {
  id: 'listing-1',
  title: 'Mountain bicycle',
  category_id: 'cat-1',
  description: 'A well kept mountain bicycle with new tyres and brakes.',
  price: '15000.00',
  previous_price: '20000.00',
  price_type: 'fixed',
  listing_type: 'regular',
  images: [{ id: 'image-1', url: 'https://cdn.example/bike.png' }],
};
const planUsage = (offers) => ({ data: { data: { promotional_offers: { enabled: offers } } } });

const renderPage = () => render(
  <MemoryRouter initialEntries={['/edit-listing/listing-1']}>
    <Routes>
      <Route path="/edit-listing/:id" element={<EditListing />} />
    </Routes>
  </MemoryRouter>
);

const openPricing = async () => {
  fireEvent.click(await screen.findByRole('tab', { name: 'Pricing' }));
  return screen.getByLabelText('Previous price (RWF) *');
};
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));

describe('EditListing offers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listingsApi.getListingForManage.mockResolvedValue({ data: { data: listingOnOffer } });
    listingsApi.updateListing.mockResolvedValue({ data: { data: listingOnOffer } });
  });

  it('updates an existing offer', async () => {
    usersApi.getSellingUsage.mockResolvedValue(planUsage(true));
    renderPage();
    const previous = await openPricing();
    await waitFor(() => expect(usersApi.getSellingUsage).toHaveBeenCalled());

    fireEvent.change(previous, { target: { value: '25000' } });
    fireEvent.change(screen.getByLabelText('Current price (RWF) *'), { target: { value: '18000' } });
    save();

    await waitFor(() => expect(listingsApi.updateListing).toHaveBeenCalled());
    expect(listingsApi.updateListing.mock.calls[0][1]).toMatchObject({
      price: 18000,
      offer_enabled: true,
      previous_price: 25000,
    });
  });

  it('removes an offer, leaving only the current price', async () => {
    usersApi.getSellingUsage.mockResolvedValue(planUsage(true));
    renderPage();
    await openPricing();

    fireEvent.click(screen.getByRole('button', { name: /Remove offer/ }));
    save();

    await waitFor(() => expect(listingsApi.updateListing).toHaveBeenCalled());
    const body = listingsApi.updateListing.mock.calls[0][1];
    expect(body).toMatchObject({ price: 15000, offer_enabled: false });
    expect(body).not.toHaveProperty('previous_price');
  });

  it('lets a seller whose plan no longer includes offers keep an unchanged offer', async () => {
    usersApi.getSellingUsage.mockResolvedValue(planUsage(false));
    renderPage();
    const previous = await openPricing();

    await waitFor(() => expect(previous).toBeDisabled());
    save();

    await waitFor(() => expect(listingsApi.updateListing).toHaveBeenCalled());
    expect(listingsApi.updateListing.mock.calls[0][1]).toMatchObject({ offer_enabled: true, previous_price: 20000, price: 15000 });
  });

  it('stops that seller from changing the offer prices', async () => {
    usersApi.getSellingUsage.mockResolvedValue(planUsage(false));
    renderPage();
    const previous = await openPricing();
    await waitFor(() => expect(previous).toBeDisabled());

    fireEvent.change(screen.getByLabelText('Current price (RWF) *'), { target: { value: '14000' } });
    save();

    expect(await screen.findByText('Your plan no longer includes offers. Remove the offer to change these prices.')).toBeInTheDocument();
    expect(listingsApi.updateListing).not.toHaveBeenCalled();
  });
});
