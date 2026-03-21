import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';
const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || '/socket.io';

const resolveSocketOrigin = () => {
  try {
    const parsed = new URL(API_BASE_URL);
    return parsed.origin;
  } catch {
    return 'http://localhost:4000';
  }
};

let socketInstance = null;

export const getSocketClient = () => {
  if (!socketInstance) {
    socketInstance = io(resolveSocketOrigin(), {
      path: SOCKET_PATH,
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 700,
      reconnectionDelayMax: 6000,
      timeout: 10000,
    });
  }

  return socketInstance;
};

export const connectSocket = () => {
  const socket = getSocketClient();
  if (!socket.active) {
    socket.connect();
  }

  return socket;
};

export const disconnectSocket = () => {
  const socket = getSocketClient();
  if (socket.active) {
    socket.disconnect();
  }
};

export const subscribeSocketEvent = (eventName, handler) => {
  const socket = getSocketClient();
  socket.on(eventName, handler);

  return () => {
    socket.off(eventName, handler);
  };
};
