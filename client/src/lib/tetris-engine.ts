export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export type CellValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Board = CellValue[][];

export interface Position {
  x: number;
  y: number;
}

export interface Piece {
  shape: number[][];
  color: CellValue;
  position: Position;
}

export interface GameState {
  board: Board;
  currentPiece: Piece | null;
  nextPiece: Piece | null;
  score: number;
  lines: number;
  level: number;
  gameOver: boolean;
}

// Tetromino shapes (0 = empty, 1 = filled)
const TETROMINOES = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: 1 as CellValue,
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: 2 as CellValue,
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: 3 as CellValue,
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: 4 as CellValue,
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: 5 as CellValue,
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: 6 as CellValue,
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: 7 as CellValue,
  },
};

const TETROMINO_LIST = Object.values(TETROMINOES);

// Bag randomizer for fair piece distribution
let pieceBag: typeof TETROMINO_LIST = [];

function refillBag(): void {
  pieceBag = [...TETROMINO_LIST];
  // Fisher-Yates shuffle
  for (let i = pieceBag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieceBag[i], pieceBag[j]] = [pieceBag[j], pieceBag[i]];
  }
}

function getRandomPiece(): Piece {
  if (pieceBag.length === 0) {
    refillBag();
  }
  const template = pieceBag.pop()!;
  return {
    shape: template.shape.map(row => [...row]),
    color: template.color,
    position: { x: Math.floor(BOARD_WIDTH / 2) - Math.floor(template.shape[0].length / 2), y: 0 },
  };
}

export function createEmptyBoard(): Board {
  return Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
}

export function initializeGame(): GameState {
  pieceBag = [];
  return {
    board: createEmptyBoard(),
    currentPiece: getRandomPiece(),
    nextPiece: getRandomPiece(),
    score: 0,
    lines: 0,
    level: 1,
    gameOver: false,
  };
}

export function checkCollision(board: Board, piece: Piece, position: Position): boolean {
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        const newX = position.x + x;
        const newY = position.y + y;

        // Check boundaries
        if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
          return true;
        }

        // Check board collision (but allow negative Y for spawning)
        if (newY >= 0 && board[newY][newX] !== 0) {
          return true;
        }
      }
    }
  }
  return false;
}

export function movePieceLeft(state: GameState): GameState {
  if (!state.currentPiece || state.gameOver) return state;

  const newPosition = { ...state.currentPiece.position, x: state.currentPiece.position.x - 1 };
  if (checkCollision(state.board, state.currentPiece, newPosition)) {
    return state;
  }

  return {
    ...state,
    currentPiece: { ...state.currentPiece, position: newPosition },
  };
}

export function movePieceRight(state: GameState): GameState {
  if (!state.currentPiece || state.gameOver) return state;

  const newPosition = { ...state.currentPiece.position, x: state.currentPiece.position.x + 1 };
  if (checkCollision(state.board, state.currentPiece, newPosition)) {
    return state;
  }

  return {
    ...state,
    currentPiece: { ...state.currentPiece, position: newPosition },
  };
}

export function movePieceDown(state: GameState): GameState {
  if (!state.currentPiece || state.gameOver) return state;

  const newPosition = { ...state.currentPiece.position, y: state.currentPiece.position.y + 1 };
  if (checkCollision(state.board, state.currentPiece, newPosition)) {
    return lockPiece(state);
  }

  return {
    ...state,
    currentPiece: { ...state.currentPiece, position: newPosition },
  };
}

export function rotatePiece(state: GameState): GameState {
  if (!state.currentPiece || state.gameOver) return state;

  // Create rotated shape (90 degrees clockwise)
  const rotated = state.currentPiece.shape[0].map((_, index) =>
    state.currentPiece!.shape.map(row => row[index]).reverse()
  );

  const rotatedPiece = { ...state.currentPiece, shape: rotated };

  // Try basic rotation
  if (!checkCollision(state.board, rotatedPiece, rotatedPiece.position)) {
    return { ...state, currentPiece: rotatedPiece };
  }

  // Wall kicks (SRS - Super Rotation System)
  const kicks = [
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: -2, y: 0 },
    { x: 2, y: 0 },
  ];

  for (const kick of kicks) {
    const kickPosition = {
      x: rotatedPiece.position.x + kick.x,
      y: rotatedPiece.position.y + kick.y,
    };
    if (!checkCollision(state.board, rotatedPiece, kickPosition)) {
      return {
        ...state,
        currentPiece: { ...rotatedPiece, position: kickPosition },
      };
    }
  }

  return state;
}

export function hardDrop(state: GameState): GameState {
  if (!state.currentPiece || state.gameOver) return state;

  let newState = { ...state };
  while (newState.currentPiece && !newState.gameOver) {
    const nextState = movePieceDown(newState);
    if (nextState.currentPiece === null) {
      return nextState;
    }
    if (nextState.currentPiece.position.y === newState.currentPiece.position.y) {
      return lockPiece(newState);
    }
    newState = nextState;
  }
  return newState;
}

function lockPiece(state: GameState): GameState {
  if (!state.currentPiece) return state;

  const newBoard = state.board.map(row => [...row]);

  // Place piece on board
  for (let y = 0; y < state.currentPiece.shape.length; y++) {
    for (let x = 0; x < state.currentPiece.shape[y].length; x++) {
      if (state.currentPiece.shape[y][x]) {
        const boardY = state.currentPiece.position.y + y;
        const boardX = state.currentPiece.position.x + x;
        if (boardY >= 0 && boardY < BOARD_HEIGHT) {
          newBoard[boardY][boardX] = state.currentPiece.color;
        }
      }
    }
  }

  // Clear completed lines
  const { clearedBoard, linesCleared } = clearLines(newBoard);
  const newScore = state.score + calculateScore(linesCleared, state.level);
  const newLines = state.lines + linesCleared;
  const newLevel = Math.floor(newLines / 10) + 1;

  // Spawn next piece
  const nextPiece = state.nextPiece || getRandomPiece();
  const newNextPiece = getRandomPiece();

  // Check game over
  const gameOver = checkCollision(clearedBoard, nextPiece, nextPiece.position);

  return {
    board: clearedBoard,
    currentPiece: gameOver ? null : nextPiece,
    nextPiece: newNextPiece,
    score: newScore,
    lines: newLines,
    level: newLevel,
    gameOver,
  };
}

function clearLines(board: Board): { clearedBoard: Board; linesCleared: number } {
  const newBoard: Board = [];
  let linesCleared = 0;

  for (let y = 0; y < board.length; y++) {
    if (board[y].every(cell => cell !== 0)) {
      linesCleared++;
    } else {
      newBoard.push([...board[y]]);
    }
  }

  // Add empty lines at the top
  while (newBoard.length < BOARD_HEIGHT) {
    newBoard.unshift(Array(BOARD_WIDTH).fill(0));
  }

  return { clearedBoard: newBoard, linesCleared };
}

function calculateScore(linesCleared: number, level: number): number {
  const baseScores = [0, 40, 100, 300, 1200];
  return baseScores[linesCleared] * level;
}

export function getGhostPiecePosition(state: GameState): Position | null {
  if (!state.currentPiece || state.gameOver) return null;

  let ghostY = state.currentPiece.position.y;
  while (!checkCollision(state.board, state.currentPiece, { ...state.currentPiece.position, y: ghostY + 1 })) {
    ghostY++;
  }

  return { x: state.currentPiece.position.x, y: ghostY };
}

export function getMergedBoard(state: GameState): Board {
  const merged = state.board.map(row => [...row]);

  if (state.currentPiece && !state.gameOver) {
    for (let y = 0; y < state.currentPiece.shape.length; y++) {
      for (let x = 0; x < state.currentPiece.shape[y].length; x++) {
        if (state.currentPiece.shape[y][x]) {
          const boardY = state.currentPiece.position.y + y;
          const boardX = state.currentPiece.position.x + x;
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            merged[boardY][boardX] = state.currentPiece.color;
          }
        }
      }
    }
  }

  return merged;
}
