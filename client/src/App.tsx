import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { NavLink } from "react-router";
import { parseRoomUser } from "@/lib/parseRoomUser";

function App() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [roomInfo, setRoomInfo] = useState<{ room: string; username: string } | null>(null);

  const connect = (room?: string, username?: string) => {
    const websocket = new WebSocket("ws://localhost:3000/ws");

    websocket.onopen = () => {
      console.log("Connected to WebSocket");
      setIsConnected(true);
      setMessages((prev) => [...prev, "✅ Connected to server"]);

      // Auto-send JOIN if room and username provided
      if (room && username) {
        const joinMessage = {
          command: "JOIN",
          room: room,
          username: username,
        };
        websocket.send(JSON.stringify(joinMessage));
        console.log("Sent JOIN:", joinMessage);
        setMessages((prev) => [...prev, `📤 Joining room: ${room} as ${username}`]);
      }
    };

    websocket.onmessage = (event) => {
      console.log("Message from server:", event.data);
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [...prev, `📥 ${data.command}: ${JSON.stringify(data)}`]);
      } catch {
        setMessages((prev) => [...prev, `📥 Server: ${event.data}`]);
      }
    };

    websocket.onclose = () => {
      console.log("Disconnected from WebSocket");
      setIsConnected(false);
      setMessages((prev) => [...prev, "❌ Disconnected from server"]);
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setMessages((prev) => [...prev, "⚠️ Error occurred"]);
    };

    setWs(websocket);
  };

  const disconnect = () => {
    if (ws) {
      // Send LEAVE command before closing
      if (isConnected) {
        ws.send(JSON.stringify({ command: "LEAVE" }));
      }
      ws.close();
      setWs(null);
    }
  };

  const sendMessage = () => {
    if (ws && isConnected && roomInfo) {
      const message = {
        command: "JOIN",
        room: roomInfo.room,
        username: roomInfo.username,
      };
      ws.send(JSON.stringify(message));
      setMessages((prev) => [...prev, `📤 Sent: ${JSON.stringify(message)}`]);
    }
  };

  // Parse URL hash on mount and when hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      console.log("Hash changed:", hash);

      if (hash) {
        const parsed = parseRoomUser(hash);
        if (parsed) {
          console.log("Parsed room info:", parsed);
          setRoomInfo(parsed);
          setMessages((prev) => [...prev, `🔗 URL parsed: ${parsed.room}[${parsed.username}]`]);

          // Auto-connect if not already connected
          if (!ws) {
            connect(parsed.room, parsed.username);
          }
        } else {
          setMessages((prev) => [...prev, "⚠️ Invalid URL format. Use: #room_name[username]"]);
        }
      }
    };

    // Check hash on mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      if (ws) {
        ws.close();
      }
    };
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Red Tetris - WebSocket Test</h1>
      <div style={{ marginBottom: "20px" }}>
        <p>Status: {isConnected ? "🟢 Connected" : "🔴 Disconnected"}</p>
        {roomInfo && (
          <p>
            Room: <strong>{roomInfo.room}</strong> | User: <strong>{roomInfo.username}</strong>
          </p>
        )}
        {!roomInfo && (
          <p style={{ color: "#666" }}>
            Navigate to: <code>http://localhost:5173/#roomname[username]</code>
          </p>
        )}
        <Button
          onClick={() => connect()}
          disabled={isConnected}
          style={{ marginRight: "10px" }}
        >
          Connect
        </Button>
        <Button
          onClick={disconnect}
          disabled={!isConnected}
          style={{ marginRight: "10px" }}
        >
          Disconnect
        </Button>
        <Button onClick={sendMessage} disabled={!isConnected || !roomInfo}>
          Send JOIN Again
        </Button>
      </div>
      <div
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          maxHeight: "300px",
          overflowY: "auto",
        }}
      >
        <h3>Messages:</h3>
        {messages.map((msg, index) => (
          <div key={index}>{msg}</div>
        ))}
      </div>
    </div>
  );
}

export default App;
