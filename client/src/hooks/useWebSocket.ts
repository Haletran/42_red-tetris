import { useState, useEffect, useCallback, useRef } from 'react';

export type GameCommand =
  | 'JOIN'
  | 'LEAVE'
  | 'START'
  | 'MOVE_LEFT'
  | 'MOVE_RIGHT'
  | 'MOVE_DOWN'
  | 'ROTATE'
  | 'DROP';

export interface WebSocketMessage {
  command: string;
  [key: string]: any;
}

interface UseWebSocketProps {
  url: string;
  onMessage?: (data: WebSocketMessage) => void;
}

export const useWebSocket = ({ url, onMessage }: UseWebSocketProps) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    const websocket = new WebSocket(url);

    websocket.onopen = () => {
      console.log('Connected to WebSocket');
      setIsConnected(true);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Message from server:', data);
        setMessages(prev => [...prev, data]);
        onMessage?.(data);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    websocket.onclose = () => {
      console.log('Disconnected from WebSocket');
      setIsConnected(false);
      setWs(null);

      // Auto-reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Attempting to reconnect...');
        connect();
      }, 3000);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(websocket);
  }, [url, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (ws) {
      ws.close();
      setWs(null);
    }
  }, [ws]);

  const sendCommand = useCallback((command: GameCommand, data?: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = { command, ...data };
      ws.send(JSON.stringify(message));
      console.log('Sent command:', message);
    } else {
      console.warn('WebSocket is not ready. Current state:', ws?.readyState);
    }
  }, [ws]);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws) {
        ws.close();
      }
    };
  }, []);

  return {
    isConnected,
    messages,
    sendCommand,
    disconnect,
    reconnect: connect,
  };
};
