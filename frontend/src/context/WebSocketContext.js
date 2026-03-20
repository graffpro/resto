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

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const backendUrl = process.env.REACT_APP_BACKEND_URL?.replace(/^https?:/, '') || '';
    const wsUrl = `${wsProtocol}${backendUrl}/ws/${role}`;

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        // Start ping interval
        const pingInterval = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send('ping');
          }
        }, 30000);
        ws.current.pingInterval = pingInterval;
      };

      ws.current.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
          
          // Play sound for new orders and ready orders
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
        console.log('WebSocket disconnected');
        setIsConnected(false);
        if (ws.current?.pingInterval) {
          clearInterval(ws.current.pingInterval);
        }
        // Reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(connect, 3000);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [role]);

  useEffect(() => {
    if (role) {
      connect();
    }

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current?.pingInterval) {
        clearInterval(ws.current.pingInterval);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [role, connect]);

  return (
    <WebSocketContext.Provider value={{ isConnected, lastMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
}
