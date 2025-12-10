import { useState, useEffect } from 'react';
import { STAGE_WIDTH, STAGE_HEIGHT } from '@/setup';
import { Stage, Cell, Player } from '@/types/game';

// Create an empty cell
const createCell = (): Cell => [0, '0, 0, 0'];

// Create the game board
export const createStage = (): Stage => {
  return Array.from(Array(STAGE_HEIGHT), () =>
    Array(STAGE_WIDTH).fill(createCell()) as Cell[]
  );
};

export const useGameBoard = (player: Player, resetPlayer: () => void) => {
  const [stage, setStage] = useState<Stage>(createStage());
  const [rowsCleared, setRowsCleared] = useState(0);

  useEffect(() => {
    if (!player.pos) return;

    setRowsCleared(0);

    const sweepRows = (newStage: Stage): Stage => {
      return newStage.reduce((acc, row) => {
        // If the row doesn't contain any 0s (empty cells), it's complete
        if (row.findIndex(cell => cell[0] === 0) === -1) {
          setRowsCleared(prev => prev + 1);
          // Add empty row at the beginning (top) when a row is cleared
          acc.unshift(new Array(newStage[0].length).fill(createCell()) as Cell[]);
          return acc;
        }
        acc.push(row);
        return acc;
      }, [] as Stage);
    };

    const updateStage = (prevStage: Stage): Stage => {
      // Clear the stage from previous render
      const newStage: Stage = prevStage.map(row =>
        row.map(cell => (cell[1] === 'clear' ? createCell() : cell))
      );

      // Draw the tetromino
      player.tetromino.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const newY = y + player.pos.y;
            const newX = x + player.pos.x;

            if (newY >= 0 && newY < STAGE_HEIGHT && newX >= 0 && newX < STAGE_WIDTH) {
              newStage[newY][newX] = [
                value,
                player.collided ? player.tetromino.color : 'clear',
              ];
            }
          }
        });
      });

      // Check if we collided
      if (player.collided) {
        resetPlayer();
        return sweepRows(newStage);
      }

      return newStage;
    };

    setStage(prev => updateStage(prev));
  }, [player, resetPlayer]);

  return { stage, setStage, rowsCleared };
};
