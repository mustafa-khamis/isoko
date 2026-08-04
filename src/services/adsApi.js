import apiClient from './apiClient';

export const adsApi = {
  getSponsoredAds: () => apiClient.get('/ads/sponsored'),
  getMySponsoredAds: () => apiClient.get('/ads/sponsored/my'),
  createSponsoredAd: (formData) => {
    return apiClient.post('/ads/sponsored', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};
