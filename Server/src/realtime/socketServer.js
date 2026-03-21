const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const { env } = require('../config/env');
const { AUTH_COOKIE } = require('../constants/auth');
const { REALTIME_EVENTS, REALTIME_ROOMS } = require('../constants/realtime');
const { verifyAccessToken } = require('../utils/authTokens');

let ioInstance = null;

const buildUserRoom = (userId) => `user:${String(userId)}`;

const parseCookies = (cookieHeader = '') => {
  const cookieMap = {};

  String(cookieHeader)
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const equalsIndex = entry.indexOf('=');
      if (equalsIndex <= 0) {
        return;
      }

      const key = decodeURIComponent(entry.slice(0, equalsIndex).trim());
      const value = decodeURIComponent(entry.slice(equalsIndex + 1).trim());
      if (key) {
        cookieMap[key] = value;
      }
    });

  return cookieMap;
};

const parseBearer = (authorizationHeader = '') => {
  const [scheme, token] = String(authorizationHeader).split(' ');
  if (String(scheme).toLowerCase() !== 'bearer') {
    return '';
  }

  return token || '';
};

const extractSocketToken = (socket) => {
  const cookieHeader = socket.handshake?.headers?.cookie || '';
  const cookies = parseCookies(cookieHeader);

  const cookieToken = cookies[AUTH_COOKIE.ACCESS_TOKEN] || '';
  const authToken = socket.handshake?.auth?.token || '';
  const bearerToken = parseBearer(socket.handshake?.headers?.authorization || '');

  return cookieToken || authToken || bearerToken;
};

const attachRedisAdapterIfConfigured = async (io) => {
  if (!env.realtimeRedisUrl) {
    return;
  }

  const pubClient = createClient({
    url: env.realtimeRedisUrl,
  });

  const subClient = pubClient.duplicate();

  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Realtime Redis adapter setup failed:', error.message);

    try {
      await pubClient.disconnect();
    } catch {
      // Ignore disconnect errors.
    }

    try {
      await subClient.disconnect();
    } catch {
      // Ignore disconnect errors.
    }
  }
};

const initSocketServer = async (httpServer) => {
  if (ioInstance || !env.realtimeEnabled) {
    return ioInstance;
  }

  const io = new Server(httpServer, {
    path: env.socketPath,
    cors: {
      origin: env.clientOrigin,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    try {
      const token = extractSocketToken(socket);

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyAccessToken(token);
      socket.data.user = {
        userId: decoded.sub,
        role: decoded.role,
        username: decoded.username,
      };

      return next();
    } catch {
      return next(new Error('Invalid or expired socket session'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data?.user?.userId;
    const userRoom = buildUserRoom(userId);

    socket.join(userRoom);
    socket.join(REALTIME_ROOMS.LEADERBOARD);

    socket.emit(REALTIME_EVENTS.CONNECTION_ACK, {
      userId,
      connectedAt: new Date().toISOString(),
      transport: socket.conn.transport.name,
    });

    socket.on('realtime.subscribe', (payload = {}) => {
      const channels = Array.isArray(payload.channels) ? payload.channels : [];

      if (channels.includes('leaderboard')) {
        socket.join(REALTIME_ROOMS.LEADERBOARD);
      }

      if (channels.includes('user_progress')) {
        socket.join(userRoom);
      }
    });

    socket.on('disconnect', () => {
      // Room cleanup is automatic.
    });
  });

  await attachRedisAdapterIfConfigured(io);

  ioInstance = io;
  return ioInstance;
};

const getSocketServer = () => ioInstance;

module.exports = {
  buildUserRoom,
  getSocketServer,
  initSocketServer,
};
