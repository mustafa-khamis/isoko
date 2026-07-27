import apiClient from './apiClient';

export const categoriesApi = {
  getCategories: () => apiClient.get('/categories'),
  getCategory: (id) => apiClient.get(`/categories/${id}`),
  getSubcategories: (id) => apiClient.get(`/categories/${id}/subcategories`),
};
