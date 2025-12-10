import { STAGE_WIDTH, STAGE_HEIGHT, TETROMINOS } from '@/setup';
import { Stage, Player, Tetromino, TetrominoType } from '@/types/game';

// Get random tetromino
export const randomTetromino = (): Tetromino => {
  const tetrominos: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  const randomIndex = Math.floor(Math.random() * tetrominos.length);
  const type = tetrominos[randomIndex];
  return TETROMINOS[type];
};

// Check for collision
export const checkCollision = (
  player: Player,
  stage: Stage,
  { x: moveX, y: moveY }: { x: number; y: number }
): boolean => {
  for (let y = 0; y < player.tetromino.shape.length; y++) {
    for (let x = 0; x < player.tetromino.shape[y].length; x++) {
      // Check if it's a tetromino cell
      if (player.tetromino.shape[y][x] !== 0) {
        const newY = y + player.pos.y + moveY;
        const newX = x + player.pos.x + moveX;

        // Check boundaries
        if (
          newX < 0 ||
          newX >= STAGE_WIDTH ||
          newY >= STAGE_HEIGHT
        ) {
          return true;
        }

        // Check if the cell is already occupied (and not 'clear')
        if (newY >= 0 && stage[newY][newX][1] !== 'clear' && stage[newY][newX][0] !== 0) {
          return true;
        }
      }
    }
  }
  return false;
};

// Rotate tetromino matrix
export const rotate = (matrix: TetrominoType[][], dir: number): TetrominoType[][] => {
  // Transpose the matrix: convert rows to columns
  const rotated = matrix[0].map((_, colIndex) =>
    matrix.map(row => row[colIndex])
  );
  // Reverse rows for clockwise rotation
  if (dir > 0) return rotated.map(row => row.reverse());
  // Or reverse for counter-clockwise
  return rotated.reverse();
};
