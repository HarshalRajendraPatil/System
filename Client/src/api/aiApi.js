import apiClient from './client';

export const getAiInsightHistory = (params = {}) =>
  apiClient.get('/ai/history', {
    params,
  });

export const deleteAiInsightHistoryItem = (id) => apiClient.delete(`/ai/history/${id}`);

export const getLatestAiInsight = (params = {}) =>
  apiClient.get('/ai/latest', {
    params,
  });

export const getAiSnapshot = () => apiClient.get('/ai/snapshot');

export const generateAiCoachReport = (payload) =>
  apiClient.post('/ai/coach/report', payload);

export const generateAiMotivation = (payload) =>
  apiClient.post('/ai/coach/motivation', payload);
