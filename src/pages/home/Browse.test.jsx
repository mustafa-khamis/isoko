import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Browse from './Browse';
import Header from '../../components/navigation/Header';
import { listingsApi } from '../../services/listingsApi';

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('../../context/UIContext', () => ({
  useUI: () => ({
    isMobile: true,
    showAuth: vi.fn(),
    unreadNotificationCount: 0,
    markAllNotificationsRead: vi.fn(),
    toggleFavorite: vi.fn(),
    isFavorite: () => false,
  }),
}));
vi.mock('../../services/listingsApi', () => ({
  listingsApi: {
    getListings: vi.fn().mockResolvedValue({ data: { data: [], pagination: { page: 1, total: 0, total_pages: 1 } } }),
  },
}));
vi.mock('../../services/categoriesApi', () => ({
  categoriesApi: {
    getCategories: vi.fn().mockResolvedValue({
      data: { data: [{ id: 'cat-electronics', name: 'Electronics' }, { id: 'cat-vehicles', name: 'Vehicles' }, { id: 'cat-property', name: 'Property' }] },
    }),
  },
}));
vi.mock('../../services/locationsApi', () => ({
  locationsApi: { getProvinces: vi.fn().mockResolvedValue({ data: { data: [] } }) },
}));

function CurrentUrl() {
  const location = useLocation();
  return <output data-testid="url">{location.pathname + location.search}</output>;
}

const renderAt = (url) => render(
  <HelmetProvider>
    <MemoryRouter initialEntries={[url]}>
      <Header />
      <Routes>
        <Route path="/" element={<div>Home</div>} />
        <Route path="/browse" element={<Browse />} />
      </Routes>
      <CurrentUrl />
    </MemoryRouter>
  </HelmetProvider>
);

const lastCategoryRequested = () => listingsApi.getListings.mock.calls.at(-1)?.[0]?.category_id;
const tab = (name) => screen.getByRole('button', { name });

describe('Browse category switching from the header menu', () => {
  beforeEach(() => vi.clearAllMocks());

  it('switches straight to another category without clearing the filter first', async () => {
    renderAt('/browse?category=cat-electronics');
    await waitFor(() => expect(lastCategoryRequested()).toBe('cat-electronics'));

    fireEvent.click(await screen.findByRole('button', { name: 'Vehicles' }));

    await waitFor(() => expect(lastCategoryRequested()).toBe('cat-vehicles'));
    expect(screen.getByTestId('url')).toHaveTextContent('/browse?category=cat-vehicles');
    expect(tab('Vehicles')).toHaveClass('category-tab--active');
    expect(tab('Electronics')).not.toHaveClass('category-tab--active');

    fireEvent.click(tab('Property'));

    await waitFor(() => expect(lastCategoryRequested()).toBe('cat-property'));
    expect(screen.getByTestId('url')).toHaveTextContent('/browse?category=cat-property');
  });

  it('still clears the category with "Clear all" and can pick one again', async () => {
    renderAt('/browse?category=cat-electronics');
    await waitFor(() => expect(lastCategoryRequested()).toBe('cat-electronics'));

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent(/^\/browse$/));
    await waitFor(() => expect(lastCategoryRequested()).toBeUndefined());

    fireEvent.click(await screen.findByRole('button', { name: 'Vehicles' }));
    await waitFor(() => expect(lastCategoryRequested()).toBe('cat-vehicles'));
  });

  it('keeps the search text when "Clear all" removes the category', async () => {
    renderAt('/browse?search=bike&category=cat-electronics');
    await waitFor(() => expect(lastCategoryRequested()).toBe('cat-electronics'));

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('/browse?search=bike'));
    expect(listingsApi.getListings.mock.calls.at(-1)[0]).toMatchObject({ q: 'bike' });
  });
});
