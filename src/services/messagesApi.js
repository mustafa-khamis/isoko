import apiClient from './apiClient';

export const messagesApi = {
  getConversations: () => apiClient.get('/chat'),
  getConversation: (id) => apiClient.get(`/chat/${id}/info`),
  createConversation: (listingId, data) => apiClient.post(`/chat/${listingId}`, data), // { message }
  getMessages: (conversationId) => apiClient.get(`/chat/${conversationId}`),
  sendMessage: (conversationId, data) => apiClient.post(`/chat/${conversationId}/messages`, data), // { content }
  markAsRead: (conversationId) => apiClient.patch(`/chat/${conversationId}/read`),
  getUnreadCount: () => apiClient.get('/chat/unread-count'),
};
