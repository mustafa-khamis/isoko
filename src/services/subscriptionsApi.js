import apiClient from './apiClient';

export const subscriptionsApi = {
  getPlans: () => apiClient.get('/subscriptions/plans'),
  getMySubscription: () => apiClient.get('/subscriptions/my'),
  subscribe: (planId, paymentMethod) =>
    apiClient.post('/subscriptions/subscribe', { plan_id: planId, payment_method: paymentMethod }),
};
