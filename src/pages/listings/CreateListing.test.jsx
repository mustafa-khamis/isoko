import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CreateListing from './CreateListing';
import { listingsApi } from '../../services/listingsApi';
import { usersApi } from '../../services/usersApi';

vi.mock('../../context/AuthContext', () => {
  const user = { id: 'seller-1' };
  return { useAuth: () => ({ user, isLoading: false }) };
});
vi.mock('../../context/UIContext', () => ({
  useUI: () => ({ isMobile: false }),
}));
vi.mock('../../services/listingsApi', () => ({
  listingsApi: { createListing: vi.fn() },
}));
vi.mock('../../services/usersApi', () => ({
  usersApi: { getSellingUsage: vi.fn() },
}));
vi.mock('../../services/categoriesApi', () => ({
  categoriesApi: {
    getCategories: vi.fn().mockResolvedValue({ data: { data: [{ id: 'cat-1', name: 'Electronics' }] } }),
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
  externalPlatformsApi: {
    getPlatforms: vi.fn().mockResolvedValue({
      data: {
        data: [
          { id: 'platform-amazon', name: 'Amazon', is_other: false },
          { id: 'platform-other', name: 'Other', is_other: true },
        ],
      },
    }),
  },
}));

const sellingUsage = (externalProducts) => ({
  data: { data: { plan: { code: 'trader_plus' }, active_listings_count: 0, external_products: externalProducts } },
});
const PLUS_ALLOWANCE = { enabled: true, limit: 20, period_days: 30, used: 0, pending: 0, remaining: 20 };

const renderPage = () => render(
  <MemoryRouter initialEntries={['/create-listing']}>
    <CreateListing />
  </MemoryRouter>
);

const addPhoto = (container) => {
  const input = container.querySelector('input[type="file"][multiple]');
  const photo = new File(['png'], 'photo.png', { type: 'image/png' });
  fireEvent.change(input, { target: { files: [photo] } });
};

const clickContinue = () => fireEvent.click(screen.getByRole('button', { name: /continue/i }));

const fillDetailsAndPrice = async () => {
  fireEvent.change(screen.getByPlaceholderText('Enter a clear title for your listing'), { target: { value: 'Wireless headphones' } });
  fireEvent.click(await screen.findByRole('button', { name: 'Electronics' }));
  fireEvent.change(screen.getByPlaceholderText(/Describe your item/), {
    target: { value: 'Noise cancelling over-ear headphones with 30h battery.' },
  });
  clickContinue();
  fireEvent.change(await screen.findByPlaceholderText('0'), { target: { value: '45000' } });
  clickContinue();
};

describe('CreateListing', () => {
  beforeAll(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    usersApi.getSellingUsage.mockResolvedValue(sellingUsage(PLUS_ALLOWANCE));
    listingsApi.createListing.mockResolvedValue({ data: { data: { id: 'listing-1' } } });
  });

  it('does not continue, and never sends a request, without an image', async () => {
    renderPage();
    await screen.findByRole('button', { name: /left this period/ });

    clickContinue();

    expect(await screen.findByText('Add at least one image before continuing.')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
    expect(listingsApi.createListing).not.toHaveBeenCalled();
  });

  it('submits an external product with its image in one request', async () => {
    const { container } = renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /left this period/ }));
    addPhoto(container);
    clickContinue();
    await fillDetailsAndPrice();

    expect(await screen.findByText('Store & link')).toBeInTheDocument();
    expect(screen.queryByText(/WhatsApp/i)).not.toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText('Platform *'), { target: { value: 'platform-amazon' } });
    fireEvent.change(screen.getByLabelText('Product link *'), {
      target: { value: 'https://www.amazon.com/dp/B0EXAMPLE?tag=seller-20' },
    });
    clickContinue();
    fireEvent.click(await screen.findByRole('button', { name: 'Submit for review' }));

    await waitFor(() => expect(listingsApi.createListing).toHaveBeenCalledTimes(1));
    const formData = listingsApi.createListing.mock.calls[0][0];
    expect(formData.getAll('images')).toHaveLength(1);
    expect(JSON.parse(formData.get('data'))).toMatchObject({
      listing_type: 'external',
      price: 45000,
      price_type: 'fixed',
      whatsapp_enabled: false,
      external_platform_id: 'platform-amazon',
      external_platform_other_name: null,
      external_url: 'https://www.amazon.com/dp/B0EXAMPLE?tag=seller-20',
    });
  });

  it('refuses a non-https product link', async () => {
    const { container } = renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /left this period/ }));
    addPhoto(container);
    clickContinue();
    await fillDetailsAndPrice();

    fireEvent.change(await screen.findByLabelText('Platform *'), { target: { value: 'platform-amazon' } });
    fireEvent.change(screen.getByLabelText('Product link *'), { target: { value: 'javascript:alert(1)' } });
    clickContinue();

    expect(await screen.findByText('Enter a valid product link that starts with https://')).toBeInTheDocument();
    expect(screen.getByText('Step 4 of 5')).toBeInTheDocument();
  });

  it('requires a name when the seller chooses Other', async () => {
    const { container } = renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /left this period/ }));
    addPhoto(container);
    clickContinue();
    await fillDetailsAndPrice();

    fireEvent.change(await screen.findByLabelText('Platform *'), { target: { value: 'platform-other' } });
    expect(screen.getByLabelText('Platform name *')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Product link *'), { target: { value: 'https://www.etsy.com/listing/1' } });
    clickContinue();

    expect(await screen.findByText('Enter the name of the platform.')).toBeInTheDocument();
  });

  it('shows regular listing selected immediately while only the external option loads', () => {
    usersApi.getSellingUsage.mockReturnValue(new Promise(() => {}));
    renderPage();

    const regular = screen.getByRole('button', { name: /Regular listing/ });
    expect(regular).toHaveAttribute('aria-pressed', 'true');
    expect(regular).toBeEnabled();
    const external = screen.getByRole('button', { name: 'External product, checking your plan' });
    expect(external).toBeDisabled();
    expect(external).toHaveAttribute('aria-busy', 'true');
  });

  it('locks external products with an upgrade link on a plan without them', async () => {
    usersApi.getSellingUsage.mockResolvedValue(sellingUsage({ enabled: false }));
    renderPage();

    const upgrade = await screen.findByRole('link', { name: 'Upgrade to unlock' });
    expect(upgrade).toHaveAttribute('href', '/trader-plans');
    expect(screen.getByText('Sold on another store.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /External product/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Regular listing/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('offers a retry when the plan cannot be checked', async () => {
    usersApi.getSellingUsage
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(sellingUsage(PLUS_ALLOWANCE));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('button', { name: /20 of 20 left this period/ })).toBeEnabled();
    expect(usersApi.getSellingUsage).toHaveBeenCalledTimes(2);
  });

  it('disables the option once the period allowance is used up', async () => {
    usersApi.getSellingUsage.mockResolvedValue(sellingUsage({ ...PLUS_ALLOWANCE, used: 20, remaining: 0 }));
    renderPage();

    expect(await screen.findByRole('button', { name: /Limit reached/ })).toBeDisabled();
  });
});
