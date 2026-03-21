import apiClient from './client';

export const createLLDHLDDesign = (payload) => apiClient.post('/lld-hld', payload);

export const getLLDHLDDesigns = (filters = {}) =>
  apiClient.get('/lld-hld', {
    params: filters,
  });

export const getLLDHLDDesignById = (id) => apiClient.get(`/lld-hld/${id}`);

export const updateLLDHLDDesign = (id, payload) => apiClient.put(`/lld-hld/${id}`, payload);

export const toggleLLDHLDCompletion = (id) => apiClient.patch(`/lld-hld/${id}/completion`);

export const deleteLLDHLDDesign = (id) => apiClient.delete(`/lld-hld/${id}`);

export const getLLDHLDStats = (filters = {}) =>
  apiClient.get('/lld-hld/stats', {
    params: filters,
  });

export const getLLDHLDTags = () => apiClient.get('/lld-hld/tags');
