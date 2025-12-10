import { memo } from 'react';
import { TetrominoType } from '@/types/game';

interface CellProps {
  type: TetrominoType;
  color: string;
  size?: number;
}

const Cell = memo(({ type, color, size = 30 }: CellProps) => {
  const borderWidth = size === 15 ? 1 : (type === 0 ? 1 : 2);
  const boxShadowSize = size === 15 ? 5 : 10;

  return (
    <div
      className="cell"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        border: `${borderWidth}px solid ${type === 0 ? '#333' : '#000'}`,
        background: type === 0 ? '#111' : `rgb(${color})`,
        boxShadow: type === 0 ? 'none' : `inset 0 0 ${boxShadowSize}px rgba(0,0,0,0.5)`,
      }}
    />
  );
});

Cell.displayName = 'Cell';

export default Cell;
