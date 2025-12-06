import { Elysia } from "elysia";


interface Player {
	id: string;
	name: string;
	isCreator: boolean;
}

interface Room {
	id: string;
	name: string;
	isVacant: boolean;
	players: Map<string, Player>;
	gameState: "waiting" | "playing" | "finished";
	creatorId: string | null;
}

// Store all active rooms
const rooms = new Map<string, Room>();

// Helper function to get or create room
function getOrCreateRoom(roomName: string): Room {
	if (!rooms.has(roomName)) {
		rooms.set(roomName, {
			id: roomName,
			name: roomName,
			isVacant: true,
			players: new Map(),
			gameState: "waiting",
			creatorId: null,
		});
		console.log(`Created new room: ${roomName}`);
	}
	return rooms.get(roomName)!;
}

// Check if room exists
function roomExists(roomName: string): boolean {
	return rooms.has(roomName);
}

const app = new Elysia()
		.get("/", () => "Red Tetris")
		.get("/rooms", () => {
			// Return all active rooms
			return Array.from(rooms.values()).map(room => ({
				id: room.id,
				name: room.name,
				playerCount: room.players.size,
				gameState: room.gameState,
				isVacant: room.isVacant,
			}));
		})
		.get("/rooms/:roomName", ({ params }) => {
			// Check if a specific room exists
			const room = rooms.get(params.roomName);
			if (!room) {
				return { exists: false, message: "Room not found" };
			}
			return {
				exists: true,
				room: {
					id: room.id,
					name: room.name,
					playerCount: room.players.size,
					gameState: room.gameState,
					isVacant: room.isVacant,
					players: Array.from(room.players.values()),
				}
			};
		})
		.ws('/game/:room', {
			open(ws) {
				const { room } = ws.data.params;
				ws.subscribe(room);
				console.log(`Player connected to ${room}`);
			},
			message(ws, message) {
				const roomName = ws.data.params.room;

				try {
					// Log raw message for debugging
					console.log('Raw message:', message);
					console.log('Message type:', typeof message);

					// Parse the message - it should be a string
					let parsedMessage;
					if (typeof message === 'string') {
						parsedMessage = JSON.parse(message);
					} else {
						parsedMessage = message;
					}

					// Extract the inner message
					const data = typeof parsedMessage.message === 'string'
						? JSON.parse(parsedMessage.message)
						: parsedMessage.message || parsedMessage;

					console.log('Parsed data from', roomName, ':', data);

					// Handle join message
					if (data.type === 'join') {
						const room = getOrCreateRoom(roomName);
						const playerId = `${data.username}-${Date.now()}`;

						// Check if this is the first player (creator)
						const isCreator = room.players.size === 0;
						if (isCreator) {
							room.creatorId = playerId;
						}

						// Add player to room
						room.players.set(playerId, {
							id: playerId,
							name: data.username,
							isCreator: isCreator,
						});

						room.isVacant = room.players.size === 0;

						// Send response to the player
						ws.send(JSON.stringify({
							type: 'joined',
							playerId: playerId,
							isCreator: isCreator,
							room: {
								name: room.name,
								playerCount: room.players.size,
								gameState: room.gameState,
							}
						}));

						// Broadcast to all players in room
						ws.publish(roomName, JSON.stringify({
							type: 'player_joined',
							player: {
								id: playerId,
								name: data.username,
								isCreator: isCreator,
							},
							playerCount: room.players.size,
						}));

						console.log(`${data.username} joined ${roomName} as ${isCreator ? 'creator' : 'player'}`);
					}
					// Handle other game actions
					else {
						const room = rooms.get(roomName);

						if (!room) {
							ws.send(JSON.stringify({
								type: 'error',
								message: 'Room does not exist'
							}));
							return;
						}

						// Check if there is a creator before allowing gameplay
						if (!room.creatorId && data.type !== 'join') {
							ws.send(JSON.stringify({
								type: 'error',
								message: 'Room has no creator yet'
							}));
							return;
						}

						// Broadcast game action to all players in the room
						ws.publish(roomName, JSON.stringify(data));
					}

				} catch (error) {
					console.error('Error parsing message:', error);
					console.error('Failed message was:', message);
					ws.send(JSON.stringify({
						type: 'error',
						message: 'Invalid message format',
						details: error instanceof Error ? error.message : 'Unknown error'
					}));
				}
			},
			close(ws) {
				const roomName = ws.data.params.room;
				console.log('Disconnected from', roomName);

				// TODO: Remove player from room and clean up empty rooms
				const room = rooms.get(roomName);
				if (room && room.players.size === 0) {
					rooms.delete(roomName);
					console.log(`Deleted empty room: ${roomName}`);
				}
			}
		})
		

app.listen(3000)

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
