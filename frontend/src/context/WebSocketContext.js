import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { playOrderSound } from '@/utils/notifications';

const WebSocketContext = createContext(null);

export function useWebSocket() {
  return useContext(WebSocketContext);
}

export function WebSocketProvider({ children, role }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const pingInterval = useRef(null);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use REACT_APP_BACKEND_URL if set, otherwise fall back to current page host
    const envUrl = process.env.REACT_APP_BACKEND_URL;
    let wsHost;
    if (envUrl && envUrl.length > 1) {
      wsHost = envUrl.replace(/^https?:\/\//, '');
    } else {
      wsHost = window.location.host;
    }
    const wsUrl = `${wsProtocol}//${wsHost}/api/ws/${role}`;
    console.log('[WS] Connecting to:', wsUrl);

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('[WS] Connected');
        setIsConnected(true);
        if (pingInterval.current) clearInterval(pingInterval.current);
        pingInterval.current = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send('ping');
          }
        }, 15000);
      };

      ws.current.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
          
          if (message.type === 'new_order' && role === 'kitchen') {
            playOrderSound();
          } else if (message.type === 'order_ready' && role === 'waiter') {
            playOrderSound();
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.current.onclose = () => {
        console.log('[WS] Disconnected, reconnecting...');
        setIsConnected(false);
        if (pingInterval.current) clearInterval(pingInterval.current);
        reconnectTimeout.current = setTimeout(connect, 1500);
      };

      ws.current.onerror = (err) => {
        console.error('[WS] Error:', err);
        if (ws.current) ws.current.close();
      };
    } catch (error) {
      console.error('[WS] Connection failed:', error);
      reconnectTimeout.current = setTimeout(connect, 2000);
    }
  }, [role]);

  useEffect(() => {
    if (role) connect();

    // Reconnect when app comes back from background (Capacitor)
    const handleResume = () => {
      console.log('[WS] App resumed, reconnecting...');
      if (ws.current?.readyState !== WebSocket.OPEN) {
        connect();
      }
    };
    window.addEventListener('capacitor-resume', handleResume);

    return () => {
      window.removeEventListener('capacitor-resume', handleResume);
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (pingInterval.current) clearInterval(pingInterval.current);
      if (ws.current) ws.current.close();
    };
  }, [role, connect]);

  return (
    <WebSocketContext.Provider value={{ isConnected, lastMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
}
