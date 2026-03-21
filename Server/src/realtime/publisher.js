const {
  REALTIME_ACTIONS,
  REALTIME_DOMAINS,
  REALTIME_EVENTS,
  REALTIME_ROOMS,
} = require('../constants/realtime');
const { buildUserRoom, getSocketServer } = require('./socketServer');

const emitUserEvent = (userId, eventName, payload = {}) => {
  const io = getSocketServer();
  if (!io || !userId) {
    return;
  }

  io.to(buildUserRoom(userId)).emit(eventName, {
    ...payload,
    emittedAt: new Date().toISOString(),
  });
};

const emitLeaderboardEvent = (payload = {}) => {
  const io = getSocketServer();
  if (!io) {
    return;
  }

  io.to(REALTIME_ROOMS.LEADERBOARD).emit(REALTIME_EVENTS.LEADERBOARD_UPDATED, {
    ...payload,
    emittedAt: new Date().toISOString(),
  });
};

const publishUserProgressUpdate = (userId, payload = {}) => {
  emitUserEvent(userId, REALTIME_EVENTS.USER_PROGRESS_UPDATED, payload);
};

const publishDomainUpdate = (userId, payload = {}) => {
  emitUserEvent(userId, REALTIME_EVENTS.DOMAIN_UPDATED, {
    domain: payload.domain || REALTIME_DOMAINS.RPG,
    action: payload.action || REALTIME_ACTIONS.UPDATED,
    message: payload.message || '',
    metadata: payload.metadata || {},
  });
};

module.exports = {
  emitLeaderboardEvent,
  publishDomainUpdate,
  publishUserProgressUpdate,
};
