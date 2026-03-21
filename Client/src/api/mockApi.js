import apiClient from './client';

export const getMockLogs = (filters = {}) =>
  apiClient.get('/mocks/logs', {
    params: filters,
  });

export const createMockLog = (payload) => apiClient.post('/mocks/logs', payload);

export const updateMockLog = (id, payload) => apiClient.put(`/mocks/logs/${id}`, payload);

export const deleteMockLog = (id) => apiClient.delete(`/mocks/logs/${id}`);

export const getMockCalendar = (month) =>
  apiClient.get('/mocks/calendar', {
    params: { month },
  });

export const getMockTrends = (rangeDays = 90) =>
  apiClient.get('/mocks/trends', {
    params: { rangeDays },
  });
