import apiClient from './apiClient';

export const listingsApi = {
  // Returns all listings (can take query params for filtering)
  getListings: (params) => apiClient.get('/listings', { params }),
  searchListings: (params) => apiClient.get('/listings/search', { params }),
  
  // Get a single listing by ID (Public)
  getListing: (id) => apiClient.get(`/listings/${id}`),

  // Get a single listing for editing/managing (Protected, ignores status)
  getListingForManage: (id) => apiClient.get(`/listings/${id}/manage`),

  toggleFavorite: (id) => apiClient.post(`/listings/${id}/favorite`),
  
  // Create a listing (JSON)
  createListing: (data) => apiClient.post('/listings', data),

  // Upload images for a listing (multipart/form-data expected)
  uploadListingImages: (id, formData) => {
    return apiClient.post(`/listings/${id}/images`, formData);
  },

  // Update a listing
  updateListing: (id, data) => apiClient.patch(`/listings/${id}`, data),

  // Update listing status (e.g. active, hidden, sold)
  updateStatus: (id, status) => apiClient.patch(`/listings/${id}/status`, { status }),

  // Delete a listing
  deleteListing: (id) => apiClient.delete(`/listings/${id}`),

  // Delete a single image from a listing
  deleteListingImage: (listingId, imageId) => apiClient.delete(`/listings/${listingId}/images/${imageId}`),
  
  // Favorites
  getFavorites: () => apiClient.get('/favorites'),
  addFavorite: (id) => apiClient.post(`/favorites/${id}`),
  removeFavorite: (id) => apiClient.delete(`/favorites/${id}`),
};
