import apiClient from './client';

export const getProjectsKanban = (filters = {}) =>
  apiClient.get('/projects/kanban', {
    params: filters,
  });

export const getProjectMetrics = () => apiClient.get('/projects/metrics');

export const getProjectById = (id) => apiClient.get(`/projects/${id}`);

export const createProject = (payload) => apiClient.post('/projects', payload);

export const updateProject = (id, payload) => apiClient.put(`/projects/${id}`, payload);

export const moveProjectStatus = (id, payload) => apiClient.patch(`/projects/${id}/move`, payload);

export const deleteProject = (id) => apiClient.delete(`/projects/${id}`);
