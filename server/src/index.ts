import { Elysia } from "elysia";

interface Player {
  id: string;
  name: string;
  isCreator: boolean;
  isWinner: boolean;
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
      isWinner: false,
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
      isWinner: false,
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

            // Subscribe this connection to the room
            ws.subscribe(`room:${room.name}`);

            // Broadcast to all players in the room
            ws.publish(
              `room:${room.name}`,
              JSON.stringify({
                command: "ROOM_UPDATE",
                room: room.name,
                players: Array.from(room.players.values()),
                playerCount: room.players.size,
                canStart: room.players.size === numberOfPlayer,
                gameState: room.gameState,
              })
            );

            ws.send(
              JSON.stringify({
                command: "JOINED",
                room: room.name,
                players: Array.from(room.players.values()),
                playerCount: room.players.size,
                canStart: room.players.size === numberOfPlayer,
                isCreator: room.creatorId === data.username,
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

        case "START":
          const conn = connections.get(ws.id);
          if (!conn) {
            ws.send(JSON.stringify({ command: "ERROR", message: "Not in a room" }));
            break;
          }

          const startRoom = rooms.get(conn.roomId);
          if (!startRoom) {
            ws.send(JSON.stringify({ command: "ERROR", message: "Room not found" }));
            break;
          }

          // Check if player is creator
          if (startRoom.creatorId !== conn.playerId) {
            ws.send(JSON.stringify({ command: "ERROR", message: "Only creator can start" }));
            break;
          }

          // Check if enough players
          if (startRoom.players.size < numberOfPlayer) {
            ws.send(JSON.stringify({
              command: "ERROR",
              message: `Need ${numberOfPlayer} players to start. Currently: ${startRoom.players.size}`
            }));
            break;
          }

          // Start the game
          startRoom.gameState = "playing";
          console.log(`🎮 Game started in room ${startRoom.name}`);

          const gameStartMessage = JSON.stringify({
            command: "GAME_STARTED",
            room: startRoom.name,
            players: Array.from(startRoom.players.values()),
          });

          // Send to creator (sender)
          ws.send(gameStartMessage);

          // Broadcast game start to all other players in room
          ws.publish(`room:${startRoom.name}`, gameStartMessage);
          break;

        case "GAME_OVER":
          const gameConn = connections.get(ws.id);
          if (!gameConn) break;

          const gameRoom = rooms.get(gameConn.roomId);
          if (!gameRoom) break;

          const loser = gameRoom.players.get(gameConn.playerId);
          if (loser) {
            console.log(`💀 ${loser.name} lost in room ${gameRoom.name}`);

            // Find the winner (the other player)
            const winner = Array.from(gameRoom.players.values()).find(
              p => p.name !== loser.name
            );

            if (winner) {
              winner.isWinner = true;
              gameRoom.gameState = "finished";

              const gameEndMessage = JSON.stringify({
                command: "GAME_END",
                winner: winner.name,
                loser: loser.name,
              });

              // Send to sender (loser)
              ws.send(gameEndMessage);

              // Broadcast game end to all players
              ws.publish(`room:${gameRoom.name}`, gameEndMessage);
            }
          }
          break;

        case "BOARD_UPDATE":
          const updateConn = connections.get(ws.id);
          if (!updateConn) break;

          // Broadcast board update to other players in the room
          ws.publish(
            `room:${updateConn.roomId}`,
            JSON.stringify({
              command: "BOARD_UPDATE",
              username: data.username,
              stage: data.stage,
            })
          );
          break;

        case "LEAVE":
          const leftInfo = leaveRoom(ws.id);
          if (leftInfo && leftInfo.roomId) {
            // Broadcast to remaining players
            ws.publish(
              `room:${leftInfo.roomId}`,
              JSON.stringify({
                command: "PLAYER_LEFT",
                playerId: leftInfo.playerId,
                remainingPlayers: leftInfo.remainingPlayers,
              })
            );
          }
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
