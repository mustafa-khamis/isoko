import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient, { refreshAccessToken, setAccessToken } from '../services/apiClient';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../services/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  refreshAccessToken: vi.fn(),
  setAccessToken: vi.fn(),
  startAuthSession: vi.fn(),
  endAuthSession: vi.fn(),
}));

const AuthState = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <span>loading</span>;
  return <span>{user?.email || 'guest'}</span>;
};

describe('AuthProvider session restoration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('restores the logged-in user from the refresh cookie', async () => {
    refreshAccessToken.mockResolvedValue('fresh-access-token');
    apiClient.get.mockResolvedValue({
      data: { data: { id: 'user-1', email: 'user@example.com' } },
    });

    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>
    );

    expect(await screen.findByText('user@example.com')).toBeInTheDocument();
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(apiClient.get).toHaveBeenCalledWith('/users/me');
  });

  it('finishes loading as a guest when no refresh cookie is available', async () => {
    refreshAccessToken.mockRejectedValue({
      response: { status: 401 },
    });

    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>
    );

    expect(await screen.findByText('guest')).toBeInTheDocument();
    expect(setAccessToken).toHaveBeenCalledWith(null);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('deduplicates session restoration when StrictMode reruns effects', async () => {
    let resolveRefresh;
    const pendingRefresh = new Promise((resolve) => {
      resolveRefresh = resolve;
    });

    refreshAccessToken.mockReturnValue(pendingRefresh);
    apiClient.get.mockResolvedValue({
      data: { data: { id: 'user-1', email: 'strict@example.com' } },
    });

    render(
      <StrictMode>
        <AuthProvider>
          <AuthState />
        </AuthProvider>
      </StrictMode>
    );

    await waitFor(() => {
      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    });

    resolveRefresh('fresh-access-token');

    expect(await screen.findByText('strict@example.com')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });
});
