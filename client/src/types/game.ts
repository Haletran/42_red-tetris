export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z' | 0;

export interface Tetromino {
  shape: TetrominoType[][];
  color: string;
}

export interface Player {
  pos: { x: number; y: number };
  tetromino: Tetromino;
  collided: boolean;
}

export type Cell = [TetrominoType, string]; // [type, color]

export type Stage = Cell[][];

export interface GameState {
  stage: Stage;
  player: Player;
  score: number;
  rows: number;
  level: number;
  gameOver: boolean;
}
