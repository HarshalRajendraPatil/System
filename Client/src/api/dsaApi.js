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

export const getLeetCodeSettings = () => apiClient.get('/dsa/leetcode/settings');

export const updateLeetCodeSettings = (payload) => apiClient.put('/dsa/leetcode/settings', payload);

export const syncLeetCodeSubmissions = () => apiClient.post('/dsa/leetcode/sync');

export const getDSAAnalytics = () => apiClient.get('/dsa/analytics');
