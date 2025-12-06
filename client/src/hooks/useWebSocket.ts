import { useEffect, useRef, useState } from 'react';

interface UseWebSocketProps {
  room: string;
  username: string;
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

export const useWebSocket = ({ room, username, onMessage, onOpen, onClose, onError }: UseWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const usernameRef = useRef(username);

  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  useEffect(() => {
    // Connect to Elysia WebSocket server
    const ws = new WebSocket(`ws://localhost:3000/game/${room}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`Connected to room: ${room} as ${usernameRef.current}`);
      setIsConnected(true);

      // Send initial message with username
      ws.send(JSON.stringify({
        message: JSON.stringify({
          type: 'join',
          username: usernameRef.current,
          room: room
        })
      }));

      onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      onError?.(error);
    };

    ws.onclose = () => {
      console.log(`Disconnected from room: ${room}`);
      setIsConnected(false);
      onClose?.();
    };

    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [room]);

  const sendMessage = (data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const payload = {
        ...data,
        username: usernameRef.current,
      };
      wsRef.current.send(JSON.stringify({ message: JSON.stringify(payload) }));
    } else {
      console.warn('WebSocket is not connected');
    }
  };

  return { isConnected, sendMessage, username: usernameRef.current };
};
