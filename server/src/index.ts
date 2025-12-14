import { Elysia } from "elysia";

interface Player {
  id: string;
  name: string;
  isReady: boolean;
  isWinner: boolean;
}

interface Room {
  id: number;
  name: string;
  isVacant: boolean;
  players: Map<string, Player>;
  gameState: "waiting" | "playing" | "finished";
}

interface MessageArgs {
	room_name: string;
	player_name: string;
}

interface Message {
	command: "JOIN" | "LEAVE" | "INFO" | "READY";
	args: MessageArgs;
}

const numberOfPlayer = 2;
const rooms: Map<string, Room> = new Map();
const connections = new Map<string, { roomId: string; playerId: string }>();

function send_room_message(ws, room: Room, command: string, message: string) {
	const roomMessage = JSON.stringify({
		command: command,
		room: room.name,
		players: Array.from(room.players.values()),
		playerCount: room.players.size,
		canStart: room.players.size === numberOfPlayer,
		gameState: room.gameState,
	});

	ws.send(roomMessage);
	ws.publish(`room:${room.name}`, roomMessage);
}

function create_room(room_name: string, players: any) {
	if (rooms.has(room_name)) {
		throw new Error(`Room ${room_name} already exist`);
	};
	const created_room: Room = {
		id: rooms.size + 1,
		name: room_name,
		isVacant: true,
		players: players,
		gameState: "waiting",
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
		};
		room.players.set(args.player_name, player);
		room.isVacant = room.players.size < numberOfPlayer;
		connections.set(ws.id, { roomId: args.room_name, playerId: args.player_name });
		return (room);
	} else {
		const creator: Player = {
			id: ws.id,
			name: args.player_name,
			isReady: false,
			isWinner: false,
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
				room.isVacant = room.players.size < numberOfPlayer;
				send_room_message(ws, room, "PLAYER_LEFT", `${conn.playerId} left`)
			}
			connections.delete(ws.id);
			break;
		case "playing":
			room.players.delete(player_id);
			const remainingPlayer = Array.from(room.players.values())[0];
			if (remainingPlayer) remainingPlayer.isWinner = true;
			room.gameState = "finished";
			send_room_message(ws, room, "GAME_OVER", "Player left the game")
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
	if (allReady && room.players.size === numberOfPlayer) {
		room.gameState = "playing";
		send_room_message(ws, room, "GAME_START", `Game in ${room.name} is starting`)
	} else {
		send_room_message(ws, room, "PLAYER_READY", `${conn.playerId} is ready to play`)
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
	  leave_room(ws, message.args);
	},
  });

app.listen(3000);

console.log(
  `Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
