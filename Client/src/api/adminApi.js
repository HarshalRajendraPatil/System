import apiClient from './client';

export const getAdminOverview = (params = {}) =>
  apiClient.get('/admin/overview', {
    params,
  });

export const getAdminUsers = (params = {}) =>
  apiClient.get('/admin/users', {
    params,
  });

export const updateAdminUser = (userId, payload) =>
  apiClient.patch(`/admin/users/${userId}`, payload);

export const deleteAdminUser = (userId) =>
  apiClient.delete(`/admin/users/${userId}`);

export const getAdminRecentActivity = (params = {}) =>
  apiClient.get('/admin/activity/recent', {
    params,
  });
