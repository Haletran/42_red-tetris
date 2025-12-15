import { Elysia } from "elysia";
import { Player, Message, MessageArgs, Room} from "type.ts";

const DEFAULT_MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;
const rooms: Map<string, Room> = new Map();
const connections = new Map<string, { roomId: string; playerId: string }>();

function send_room_message(ws, room: Room, command: string, message: string) {
	const roomMessage = JSON.stringify({
		command: command,
		room: room.name,
		players: Array.from(room.players.values()),
		playerCount: room.players.size,
		maxPlayers: room.maxPlayers,
		minPlayers: room.minPlayers,
		canStart: room.players.size >= room.minPlayers && room.players.size <= room.maxPlayers,
		gameState: room.gameState,
	});

	ws.send(roomMessage);
	ws.publish(`room:${room.name}`, roomMessage);
}

function create_room(room_name: string, players: any, maxPlayers: number = DEFAULT_MAX_PLAYERS) {
	if (rooms.has(room_name)) {
		throw new Error(`Room ${room_name} already exist`);
	};
	const created_room: Room = {
		id: rooms.size + 1,
		name: room_name,
		isVacant: true,
		players: players,
		gameState: "waiting",
		maxPlayers: maxPlayers,
		minPlayers: MIN_PLAYERS,
	};
	rooms.set(room_name, created_room);
}

function join_room(ws, args: MessageArgs) {
	ws.subscribe(`room:${args.room_name}`);
	const room = rooms.get(args.room_name);
	if (room) {
		if (room.gameState !== "waiting" || room.isVacant == false) {
			throw new Error(`Room ${room.name} is already running`);
		}
		const player: Player = {
			id: ws.id,
			name: args.player_name,
			isReady: false,
			isWinner: false,
			gameData: null,
			isAlive: true,
		};
		room.players.set(args.player_name, player);
		room.isVacant = room.players.size < room.maxPlayers;
		connections.set(ws.id, { roomId: args.room_name, playerId: args.player_name });
		return (room);
	} else {
		const creator: Player = {
			id: ws.id,
			name: args.player_name,
			isReady: false,
			isWinner: false,
			gameData: null,
			isAlive: true,
		};
		const players = new Map([[args.player_name, creator]]);
		create_room(args.room_name, players);	
		connections.set(ws.id, { roomId: args.room_name, playerId: args.player_name });
		return (rooms.get(args.room_name));
	}
}

function leave_room(ws, args: MessageArgs) {
	const conn = connections.get(ws.id);
	if (!conn) throw new Error("No websocket connection found")
	const room_name = conn?.roomId;
	const player_id = conn?.playerId;
	const room = rooms.get(room_name);
	if (!room) throw new Error(`Room ${args.room_name} not found`)

	switch(room.gameState) {
		case "waiting":
			room.players.delete(player_id);
			console.log(`${player_id} left ${room_name}`);

			if (room.players.size === 0) {
				rooms.delete(room_name);
				console.log(`${room_name} sucessfully deleted`);
			} else {
				room.isVacant = room.players.size < room.maxPlayers;
				send_room_message(ws, room, "PLAYER_LEFT", `${conn.playerId} left`)
			}
			connections.delete(ws.id);
			break;
		case "playing":
			room.players.delete(player_id);
			const alivePlayers = Array.from(room.players.values()).filter(p => p.isAlive);

			// If only 1 player left, they win
			if (alivePlayers.length === 1) {
				alivePlayers[0].isWinner = true;
				room.gameState = "finished";
				send_room_message(ws, room, "GAME_WINNER", `${alivePlayers[0].name} wins!`)
			} else if (alivePlayers.length === 0) {
				room.gameState = "finished";
				send_room_message(ws, room, "GAME_OVER", "All players left")
			} else {
				// Game continues with remaining players
				send_room_message(ws, room, "PLAYER_LEFT", `${conn.playerId} left the game`)
			}
			connections.delete(ws.id);
			break;
		case "finished":
			room.players.delete(player_id);
			console.log(`${player_id} left finished room ${room_name}`);

			if (room.players.size === 0) {
				rooms.delete(room_name);
				console.log(`${room_name} sucessfully deleted`);
			} else {
				send_room_message(ws, room, "PLAYER_LEFT", `${conn.playerId} left`)
			}
			connections.delete(ws.id);
			break;
	}
}

function set_player_ready(ws, args: MessageArgs) {
	const conn = connections.get(ws.id);
	if (!conn) throw new Error("No websocket connection found");

	const room = rooms.get(conn.roomId);
	if (!room) throw new Error("Room not found");

	const player = room.players.get(conn.playerId);
	if (!player) throw new Error("Player not found inside the room");

	player.isReady = true;
	const allReady = Array.from(room.players.values()).every(p => p.isReady);
	if (allReady && room.players.size >= room.minPlayers) {
		// Reset all players to alive and not winners when game starts
		Array.from(room.players.values()).forEach(p => {
			p.isAlive = true;
			p.isWinner = false;
			p.gameData = null;
		});
		room.gameState = "playing";
		send_room_message(ws, room, "GAME_START", `Game in ${room.name} is starting`)
	} else {
		send_room_message(ws, room, "PLAYER_READY", `${conn.playerId} is ready to play`)
	}
}


function handle_board_update(ws, message: Message) {
	const conn = connections.get(ws.id);
	if (!conn) throw new Error("No websocket connection found");

	const room = rooms.get(conn.roomId);
	if (!room) throw new Error("Room not found");

	const player = room.players.get(conn.playerId);
	if (!player) throw new Error("Player not found");

	if (room.gameState !== "playing") {
		return;
	}

	if (message.gameData) {
		player.gameData = message.gameData;
		send_room_message(ws, room, "OPPONENT_UPDATE", `${conn.playerId} board updated`);
	}
}

function handle_game_over(ws, message: Message) {
	const conn = connections.get(ws.id);
	if (!conn) throw new Error("No websocket connection found");

	const room = rooms.get(conn.roomId);
	if (!room) throw new Error("Room not found");

	const player = room.players.get(conn.playerId);
	if (!player) throw new Error("Player not found");

	console.log(`Player ${conn.playerId} game over in room ${room.name}`);
	player.isAlive = false;

	const alivePlayers = Array.from(room.players.values()).filter(p => p.isAlive);
	console.log(`Alive players remaining: ${alivePlayers.length}`);

	if (alivePlayers.length === 1) {
		alivePlayers[0].isWinner = true;
		room.gameState = "finished";
		console.log(`Winner: ${alivePlayers[0].name}`);
		send_room_message(ws, room, "GAME_WINNER", `${alivePlayers[0].name} wins!`);
	} else if (alivePlayers.length === 0) {
		room.gameState = "finished";
		console.log("All players eliminated");
		send_room_message(ws, room, "GAME_OVER", "Game ended");
	}
}

function command_analyzer(ws, message: Message) {
	try {
		if (!message) throw new Error("Message is undefined");
		switch(message.command) {
			case "JOIN":
				const room = join_room(ws, message.args);
				send_room_message(ws, room, "INFO", `room successfully joined by ${message.args.player_name}`);
				break;
			case "READY":
				set_player_ready(ws, message.args);
				break;
			case "LEAVE":
				leave_room(ws, message.args);
				break;
			case "BOARD_UPDATE":
				handle_board_update(ws, message);
				break;
			case "GAME_OVER":
				handle_game_over(ws, message);
				break;
		}
	} catch(error: any) {
		console.error(`ERROR : ${error}`);
	}
}


const app = new Elysia()
  .ws("/ws", {
    open(ws) {
      console.log("WebSocket connection opened", ws.id);
    },
    message(ws, message: Message) {
		console.log("Received message from", ws.id, ":", message);
		try {
			command_analyzer(ws, message);
		} catch(error: any) {
			console.log("ERROR");
		}
    },
    close(ws) {
      console.log("WebSocket connection closed", ws.id);
	  const conn = connections.get(ws.id);
	  if (conn) {
		  const args: MessageArgs = {
			  room_name: conn.roomId,
			  player_name: conn.playerId
		  };
		  leave_room(ws, args);
	  }
	},
  });

app.listen(3000);

console.log(
  `Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
