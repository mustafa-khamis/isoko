import apiClient from './apiClient';

export const authApi = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
  verifyEmail: (data) => apiClient.post('/auth/verify-email', data),
  resendVerificationCode: (data) => apiClient.post('/auth/resend-verification-code', data),
  forgotPassword: (data) => apiClient.post('/auth/forgot-password', data),
  resetPassword: (data) => apiClient.post('/auth/reset-password', data),
  logout: () => apiClient.post('/auth/logout', {}),
};

export async function continueWithGoogle(credential) {
  const response = await apiClient.post(
    "/auth/google",
    {
      credential,
      client_type: "web",
    }
  );

  return response.data;
}
