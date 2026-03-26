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
    const backendUrl = process.env.REACT_APP_BACKEND_URL?.replace(/^https?:/, '') || '';
    const wsUrl = `${wsProtocol}${backendUrl}/api/ws/${role}`;

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setIsConnected(true);
        // Ping every 15s to keep connection alive through proxies
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
        setIsConnected(false);
        if (pingInterval.current) clearInterval(pingInterval.current);
        // Reconnect faster - 1.5s
        reconnectTimeout.current = setTimeout(connect, 1500);
      };

      ws.current.onerror = () => {
        // Force close to trigger reconnect
        if (ws.current) ws.current.close();
      };
    } catch (error) {
      reconnectTimeout.current = setTimeout(connect, 2000);
    }
  }, [role]);

  useEffect(() => {
    if (role) connect();

    return () => {
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
