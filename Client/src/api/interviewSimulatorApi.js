import apiClient from './client';

export const startInterviewSimulation = (payload) =>
  apiClient.post('/interview-simulator/start', payload);

export const answerInterviewSimulation = (simulationId, payload) =>
  apiClient.post(`/interview-simulator/${encodeURIComponent(simulationId)}/answer`, payload);

export const getInterviewSimulationHistory = (limit = 20) =>
  apiClient.get('/interview-simulator/history', {
    params: { limit },
  });

export const getInterviewSimulationById = (simulationId) =>
  apiClient.get(`/interview-simulator/${encodeURIComponent(simulationId)}`);
