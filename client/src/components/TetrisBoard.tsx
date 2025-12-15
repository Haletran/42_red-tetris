import type { Board, CellValue, Position } from '../lib/tetris-engine';

interface TetrisBoardProps {
  board: Board;
  ghostPosition?: Position | null;
  className?: string;
}

const CELL_COLORS: Record<CellValue, string> = {
  0: 'bg-gray-900',
  1: 'bg-cyan-500',    // I piece
  2: 'bg-yellow-500',  // O piece
  3: 'bg-purple-500',  // T piece
  4: 'bg-green-500',   // S piece
  5: 'bg-red-500',     // Z piece
  6: 'bg-blue-500',    // J piece
  7: 'bg-orange-500',  // L piece
};

export function TetrisBoard({ board, ghostPosition, className = '' }: TetrisBoardProps) {
  return (
    <div className={`inline-block border-4 border-gray-700 ${className}`}>
      <div className="grid gap-[1px] bg-gray-800 p-1" style={{ gridTemplateColumns: `repeat(${board[0].length}, minmax(0, 1fr))` }}>
        {board.map((row, y) =>
          row.map((cell, x) => {
            const colorClass = CELL_COLORS[cell as CellValue] || CELL_COLORS[0];
            const isEmpty = cell === 0;

            return (
              <div
                key={`${y}-${x}`}
                className={`w-6 h-6 ${colorClass} ${isEmpty ? 'opacity-30' : 'opacity-100'} border border-gray-950`}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
