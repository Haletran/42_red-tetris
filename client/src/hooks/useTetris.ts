import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initializeGame,
  movePieceDown,
  movePieceLeft,
  movePieceRight,
  rotatePiece,
  hardDrop,
  getMergedBoard,
  getGhostPiecePosition,
  type GameState,
  type Board,
} from '../lib/tetris-engine';

interface UseTetrisOptions {
  onGameOver?: (finalState: GameState) => void;
  onScoreChange?: (score: number, lines: number) => void;
  onBoardUpdate?: (board: Board, score: number, lines: number) => void;
}

export function useTetris(options: UseTetrisOptions = {}) {
  const [gameState, setGameState] = useState<GameState>(initializeGame());
  const [isPaused, setIsPaused] = useState(true);
  const [isStarted, setIsStarted] = useState(false);
  const gameLoopRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const { onGameOver, onScoreChange, onBoardUpdate } = options;

  // Get drop interval based on level (gets faster as level increases)
  const getDropInterval = useCallback(() => {
    return Math.max(100, 1000 - (gameState.level - 1) * 100);
  }, [gameState.level]);

  // Stop the game
  const stop = useCallback(() => {
    if (gameLoopRef.current !== null) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    setIsPaused(true);
    setIsStarted(false);
  }, []);

  // Game loop
  useEffect(() => {
    if (isPaused || !isStarted || gameState.gameOver) {
      if (gameLoopRef.current !== null) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    const gameLoop = (timestamp: number) => {
      if (lastUpdateRef.current === 0) {
        lastUpdateRef.current = timestamp;
      }

      const deltaTime = timestamp - lastUpdateRef.current;

      if (deltaTime >= getDropInterval()) {
        setGameState(prevState => {
          const newState = movePieceDown(prevState);
          if (newState.gameOver && onGameOver) {
            onGameOver(newState);
          }
          return newState;
        });
        lastUpdateRef.current = timestamp;
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current !== null) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [isPaused, isStarted, gameState.gameOver, getDropInterval, onGameOver]);

  // Notify score changes
  useEffect(() => {
    if (onScoreChange) {
      onScoreChange(gameState.score, gameState.lines);
    }
  }, [gameState.score, gameState.lines, onScoreChange]);

  // Notify board updates (throttled)
  useEffect(() => {
    if (onBoardUpdate && isStarted && !gameState.gameOver) {
      const board = getMergedBoard(gameState);
      onBoardUpdate(board, gameState.score, gameState.lines);
    }
  }, [gameState.board, gameState.score, gameState.lines, onBoardUpdate, isStarted, gameState.gameOver]);

  // Keyboard controls
  useEffect(() => {
    if (!isStarted || isPaused || gameState.gameOver) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setGameState(prevState => movePieceLeft(prevState));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setGameState(prevState => movePieceRight(prevState));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setGameState(prevState => movePieceDown(prevState));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setGameState(prevState => rotatePiece(prevState));
          break;
        case ' ':
          e.preventDefault();
          setGameState(prevState => hardDrop(prevState));
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          setIsPaused(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStarted, isPaused, gameState.gameOver]);

  // Start game
  const start = useCallback(() => {
    const newGame = initializeGame();
    setGameState(newGame);
    setIsStarted(true);
    setIsPaused(false);
    lastUpdateRef.current = 0;
  }, []);

  // Pause/Resume
  const togglePause = useCallback(() => {
    if (isStarted && !gameState.gameOver) {
      setIsPaused(prev => !prev);
      if (isPaused) {
        lastUpdateRef.current = 0;
      }
    }
  }, [isStarted, gameState.gameOver, isPaused]);

  // Reset game
  const reset = useCallback(() => {
    stop();
    setGameState(initializeGame());
  }, [stop]);

  return {
    gameState,
    board: getMergedBoard(gameState),
    ghostPosition: getGhostPiecePosition(gameState),
    isPaused,
    isStarted,
    start,
    stop,
    togglePause,
    reset,
  };
}
