import apiClient from './client';

export const getAchievements = () => apiClient.get('/rpg/achievements');
