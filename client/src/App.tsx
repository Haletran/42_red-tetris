import { useState, useEffect, useRef } from 'react'
import { TETROMINOS, STAGE_WIDTH, STAGE_HEIGHT, ROWPOINTS } from './setup'

type TetrominoType = keyof typeof TETROMINOS
type Cell = [string | number, string]
type Board = Cell[][]

const createBoard = (): Board => {
  return Array.from({ length: STAGE_HEIGHT }, () =>
    Array.from({ length: STAGE_WIDTH }, () => [0, 'clear'])
  )
}

// Random Bag (7-bag) Generator - Tetris Guideline
const createBag = (): TetrominoType[] => {
  const tetrominos: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z']
  for (let i = tetrominos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tetrominos[i], tetrominos[j]] = [tetrominos[j], tetrominos[i]]
  }
  return tetrominos
}

interface Player {
  pos: { x: number; y: number }
  tetromino: typeof TETROMINOS[TetrominoType]
  type: TetrominoType
}

const createPlayer = (type: TetrominoType): Player => {
  const tetromino = TETROMINOS[type]
  // Spawn at rows 21-22 (top of playfield), centered, rounded left
  return {
    pos: { x: Math.floor(STAGE_WIDTH / 2) - Math.floor(tetromino.shape[0].length / 2), y: 0 },
    tetromino: tetromino,
    type: type
  }
}

function App() {
  // Initialize game state
  const [gameState] = useState(() => {
    const bag1 = createBag()
    const bag2 = createBag()
    const allPieces = [...bag1, ...bag2]
    const initialQueue = allPieces.slice(1, 7)
    const initialPlayer = createPlayer(allPieces[0])

    return {
      initialPlayer,
      initialQueue,
      initialBag: allPieces.slice(7)
    }
  })

  const [board, setBoard] = useState<Board>(createBoard())
  const [player, setPlayer] = useState<Player | null>(gameState.initialPlayer)
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(1)
  const [gameOver, setGameOver] = useState(false)
  const [nextQueue, setNextQueue] = useState<TetrominoType[]>(gameState.initialQueue)
  const [holdPiece, setHoldPiece] = useState<TetrominoType | null>(null)
  const [canHold, setCanHold] = useState(true)

  const gameRef = useRef({
    board: createBoard(),
    player: gameState.initialPlayer,
    bag: gameState.initialBag as TetrominoType[],
    nextQueue: gameState.initialQueue as TetrominoType[]
  })

  const getNextPiece = (): TetrominoType => {
    if (gameRef.current.bag.length === 0) {
      gameRef.current.bag = createBag()
    }
    const next = gameRef.current.bag.shift()!
    return next
  }

  const checkCollision = (
    playerToCheck: Player,
    boardToCheck: Board,
    { x: moveX, y: moveY }: { x: number; y: number }
  ): boolean => {
    for (let y = 0; y < playerToCheck.tetromino.shape.length; y++) {
      for (let x = 0; x < playerToCheck.tetromino.shape[y].length; x++) {
        if (playerToCheck.tetromino.shape[y][x] !== 0) {
          const newY = y + playerToCheck.pos.y + moveY
          const newX = x + playerToCheck.pos.x + moveX

          if (
            newY >= STAGE_HEIGHT ||
            newX < 0 ||
            newX >= STAGE_WIDTH ||
            (boardToCheck[newY] && boardToCheck[newY][newX] && boardToCheck[newY][newX][1] !== 'clear')
          ) {
            return true
          }
        }
      }
    }
    return false
  }

  const mergePlayerToBoard = (currentPlayer: Player, currentBoard: Board): Board => {
    const newBoard = currentBoard.map(row =>
      row.map(cell => (cell[1] === 'clear' ? [0, 'clear'] as Cell : cell))
    )

    currentPlayer.tetromino.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const newY = y + currentPlayer.pos.y
          const newX = x + currentPlayer.pos.x
          if (newY >= 0 && newY < STAGE_HEIGHT && newX >= 0 && newX < STAGE_WIDTH) {
            newBoard[newY][newX] = [value, 'merged']
          }
        }
      })
    })

    return newBoard
  }

  const clearLines = (boardToClear: Board): { board: Board; linesCleared: number } => {
    let linesCleared = 0
    const newBoard = boardToClear.filter(row => {
      const isFull = row.every(cell => cell[1] === 'merged')
      if (isFull) linesCleared++
      return !isFull
    })

    while (newBoard.length < STAGE_HEIGHT) {
      newBoard.unshift(Array.from({ length: STAGE_WIDTH }, () => [0, 'clear'] as Cell))
    }

    return { board: newBoard, linesCleared }
  }

  const calculateScore = (linesCleared: number, currentLevel: number) => {
    if (linesCleared > 0 && linesCleared <= 4) {
      return ROWPOINTS[linesCleared - 1] * currentLevel
    }
    return 0
  }

  const spawnNewPiece = () => {
    const nextType = gameRef.current.nextQueue.shift()!
    const newPiece = getNextPiece()
    gameRef.current.nextQueue.push(newPiece)

    const newPlayer = createPlayer(nextType)
    gameRef.current.player = newPlayer

    setNextQueue([...gameRef.current.nextQueue])
    setPlayer(newPlayer)
    setCanHold(true)

    return newPlayer
  }

  const drop = () => {
    if (!gameRef.current.player) return

    const currentPlayer = gameRef.current.player
    const currentBoard = gameRef.current.board

    if (!checkCollision(currentPlayer, currentBoard, { x: 0, y: 1 })) {
      const newPlayer = {
        ...currentPlayer,
        pos: { x: currentPlayer.pos.x, y: currentPlayer.pos.y + 1 }
      }
      gameRef.current.player = newPlayer
      setPlayer(newPlayer)
    } else {
      // Lock piece
      if (currentPlayer.pos.y < 1) {
        setGameOver(true)
        return
      }

      const mergedBoard = mergePlayerToBoard(currentPlayer, currentBoard)
      const { board: clearedBoard, linesCleared } = clearLines(mergedBoard)

      gameRef.current.board = clearedBoard
      setBoard(clearedBoard)

      if (linesCleared > 0) {
        const points = calculateScore(linesCleared, level)
        setScore(prev => prev + points)
        setLines(prev => {
          const newLines = prev + linesCleared
          setLevel(Math.floor(newLines / 10) + 1)
          return newLines
        })
      }

      const newPlayer = spawnNewPiece()

      // Check if game over (piece spawns overlapping)
      if (checkCollision(newPlayer, clearedBoard, { x: 0, y: 0 })) {
        setGameOver(true)
      }
    }
  }

  const movePlayer = (dir: number) => {
    if (!gameRef.current.player) return

    const currentPlayer = gameRef.current.player
    const currentBoard = gameRef.current.board

    if (!checkCollision(currentPlayer, currentBoard, { x: dir, y: 0 })) {
      const newPlayer = {
        ...currentPlayer,
        pos: { x: currentPlayer.pos.x + dir, y: currentPlayer.pos.y }
      }
      gameRef.current.player = newPlayer
      setPlayer(newPlayer)
    }
  }

  const rotate = (tetromino: typeof TETROMINOS[TetrominoType], dir: number): typeof TETROMINOS[TetrominoType] => {
    const shape = tetromino.shape
    const N = shape.length
    const M = shape[0].length

    if (dir > 0) {
      // Rotate clockwise: transpose then reverse each row
      const rotated = []
      for (let col = 0; col < M; col++) {
        const newRow = []
        for (let row = N - 1; row >= 0; row--) {
          newRow.push(shape[row][col])
        }
        rotated.push(newRow)
      }
      return { ...tetromino, shape: rotated }
    } else {
      // Rotate counterclockwise: reverse each row then transpose
      const rotated = []
      for (let col = M - 1; col >= 0; col--) {
        const newRow = []
        for (let row = 0; row < N; row++) {
          newRow.push(shape[row][col])
        }
        rotated.push(newRow)
      }
      return { ...tetromino, shape: rotated }
    }
  }

  const rotatePiece = (dir: number) => {
    if (!gameRef.current.player) return

    const currentPlayer = gameRef.current.player
    const currentBoard = gameRef.current.board

    const clonedPlayer = JSON.parse(JSON.stringify(currentPlayer))
    clonedPlayer.tetromino = rotate(currentPlayer.tetromino, dir)

    if (!checkCollision(clonedPlayer, currentBoard, { x: 0, y: 0 })) {
      const newPlayer = {
        ...currentPlayer,
        tetromino: clonedPlayer.tetromino
      }
      gameRef.current.player = newPlayer
      setPlayer(newPlayer)
    }
  }

  const hardDrop = () => {
    if (!gameRef.current.player) return

    const currentPlayer = gameRef.current.player
    const currentBoard = gameRef.current.board

    let dropDistance = 0
    while (!checkCollision(currentPlayer, currentBoard, { x: 0, y: dropDistance + 1 })) {
      dropDistance++
    }

    const newPlayer = {
      ...currentPlayer,
      pos: { x: currentPlayer.pos.x, y: currentPlayer.pos.y + dropDistance }
    }

    if (newPlayer.pos.y < 1) {
      setGameOver(true)
      return
    }

    const mergedBoard = mergePlayerToBoard(newPlayer, currentBoard)
    const { board: clearedBoard, linesCleared } = clearLines(mergedBoard)

    gameRef.current.board = clearedBoard
    setBoard(clearedBoard)

    if (linesCleared > 0) {
      const points = calculateScore(linesCleared, level)
      setScore(prev => prev + points)
      setLines(prev => {
        const newLines = prev + linesCleared
        setLevel(Math.floor(newLines / 10) + 1)
        return newLines
      })
    }

    const nextPlayer = spawnNewPiece()

    if (checkCollision(nextPlayer, clearedBoard, { x: 0, y: 0 })) {
      setGameOver(true)
    }
  }

  const hold = () => {
    if (!canHold || !gameRef.current.player) return

    const currentPlayer = gameRef.current.player

    if (holdPiece === null) {
      setHoldPiece(currentPlayer.type)
      const newPlayer = spawnNewPiece()
      if (checkCollision(newPlayer, gameRef.current.board, { x: 0, y: 0 })) {
        setGameOver(true)
      }
    } else {
      const newPlayer = createPlayer(holdPiece)
      setHoldPiece(currentPlayer.type)
      gameRef.current.player = newPlayer
      setPlayer(newPlayer)

      if (checkCollision(newPlayer, gameRef.current.board, { x: 0, y: 0 })) {
        setGameOver(true)
      }
    }

    setCanHold(false)
  }

  useEffect(() => {
    if (gameRef.current.player) {
      gameRef.current.board = board
      gameRef.current.player = player
    }
  }, [board, player])

  useEffect(() => {
    if (gameOver || !player) return

    const dropSpeed = Math.max(100, 1000 - (level - 1) * 50)

    const dropInterval = () => {
      if (!gameRef.current.player) return

      const currentPlayer = gameRef.current.player
      const currentBoard = gameRef.current.board

      if (!checkCollision(currentPlayer, currentBoard, { x: 0, y: 1 })) {
        const newPlayer = {
          ...currentPlayer,
          pos: { x: currentPlayer.pos.x, y: currentPlayer.pos.y + 1 }
        }
        gameRef.current.player = newPlayer
        setPlayer(newPlayer)
      } else {
        // Lock piece
        if (currentPlayer.pos.y < 1) {
          setGameOver(true)
          return
        }

        const mergedBoard = mergePlayerToBoard(currentPlayer, currentBoard)
        const { board: clearedBoard, linesCleared } = clearLines(mergedBoard)

        gameRef.current.board = clearedBoard
        setBoard(clearedBoard)

        if (linesCleared > 0) {
          const points = calculateScore(linesCleared, level)
          setScore(prev => prev + points)
          setLines(prev => {
            const newLines = prev + linesCleared
            setLevel(Math.floor(newLines / 10) + 1)
            return newLines
          })
        }

        const newPlayer = spawnNewPiece()

        // Check if game over (piece spawns overlapping)
        if (checkCollision(newPlayer, clearedBoard, { x: 0, y: 0 })) {
          setGameOver(true)
        }
      }
    }

    const interval = setInterval(dropInterval, dropSpeed)

    return () => clearInterval(interval)
  }, [gameOver, level, player])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver) return

      if (e.key === 'ArrowLeft') {
        movePlayer(-1)
      } else if (e.key === 'ArrowRight') {
        movePlayer(1)
      } else if (e.key === 'ArrowDown') {
        drop()
      } else if (e.key === 'ArrowUp') {
        rotatePiece(1)
      } else if (e.key === 'z' || e.key === 'Z') {
        rotatePiece(-1)
      } else if (e.key === ' ') {
        e.preventDefault()
        hardDrop()
      } else if (e.key === 'c' || e.key === 'C' || e.key === 'Shift') {
        hold()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  })

  const getGhostPosition = (): number => {
    if (!player) return 0

    let dropDistance = 0
    while (!checkCollision(player, gameRef.current.board, { x: 0, y: dropDistance + 1 })) {
      dropDistance++
    }
    return player.pos.y + dropDistance
  }

  const renderBoard = () => {
    const currentPlayer = gameRef.current.player
    if (!currentPlayer) {
      return board
    }

    const displayBoard = board.map(row =>
      row.map(cell => (cell[1] === 'clear' ? [0, 'clear'] as Cell : cell))
    )

    // Render ghost piece
    let dropDistance = 0
    while (!checkCollision(currentPlayer, gameRef.current.board, { x: 0, y: dropDistance + 1 })) {
      dropDistance++
    }
    const ghostY = currentPlayer.pos.y + dropDistance

    currentPlayer.tetromino.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const newY = y + ghostY
          const newX = x + currentPlayer.pos.x
          if (newY >= 0 && newY < STAGE_HEIGHT && newX >= 0 && newX < STAGE_WIDTH) {
            if (displayBoard[newY][newX][0] === 0) {
              displayBoard[newY][newX] = [value, 'ghost']
            }
          }
        }
      })
    })

    // Render active piece
    currentPlayer.tetromino.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const newY = y + currentPlayer.pos.y
          const newX = x + currentPlayer.pos.x
          if (newY >= 0 && newY < STAGE_HEIGHT && newX >= 0 && newX < STAGE_WIDTH) {
            displayBoard[newY][newX] = [value, 'clear']
          }
        }
      })
    })

    return displayBoard
  }

  const getCellStyle = (cell: Cell) => {
    const value = cell[0]
    const status = cell[1]

    if (value === 0) return { backgroundColor: '#000000' }

    const tetromino = Object.entries(TETROMINOS).find(([key]) => key === value)
    if (tetromino) {
      const color = tetromino[1].color
      if (status === 'ghost') {
        return { backgroundColor: `rgba(${color}, 0.2)`, border: `1px solid rgba(${color}, 0.5)` }
      }
      return { backgroundColor: `rgb(${color})` }
    }
    return { backgroundColor: '#000000' }
  }

  const displayBoard = renderBoard()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="flex gap-4">
        {/* Hold Piece */}
        <div className="flex flex-col gap-4">
          <div className="bg-gray-800 border-2 border-gray-700 rounded-lg p-3">
            <h3 className="text-white text-sm font-bold mb-2 text-center">HOLD</h3>
            <div className="w-20 h-20 bg-black rounded grid grid-cols-4 gap-0">
              {holdPiece ? (
                TETROMINOS[holdPiece].shape.map((row, y) =>
                  row.map((cell, x) => (
                    <div
                      key={`hold-${y}-${x}`}
                      className="w-5 h-5"
                      style={cell !== 0 ? { backgroundColor: `rgb(${TETROMINOS[holdPiece].color})` } : { backgroundColor: '#000000' }}
                    ></div>
                  ))
                )
              ) : (
                <div className="col-span-4 flex items-center justify-center text-gray-600 text-xs">Empty</div>
              )}
            </div>
          </div>

          <div className="bg-gray-800 border-2 border-gray-700 rounded-lg p-3">
            <div className="text-white text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Score:</span>
                <span className="font-mono font-bold">{score}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Lines:</span>
                <span className="font-mono font-bold">{lines}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Level:</span>
                <span className="font-mono font-bold">{level}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Game Board */}
        <div className="flex flex-col items-center gap-4">
          {gameOver && (
            <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold">
              GAME OVER
            </div>
          )}

          <div className="bg-gray-800 border-4 border-gray-700 rounded-lg shadow-2xl p-2">
            <div className="bg-black grid grid-cols-10 gap-0" style={{ gridTemplateRows: `repeat(20, 1.5rem)` }}>
              {displayBoard.map((row, y) =>
                row.map((cell, x) => (
                  <div
                    key={`${y}-${x}`}
                    className="border border-gray-800 w-6 h-6"
                    style={getCellStyle(cell)}
                  ></div>
                ))
              )}
            </div>
          </div>

          <div className="text-gray-400 text-xs text-center space-y-1">
            <p>← → Move | ↓ Soft Drop | ↑ Rotate CW</p>
            <p>Z Rotate CCW | Space Hard Drop | C/Shift Hold</p>
          </div>
        </div>

        {/* Next Queue */}
        <div className="bg-gray-800 border-2 border-gray-700 rounded-lg p-3">
          <h3 className="text-white text-sm font-bold mb-2 text-center">NEXT</h3>
          <div className="space-y-2">
            {nextQueue.slice(0, 5).map((type, i) => (
              <div key={i} className="w-20 h-16 bg-black rounded grid grid-cols-4 gap-0 p-1">
                {TETROMINOS[type].shape.map((row, y) =>
                  row.map((cell, x) => (
                    <div
                      key={`next-${i}-${y}-${x}`}
                      className="w-4 h-4"
                      style={cell !== 0 ? { backgroundColor: `rgb(${TETROMINOS[type].color})` } : { backgroundColor: '#000000' }}
                    ></div>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
