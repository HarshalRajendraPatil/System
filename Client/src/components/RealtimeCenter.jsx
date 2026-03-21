import { useEffect, useState } from 'react';
import {
  REALTIME_EVENTS,
  REALTIME_LOCAL_EVENT,
} from '../constants/realtime';
import {
  connectSocket,
  disconnectSocket,
  getSocketClient,
  subscribeSocketEvent,
} from '../realtime/socketClient';

const dispatchRealtime = (eventName, payload) => {
  window.dispatchEvent(
    new CustomEvent(REALTIME_LOCAL_EVENT, {
      detail: {
        event: eventName,
        payload,
      },
    }),
  );
};

function RealtimeCenter({ onProgressUpdated, onLeaderboardUpdated, onDomainUpdated }) {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState('Connecting...');

  useEffect(() => {
    const socket = connectSocket();

    const handleConnect = () => {
      setConnected(true);
      setLastMessage('Connected for live sync');
      socket.emit('realtime.subscribe', {
        channels: ['user_progress', 'leaderboard'],
      });
    };

    const handleDisconnect = () => {
      setConnected(false);
      setLastMessage('Disconnected. Reconnecting...');
    };

    const handleConnectError = (error) => {
      setConnected(false);
      setLastMessage(error?.message || 'Connection error');
      dispatchRealtime(REALTIME_EVENTS.CONNECTION_ERROR, {
        message: error?.message || 'Connection error',
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const currentSocket = getSocketClient();
        if (!currentSocket.connected) {
          setLastMessage('Resuming live sync...');
          connectSocket();
        }
      }
    };

    const cleanups = [
      subscribeSocketEvent('connect', handleConnect),
      subscribeSocketEvent('disconnect', handleDisconnect),
      subscribeSocketEvent('connect_error', handleConnectError),
      subscribeSocketEvent(REALTIME_EVENTS.CONNECTION_ACK, (payload) => {
        setLastMessage('Live sync active');
        dispatchRealtime(REALTIME_EVENTS.CONNECTION_ACK, payload);
      }),
      subscribeSocketEvent(REALTIME_EVENTS.USER_PROGRESS_UPDATED, (payload) => {
        onProgressUpdated?.(payload);
        dispatchRealtime(REALTIME_EVENTS.USER_PROGRESS_UPDATED, payload);
      }),
      subscribeSocketEvent(REALTIME_EVENTS.LEADERBOARD_UPDATED, (payload) => {
        onLeaderboardUpdated?.(payload);
        dispatchRealtime(REALTIME_EVENTS.LEADERBOARD_UPDATED, payload);
      }),
      subscribeSocketEvent(REALTIME_EVENTS.DOMAIN_UPDATED, (payload) => {
        onDomainUpdated?.(payload);
        dispatchRealtime(REALTIME_EVENTS.DOMAIN_UPDATED, payload);
      }),
    ];

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cleanups.forEach((dispose) => dispose());
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      disconnectSocket();
    };
  }, [onDomainUpdated, onLeaderboardUpdated, onProgressUpdated]);

  return (
    <aside className={`realtime-center ${connected ? 'online' : 'offline'}`}>
      <span className="realtime-dot" />
      <div>
        <strong>{connected ? 'Live Sync On' : 'Live Sync Off'}</strong>
        <p>{lastMessage}</p>
      </div>
    </aside>
  );
}

export default RealtimeCenter;
