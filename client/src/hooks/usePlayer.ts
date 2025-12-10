import { useState, useCallback } from 'react';
import { STAGE_WIDTH } from '@/setup';
import { Player, Stage } from '@/types/game';
import { randomTetromino, checkCollision, rotate } from '@/lib/gameHelpers';

export const usePlayer = (onGameOver?: () => void) => {
  const [player, setPlayer] = useState<Player>({
    pos: { x: 0, y: 0 },
    tetromino: randomTetromino(),
    collided: false,
  });

  // Rotate player tetromino
  const rotatePlayer = (stage: Stage, dir: number) => {
    const clonedPlayer = JSON.parse(JSON.stringify(player)) as Player;
    clonedPlayer.tetromino.shape = rotate(clonedPlayer.tetromino.shape, dir);

    const originalX = clonedPlayer.pos.x;
    let offset = 1;

    // Handle wall kicks
    while (checkCollision(clonedPlayer, stage, { x: 0, y: 0 })) {
      clonedPlayer.pos.x += offset;
      offset = -(offset + (offset > 0 ? 1 : -1));

      // If we can't find a valid position, don't rotate
      if (offset > clonedPlayer.tetromino.shape[0].length) {
        return; // Don't apply rotation
      }
    }

    // Rotation successful, update player
    setPlayer(clonedPlayer);
  };

  // Move player (left, right, down)
  const movePlayer = (stage: Stage, dir: number, drop: boolean = false) => {
    if (!checkCollision(player, stage, { x: dir, y: 0 })) {
      setPlayer(prev => ({
        ...prev,
        pos: { x: prev.pos.x + dir, y: prev.pos.y },
        collided: false,
      }));
    }
  };

  // Drop player down
  const dropPlayer = (stage: Stage) => {
    if (!checkCollision(player, stage, { x: 0, y: 1 })) {
      setPlayer(prev => ({
        ...prev,
        pos: { x: prev.pos.x, y: prev.pos.y + 1 },
        collided: false,
      }));
    } else {
      // Collision detected - lock the piece
      if (player.pos.y < 1) {
        console.log('GAME OVER');
        onGameOver?.();
      }
      setPlayer(prev => ({
        ...prev,
        collided: true,
      }));
    }
  };

  // Reset player with new tetromino
  const resetPlayer = useCallback(() => {
    setPlayer({
      pos: { x: STAGE_WIDTH / 2 - 2, y: 0 },
      tetromino: randomTetromino(),
      collided: false,
    });
  }, []);

  return { player, movePlayer, dropPlayer, rotatePlayer, resetPlayer };
};
