import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Notifications from './Notifications';
import { notificationsApi } from '../../services/notificationsApi';

const ui = {
  isMobile: false,
  showAuth: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  refreshUnreadCounts: vi.fn(),
  whenNotificationsMarkedRead: vi.fn(),
};

vi.mock('../../context/AuthContext', () => {
  const user = { id: 'buyer-1' };
  return { useAuth: () => ({ user, isLoading: false }) };
});
vi.mock('../../context/UIContext', () => ({ useUI: () => ui }));
vi.mock('../../services/pushNotifications', () => ({ enablePushNotifications: vi.fn() }));
vi.mock('../../services/notificationsApi', () => ({
  notificationsApi: { getNotifications: vi.fn(), markAsRead: vi.fn(), markAllAsRead: vi.fn() },
}));

const notification = (id, readAt) => ({
  id, type: 'broadcast', title: `Notice ${id}`, body: 'Body', created_at: '2026-09-28T10:00:00Z', read_at: readAt,
});

const renderPage = () => render(<MemoryRouter><Notifications /></MemoryRouter>);

describe('Notifications page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ui.whenNotificationsMarkedRead.mockResolvedValue(true);
    ui.markAllNotificationsRead.mockResolvedValue(true);
  });

  it('waits for the bell\'s "mark all read" before loading, so the list is up to date', async () => {
    let finishMarking;
    ui.whenNotificationsMarkedRead.mockReturnValue(new Promise((resolve) => { finishMarking = resolve; }));
    notificationsApi.getNotifications.mockResolvedValue({ data: { data: [notification('1', '2026-09-28T10:01:00Z')] } });
    renderPage();

    expect(notificationsApi.getNotifications).not.toHaveBeenCalled();
    await act(async () => finishMarking(true));

    expect(await screen.findByText('Notice 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mark all read/ })).not.toBeInTheDocument();
  });

  it('treats notifications with read_at as read', async () => {
    notificationsApi.getNotifications.mockResolvedValue({
      data: { data: [notification('1', '2026-09-28T10:01:00Z'), notification('2', null)] },
    });
    const { container } = renderPage();

    await screen.findByText('Notice 2');
    expect(container.querySelectorAll('.notifications-unread-dot')).toHaveLength(1);
    expect(container.querySelector('.notifications-count-badge')).toHaveTextContent('1');
  });

  it('marks everything read through the shared badge state', async () => {
    notificationsApi.getNotifications.mockResolvedValue({ data: { data: [notification('2', null)] } });
    const { container } = renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Mark all read/ }));

    await waitFor(() => expect(container.querySelectorAll('.notifications-unread-dot')).toHaveLength(0));
    expect(ui.markAllNotificationsRead).toHaveBeenCalledTimes(1);
  });

  it('updates the badge after reading a single notification', async () => {
    notificationsApi.getNotifications.mockResolvedValue({ data: { data: [notification('2', null)] } });
    notificationsApi.markAsRead.mockResolvedValue({ data: {} });
    renderPage();

    fireEvent.click(await screen.findByText('Notice 2'));

    await waitFor(() => expect(ui.refreshUnreadCounts).toHaveBeenCalled());
    expect(notificationsApi.markAsRead).toHaveBeenCalledWith('2');
  });
});
