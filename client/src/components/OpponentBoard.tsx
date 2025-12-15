import type { CellValue } from '../lib/tetris-engine';

interface OpponentBoardProps {
  board: number[][];
  playerName: string;
  score: number;
  lines: number;
  isAlive: boolean;
  className?: string;
}

const CELL_COLORS: Record<CellValue, string> = {
  0: 'bg-gray-900',
  1: 'bg-cyan-500',
  2: 'bg-yellow-500',
  3: 'bg-purple-500',
  4: 'bg-green-500',
  5: 'bg-red-500',
  6: 'bg-blue-500',
  7: 'bg-orange-500',
};

export function OpponentBoard({ board, playerName, score, lines, isAlive, className = '' }: OpponentBoardProps) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* Player Info */}
      <div className="bg-gray-800 rounded-lg p-3 w-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white">{playerName}</h3>
          {!isAlive && (
            <span className="px-2 py-1 bg-red-600 rounded text-xs font-bold">
              DEAD
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-400 text-xs">Score</p>
            <p className="text-white font-bold">{score}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Lines</p>
            <p className="text-white font-bold">{lines}</p>
          </div>
        </div>
      </div>

      {/* Opponent Board (scaled down) */}
      <div className={`inline-block border-2 border-gray-700 ${!isAlive ? 'opacity-50' : ''}`}>
        <div
          className="grid gap-[1px] bg-gray-800 p-1"
          style={{ gridTemplateColumns: `repeat(${board[0]?.length || 10}, minmax(0, 1fr))` }}
        >
          {board.map((row, y) =>
            row.map((cell, x) => {
              const colorClass = CELL_COLORS[cell as CellValue] || CELL_COLORS[0];
              const isEmpty = cell === 0;

              return (
                <div
                  key={`${y}-${x}`}
                  className={`w-3 h-3 ${colorClass} ${isEmpty ? 'opacity-30' : 'opacity-100'} border border-gray-950`}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
