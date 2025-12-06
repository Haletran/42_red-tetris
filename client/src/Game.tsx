import { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { parseRoomUser, formatRoomUser } from './lib/parseRoomUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NavLink, useLocation, useNavigate } from 'react-router';

function Game() {
  const location = useLocation();
  const navigate = useNavigate();
  const [roomInput, setRoomInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [room, setRoom] = useState('');
  const [username, setUsername] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isJoined, setIsJoined] = useState(false);

  // Parse hash on mount or hash change
  useEffect(() => {
    const hash = location.hash;
    if (hash) {
      const parsed = parseRoomUser(hash);
      if (parsed) {
        setRoom(parsed.room);
        setUsername(parsed.username);
        setRoomInput(parsed.room);
        setUsernameInput(parsed.username);
        setIsJoined(true);
      }
    }
  }, [location.hash]);

  const { isConnected, sendMessage } = useWebSocket({
    room: room || 'waiting',
    username: username || 'guest',
    onMessage: (data) => {
      console.log('Received:', data);
      setMessages((prev) => [...prev, data]);
    },
    onOpen: () => {
      console.log('WebSocket connected!');
    },
    onClose: () => {
      console.log('WebSocket disconnected!');
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    },
  });

  const handleJoin = () => {
    if (roomInput && usernameInput) {
      setRoom(roomInput);
      setUsername(usernameInput);
      setIsJoined(true);
      // Update URL hash
      navigate(`/game/play${formatRoomUser(roomInput, usernameInput)}`);
    }
  };

  const handleSendMessage = () => {
    sendMessage({
      type: 'game_action',
      action: 'move',
      data: { direction: 'left' },
    });
  };

  if (!isJoined || !room || !username) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold">Join Game</h1>
            <NavLink to="/">
              <Button variant="outline">Back</Button>
            </NavLink>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Room Name</label>
              <Input
                placeholder="my-room"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <Input
                placeholder="player1"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>

            <Button
              onClick={handleJoin}
              className="w-full"
              disabled={!roomInput || !usernameInput}
            >
              Join Room
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Format: #room_name[user_name]
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8">
      <div className="w-full max-w-4xl space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Room: {room}</h1>
            <p className="text-muted-foreground">Playing as: {username}</p>
          </div>
          <NavLink to="/">
            <Button variant="outline">Leave Room</Button>
          </NavLink>
        </div>

        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          <span className="text-muted-foreground text-sm">
            {formatRoomUser(room, username)}
          </span>
        </div>

        <Button onClick={handleSendMessage} disabled={!isConnected}>
          Send Test Message
        </Button>

        <div className="border rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
          <h2 className="font-semibold mb-2">Messages:</h2>
          {messages.length === 0 ? (
            <p className="text-muted-foreground">No messages yet...</p>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className="mb-2 p-2 bg-muted rounded">
                {JSON.stringify(msg)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Game;
