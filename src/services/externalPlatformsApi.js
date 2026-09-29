import apiClient from './apiClient';

export const externalPlatformsApi = {
  getPlatforms: () => apiClient.get('/external-platforms'),
};
