import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { UIProvider, useUI } from './UIContext';
import { notificationsApi } from '../services/notificationsApi';

vi.mock('./AuthContext', () => {
  const user = { id: 'buyer-1' };
  return { useAuth: () => ({ user, isLoading: false }) };
});
vi.mock('../services/usersApi', () => ({
  usersApi: { getFavorites: vi.fn().mockResolvedValue({ data: { data: [] } }) },
}));
vi.mock('../services/listingsApi', () => ({ listingsApi: { toggleFavorite: vi.fn() } }));
vi.mock('../services/messagesApi', () => ({
  messagesApi: { getUnreadCount: vi.fn().mockResolvedValue({ data: { data: { count: 0 } } }) },
}));
vi.mock('../services/notificationsApi', () => ({
  notificationsApi: { getUnreadCount: vi.fn(), markAllAsRead: vi.fn() },
}));
vi.mock('../utils/firebase', () => ({
  onForegroundMessage: vi.fn(() => Promise.resolve(() => {})),
}));

const unread = (count) => ({ data: { data: { count } } });

function Probe() {
  const { unreadNotificationCount, markAllNotificationsRead, refreshUnreadCounts } = useUI();
  return (
    <>
      <span data-testid="badge">{unreadNotificationCount > 0 ? 'dot' : 'none'}</span>
      <button onClick={() => markAllNotificationsRead()}>Open notifications</button>
      <button onClick={() => refreshUnreadCounts()}>Poll</button>
    </>
  );
}

const renderProbe = () => render(<UIProvider><Probe /></UIProvider>);

describe('notification badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationsApi.getUnreadCount.mockResolvedValue(unread(3));
    notificationsApi.markAllAsRead.mockResolvedValue({ data: {} });
  });

  it('disappears as soon as notifications are opened and marks them read once', async () => {
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('badge')).toHaveTextContent('dot'));

    fireEvent.click(screen.getByText('Open notifications'));
    fireEvent.click(screen.getByText('Open notifications'));

    expect(screen.getByTestId('badge')).toHaveTextContent('none');
    await waitFor(() => expect(notificationsApi.markAllAsRead).toHaveBeenCalledTimes(1));
  });

  it('is not brought back by a count that was requested before opening', async () => {
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('badge')).toHaveTextContent('dot'));

    let resolveStalePoll;
    notificationsApi.getUnreadCount.mockReturnValueOnce(new Promise((resolve) => { resolveStalePoll = resolve; }));
    fireEvent.click(screen.getByText('Poll'));
    fireEvent.click(screen.getByText('Open notifications'));
    await waitFor(() => expect(notificationsApi.markAllAsRead).toHaveBeenCalled());

    await act(async () => resolveStalePoll(unread(3)));

    expect(screen.getByTestId('badge')).toHaveTextContent('none');
  });

  it('comes back if marking as read fails', async () => {
    notificationsApi.markAllAsRead.mockRejectedValueOnce(new Error('offline'));
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('badge')).toHaveTextContent('dot'));

    fireEvent.click(screen.getByText('Open notifications'));

    expect(screen.getByTestId('badge')).toHaveTextContent('none');
    await waitFor(() => expect(screen.getByTestId('badge')).toHaveTextContent('dot'));
  });
});
