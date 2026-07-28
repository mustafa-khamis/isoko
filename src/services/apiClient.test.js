import { beforeEach, describe, expect, it, vi } from 'vitest';

const axiosMocks = vi.hoisted(() => {
  const instance = vi.fn();
  const handlers = {};
  instance.interceptors = {
    request: {
      use: vi.fn((onFulfilled) => {
        handlers.request = onFulfilled;
      }),
    },
    response: {
      use: vi.fn((onFulfilled, onRejected) => {
        handlers.response = onFulfilled;
        handlers.responseError = onRejected;
      }),
    },
  };

  return {
    handlers,
    instance,
    post: vi.fn(),
  };
});

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => axiosMocks.instance),
    post: axiosMocks.post,
  },
}));

import {
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
  startAuthSession,
} from './apiClient';

describe('refreshAccessToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAccessToken(null);
  });

  it('shares one cookie-backed request across concurrent refreshes', async () => {
    let resolveRefresh;
    const response = new Promise((resolve) => {
      resolveRefresh = resolve;
    });
    axiosMocks.post.mockReturnValue(response);

    const firstRefresh = refreshAccessToken();
    const secondRefresh = refreshAccessToken();

    expect(firstRefresh).toBe(secondRefresh);
    expect(axiosMocks.post).toHaveBeenCalledTimes(1);
    expect(axiosMocks.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/refresh$/),
      {},
      { withCredentials: true }
    );

    resolveRefresh({
      data: { data: { accessToken: 'fresh-access-token' } },
    });

    await expect(firstRefresh).resolves.toBe('fresh-access-token');
    await expect(secondRefresh).resolves.toBe('fresh-access-token');
    expect(getAccessToken()).toBe('fresh-access-token');
  });

  it('retries a refresh that overlaps cookie rotation in another tab', async () => {
    axiosMocks.post
      .mockRejectedValueOnce({
        response: {
          status: 409,
          data: { error_code: 'AUTH_REFRESH_TOKEN_CONCURRENT' },
        },
      })
      .mockResolvedValueOnce({
        data: { data: { accessToken: 'fresh-access-token' } },
      });

    await expect(refreshAccessToken()).resolves.toBe('fresh-access-token');
    expect(axiosMocks.post).toHaveBeenCalledTimes(2);
    expect(getAccessToken()).toBe('fresh-access-token');
  });

  it('does not replay an old user request after the login session changes', async () => {
    let resolveRefresh;
    axiosMocks.post.mockReturnValue(new Promise((resolve) => {
      resolveRefresh = resolve;
    }));

    startAuthSession('user-a-token');
    const originalRequest = axiosMocks.handlers.request({
      headers: {},
      url: '/users/me',
    });
    const originalError = {
      config: originalRequest,
      response: { status: 401 },
    };
    const retryResult = axiosMocks.handlers.responseError(originalError);

    expect(axiosMocks.post).toHaveBeenCalledTimes(1);

    startAuthSession('user-b-token');
    resolveRefresh({
      data: { data: { accessToken: 'late-user-a-token' } },
    });

    await expect(retryResult).rejects.toBe(originalError);
    expect(getAccessToken()).toBe('user-b-token');
    expect(axiosMocks.instance).not.toHaveBeenCalled();
  });

  it('retries JSON requests with the original object body after refresh', async () => {
    startAuthSession('stale-token');
    axiosMocks.post.mockResolvedValue({
      data: { data: { accessToken: 'fresh-token' } },
    });
    axiosMocks.instance.mockResolvedValue({ data: { ok: true } });

    const body = { title: 'Phone', price: 0, negotiable: false };
    const originalRequest = axiosMocks.handlers.request({
      headers: { 'Content-Type': 'application/json' },
      method: 'post',
      url: '/listings',
      data: body,
    });
    originalRequest.data = JSON.stringify(body);

    await axiosMocks.handlers.responseError({
      config: originalRequest,
      response: { status: 401 },
    });

    expect(axiosMocks.instance).toHaveBeenCalledWith(expect.objectContaining({
      data: body,
      method: 'post',
      url: '/listings',
    }));
  });

  it('does not retry validation or forbidden responses', async () => {
    startAuthSession('token');

    await expect(axiosMocks.handlers.responseError({
      config: { headers: {}, url: '/listings' },
      response: { status: 422 },
    })).rejects.toMatchObject({ response: { status: 422 } });

    await expect(axiosMocks.handlers.responseError({
      config: { headers: {}, url: '/listings' },
      response: { status: 403 },
    })).rejects.toMatchObject({ response: { status: 403 } });

    expect(axiosMocks.post).not.toHaveBeenCalled();
    expect(axiosMocks.instance).not.toHaveBeenCalled();
  });

  it('keeps FormData as FormData when a request is retried', async () => {
    startAuthSession('stale-token');
    axiosMocks.post.mockResolvedValue({
      data: { data: { accessToken: 'fresh-token' } },
    });
    axiosMocks.instance.mockResolvedValue({ data: { ok: true } });

    const formData = new FormData();
    formData.append('images', new Blob(['image-bytes']), 'image.jpg');
    const originalRequest = axiosMocks.handlers.request({
      headers: { 'Content-Type': 'multipart/form-data' },
      method: 'post',
      url: '/listings/id/images',
      data: formData,
    });

    await axiosMocks.handlers.responseError({
      config: originalRequest,
      response: { status: 401 },
    });

    const retriedRequest = axiosMocks.instance.mock.calls[0][0];
    expect(retriedRequest.data).toBe(formData);
    expect(retriedRequest.headers['Content-Type']).toBeUndefined();
  });
});
