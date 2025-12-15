export interface GameData {
  board: number[][];
  score: number;
  linesCleared: number;
}

export interface Player {
  id: string;
  name: string;
  isReady: boolean;
  isWinner: boolean;
  gameData: GameData | null;
  isAlive: boolean;
}

export interface Room {
  id: number;
  name: string;
  isVacant: boolean;
  players: Map<string, Player>;
  gameState: "waiting" | "playing" | "finished";
  maxPlayers: number;
  minPlayers: number;
}

export interface MessageArgs {
	room_name: string;
	player_name: string;
}

export interface Message {
	command: "JOIN" | "LEAVE" | "INFO" | "READY" | "BOARD_UPDATE" | "GAME_OVER";
	args: MessageArgs;
	gameData?: GameData;
}

