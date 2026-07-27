import apiClient from './apiClient';

export const locationsApi = {
  getProvinces: () => apiClient.get('/locations/provinces'),
  getCities: (params) => apiClient.get('/locations/cities', { params }), // e.g. ?province_id=123
};
