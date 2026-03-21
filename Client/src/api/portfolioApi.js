import apiClient from './client';

export const getMyPortfolio = () => apiClient.get('/portfolio/me');

export const updateMyPortfolioSettings = (payload) => apiClient.patch('/portfolio/settings', payload);

export const getPortfolioExportPayload = () => apiClient.get('/portfolio/export');

export const getPublicPortfolioBySlug = (slug) =>
  apiClient.get(`/portfolio/public/${encodeURIComponent(String(slug || '').trim())}`);
