import apiClient from './apiClient';

export const notificationsApi = {
  getNotifications: () => apiClient.get('/notifications'),
  getUnreadCount: () => apiClient.get('/notifications/unread-count'),
  markAsRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllAsRead: () => apiClient.post('/notifications/read-all'),
  registerDevice: (token, deviceType = 'web') => 
    apiClient.post('/notifications/devices/register', { token, deviceType }),
  unregisterDevice: (token) => 
    apiClient.post('/notifications/devices/unregister', { token }),
};
