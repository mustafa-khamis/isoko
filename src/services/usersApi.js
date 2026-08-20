import apiClient from './apiClient';

export const usersApi = {
  getMe: () => apiClient.get('/users/me'),
  updateProfile: (data) => apiClient.patch('/users/me', data),
  uploadAvatar: (formData) => apiClient.post('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteAvatar: () => apiClient.delete('/users/me/avatar'),
  updateContactPreferences: (data) => apiClient.patch('/users/me/contact-preferences', data),
  getSellingUsage: () => apiClient.get('/users/me/selling-usage'),
  getUserPublic: (userId) => apiClient.get(`/users/${userId}/public`),
  getUserListings: (userId) => apiClient.get(`/users/${userId}/listings`),
  getMyListings: (params) => apiClient.get('/users/me/listings', { params }),
  getFavorites: () => apiClient.get('/users/me/favorites'),
  deleteAccount: () => apiClient.delete('/users/me'),
  followUser: (userId) => apiClient.post(`/users/${userId}/follow`),
  unfollowUser: (userId) => apiClient.delete(`/users/${userId}/follow`),
  getFollowerCount: (userId) => apiClient.get(`/users/${userId}/followers-count`),
  isFollowing: (userId) => apiClient.get(`/users/${userId}/is-following`),
};
