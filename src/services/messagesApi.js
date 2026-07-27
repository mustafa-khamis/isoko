import apiClient from './apiClient';

export const messagesApi = {
  getConversations: () => apiClient.get('/conversations'),
  getConversation: (id) => apiClient.get(`/conversations/${id}`),
  createConversation: (data) => apiClient.post('/conversations', data), // { listing_id, participant_id }
  getMessages: (conversationId) => apiClient.get(`/conversations/${conversationId}/messages`),
  sendMessage: (conversationId, data) => apiClient.post(`/conversations/${conversationId}/messages`, data), // { content }
  markAsRead: (conversationId) => apiClient.patch(`/conversations/${conversationId}/read`),
};
