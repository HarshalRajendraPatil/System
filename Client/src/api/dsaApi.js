import apiClient from './client';

export const createDSAProblem = (payload) => apiClient.post('/dsa/problems', payload);

export const getDSAProblems = (filters = {}) =>
  apiClient.get('/dsa/problems', {
    params: filters,
  });

export const getDSAStats = (filters = {}) =>
  apiClient.get('/dsa/stats', {
    params: filters,
  });

export const updateDSAProblem = (id, payload) => apiClient.put(`/dsa/problems/${id}`, payload);

export const deleteDSAProblem = (id) => apiClient.delete(`/dsa/problems/${id}`);
