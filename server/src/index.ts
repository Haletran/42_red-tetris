import { Elysia } from "elysia";

interface Player {
  id: string;
  name: string;
  isCreator: boolean;
}

interface Room {
  id: number;
  name: string;
  isVacant: boolean;
  players: Map<string, Player>;
  gameState: "waiting" | "playing" | "finished";
  creatorId: string | null;
}

const numberOfPlayer = 2;
const rooms: Map<string, Room> = new Map();
const connections = new Map<string, { roomId: string; playerId: string }>();

function joinRoom(player_id: string, room_name: string, player_name: string) {
  const room = rooms.get(room_name);
  console.log(room);
  if (room) {
    if (room.gameState != "waiting" || room.isVacant == false) {
      console.log("The room is already full");
      return null;
    }
    const player: Player = {
      id: player_id,
      name: player_name,
      isCreator: false,
    };
    room.players.set(player_name, player);
    room.isVacant = room.players.size < numberOfPlayer;
    connections.set(player_id, { roomId: room_name, playerId: player_name });
    return room;
  } else {
    const creator: Player = {
      id: player_id,
      name: player_name,
      isCreator: true,
    };

    const room: Room = {
      id: rooms.size + 1,
      name: room_name,
      isVacant: true,
      players: new Map([[player_name, creator]]),
      gameState: "waiting",
      creatorId: player_name,
    };

    rooms.set(room_name, room);
    connections.set(player_id, { roomId: room_name, playerId: player_name });
    return room;
  }
}

function leaveRoom(ws_id: string) {
  const conn = connections.get(ws_id);
  const roomId = conn?.roomId;
  const playerId = conn?.playerId;
  const room = rooms.get(roomId);

  if (!room) {
    console.log("⚠️ Room not found");
    return null;
  }

  const wasCreator = room.creatorId === playerId;

  room.players.delete(playerId);
  console.log(`👋 ${playerId} left room ${roomId}`);

  if (wasCreator && room.players.size > 0) {
    const newCreatorId = Array.from(room.players.keys())[0];
    const newCreator = room.players.get(newCreatorId);

    if (newCreator) {
      newCreator.isCreator = true;
      room.creatorId = newCreatorId;
      console.log(`👑 ${newCreatorId} is now the creator of ${roomId}`);
    }
  }

  room.isVacant = room.players.size < 4;

  if (room.players.size === 0) {
    rooms.delete(roomId);
    console.log(`🗑️ Room ${roomId} deleted (empty)`);
  }

  connections.delete(ws_id);
  return {
    roomId: roomId,
    playerId: playerId,
    remainingPlayers: room.players.size,
  };
}

const app = new Elysia()
  .get("/", () => "Red Tetris")
  .ws("/ws", {
    open(ws) {
      console.log("✅ WebSocket connection opened", ws.id);
    },
    message(ws, message: any) {
      const data = typeof message === "string" ? JSON.parse(message) : message;
      console.log("📨 Received:", data);

      switch (data.command) {
        case "JOIN":
          const room = joinRoom(ws.id, data.room, data.username);
          if (room) {
            console.log("✅ Room joined:", room);
            ws.send(
              JSON.stringify({
                command: "JOINED",
                room: room.name,
                players: Array.from(room.players.values()),
              }),
            );
          } else {
            console.log("❌ Failed to join room");
            ws.send(
              JSON.stringify({
                command: "ERROR",
                message: "Room is full or game already started",
              }),
            );
          }
          break;
        case "LEAVE":
          leaveRoom(ws.id);
          break;
      }
    },
    close(ws) {
      console.log("❌ WebSocket connection closed", ws.id);
      leaveRoom(ws.id);
    },
  });

app.listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
