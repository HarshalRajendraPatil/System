import apiClient from './client';

export const getDashboard = (dateKey) => {
  const params = {};

  if (dateKey) {
    params.dateKey = dateKey;
  }

  return apiClient.get('/rpg/dashboard', { params });
};

export const getAchievements = () => apiClient.get('/rpg/achievements');

export const getGlobalLeaderboard = (limit = 50) =>
  apiClient.get('/rpg/leaderboard/global', {
    params: { limit },
  });

export const updateDailyQuest = (payload) => apiClient.put('/rpg/daily-quest', payload);

export const getDailyQuestHistory = () => apiClient.get('/rpg/daily-quest/history');

export const getQuestDetail = (dateKey) =>
  apiClient.get('/rpg/daily-quest/detail', {
    params: { dateKey },
  });

export const getQuestXpOverview = (dateKey) =>
  apiClient.get('/rpg/daily-quest/xp-overview', {
    params: { dateKey },
  });
