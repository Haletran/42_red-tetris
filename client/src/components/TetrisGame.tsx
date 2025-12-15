import { useTetris } from '../hooks/useTetris';
import { TetrisBoard } from './TetrisBoard';
import type { GameState, Board } from '../lib/tetris-engine';

interface TetrisGameProps {
  onGameOver?: (finalState: GameState) => void;
  onBoardUpdate?: (board: Board, score: number, lines: number) => void;
  autoStart?: boolean;
}

const CELL_COLORS: Record<number, string> = {
  0: 'bg-gray-900',
  1: 'bg-cyan-500',
  2: 'bg-yellow-500',
  3: 'bg-purple-500',
  4: 'bg-green-500',
  5: 'bg-red-500',
  6: 'bg-blue-500',
  7: 'bg-orange-500',
};

export function TetrisGame({ onGameOver, onBoardUpdate, autoStart = false }: TetrisGameProps) {
  const { gameState, board, isPaused, isStarted, start, togglePause, reset } = useTetris({
    onGameOver,
    onBoardUpdate,
  });

  // Auto-start if requested
  if (autoStart && !isStarted && !gameState.gameOver) {
    start();
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Game Board */}
      <div className="relative">
        <TetrisBoard board={board} />

        {/* Game Over Overlay */}
        {gameState.gameOver && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-red-500 mb-4">GAME OVER</h2>
              <p className="text-xl text-white mb-2">Final Score: {gameState.score}</p>
              <p className="text-lg text-white">Lines: {gameState.lines}</p>
            </div>
          </div>
        )}

        {/* Paused Overlay */}
        {isPaused && isStarted && !gameState.gameOver && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
            <h2 className="text-3xl font-bold text-yellow-400">PAUSED</h2>
          </div>
        )}
      </div>

      {/* Stats Panel */}
      <div className="bg-gray-800 rounded-lg p-4 w-64">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-gray-400 text-sm">Score</p>
            <p className="text-2xl font-bold text-white">{gameState.score}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Lines</p>
            <p className="text-2xl font-bold text-white">{gameState.lines}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Level</p>
            <p className="text-2xl font-bold text-white">{gameState.level}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Next</p>
            {gameState.nextPiece && (
              <div className="flex justify-center mt-1">
                <div className="grid gap-[1px]" style={{ gridTemplateColumns: `repeat(${gameState.nextPiece.shape[0].length}, 12px)` }}>
                  {gameState.nextPiece.shape.map((row, y) =>
                    row.map((cell, x) => (
                      <div
                        key={`${y}-${x}`}
                        className={`w-3 h-3 ${cell ? CELL_COLORS[gameState.nextPiece!.color] : 'bg-transparent'}`}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      {!autoStart && (
        <div className="flex gap-2">
          {!isStarted ? (
            <button
              onClick={start}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded transition"
            >
              Start Game
            </button>
          ) : (
            <>
              <button
                onClick={togglePause}
                disabled={gameState.gameOver}
                className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded transition"
              >
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={reset}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded transition"
              >
                Reset
              </button>
            </>
          )}
        </div>
      )}

      {/* Controls Guide */}
      <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-300 w-64">
        <p className="font-semibold mb-2">Controls:</p>
        <ul className="space-y-1">
          <li>← → : Move</li>
          <li>↓ : Soft Drop</li>
          <li>↑ : Rotate</li>
          <li>Space : Hard Drop</li>
          <li>P : Pause</li>
        </ul>
      </div>
    </div>
  );
}
