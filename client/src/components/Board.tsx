import Cell from './Cell';
import { Stage } from '@/types/game';

interface BoardProps {
  stage: Stage;
  small?: boolean;
}

const Board = ({ stage, small = false }: BoardProps) => {
  const cellSize = small ? 15 : 30;
  const borderSize = small ? 2 : 4;
  const padding = small ? 5 : 10;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${stage[0].length}, ${cellSize}px)`,
        gridGap: '1px',
        border: `${borderSize}px solid #333`,
        background: '#000',
        padding: `${padding}px`,
      }}
    >
      {stage.map((row) =>
        row.map((cell, x) => (
          <Cell key={x} type={cell[0]} color={cell[1]} size={cellSize} />
        ))
      )}
    </div>
  );
};

export default Board;
