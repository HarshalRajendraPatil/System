const REALTIME_EVENTS = {
  CONNECTION_ACK: 'realtime.connection.ack',
  CONNECTION_ERROR: 'realtime.connection.error',
  USER_PROGRESS_UPDATED: 'realtime.user.progress.updated',
  LEADERBOARD_UPDATED: 'realtime.leaderboard.updated',
  DOMAIN_UPDATED: 'realtime.domain.updated',
};

const REALTIME_DOMAINS = {
  RPG: 'rpg',
  DSA: 'dsa',
  LLD_HLD: 'lld_hld',
  PROJECTS: 'projects',
  MOCKS: 'mocks',
  BEHAVIORAL: 'behavioral',
  AI: 'ai',
};

const REALTIME_ROOMS = {
  LEADERBOARD: 'global:leaderboard',
};

const REALTIME_ACTIONS = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  MOVED: 'moved',
  PRACTICED: 'practiced',
  GENERATED: 'generated',
  BULK_REFRESH: 'bulk_refresh',
};

module.exports = {
  REALTIME_ACTIONS,
  REALTIME_DOMAINS,
  REALTIME_EVENTS,
  REALTIME_ROOMS,
};
