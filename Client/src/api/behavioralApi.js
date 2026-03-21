import apiClient from './client';

export const getBehavioralStories = (filters = {}) =>
  apiClient.get('/behavioral/stories', {
    params: filters,
  });

export const getBehavioralStory = (id) => apiClient.get(`/behavioral/stories/${id}`);

export const createBehavioralStory = (payload) =>
  apiClient.post('/behavioral/stories', payload);

export const updateBehavioralStory = (id, payload) =>
  apiClient.put(`/behavioral/stories/${id}`, payload);

export const deleteBehavioralStory = (id) =>
  apiClient.delete(`/behavioral/stories/${id}`);

export const getBehavioralRandomPractice = (filters = {}) =>
  apiClient.get('/behavioral/practice/random', {
    params: filters,
  });

export const logBehavioralPractice = (id, payload) =>
  apiClient.post(`/behavioral/stories/${id}/practice`, payload);

export const getBehavioralAnalyticsOverview = () =>
  apiClient.get('/behavioral/analytics/overview');
