import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useTetris } from '../hooks/useTetris'
import { TetrisBoard } from '../components/TetrisBoard'
import { OpponentBoard } from '../components/OpponentBoard'
import { createEmptyBoard, type Board, type GameState } from '../lib/tetris-engine'

export const Route = createFileRoute('/$room_name/$player_name')({
  component: GameRoom,
})

interface GameData {
  board: number[][];
  score: number;
  linesCleared: number;
}

interface Player {
  id: string
  name: string
  isReady: boolean
  isWinner: boolean
  gameData: GameData | null
  isAlive: boolean
}

interface RoomState {
  command: string
  room: string
  players: Player[]
  playerCount: number
  maxPlayers: number
  minPlayers: number
  canStart: boolean
  gameState: 'waiting' | 'playing' | 'finished'
}

function GameRoom() {
  const { room_name, player_name } = Route.useParams()
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [messages, setMessages] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const hasJoined = useRef(false)
  const boardUpdateThrottle = useRef<number>(0)
  const wsRef = useRef<WebSocket | null>(null)
  const tetrisRef = useRef<any>(null)

  const addMessage = (msg: string) => {
    setMessages((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }

  // Throttled board update sender
  const sendBoardUpdate = useCallback(
    (board: Board, score: number, lines: number) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      const now = Date.now();
      if (now - boardUpdateThrottle.current < 100) return; // Throttle to 100ms

      boardUpdateThrottle.current = now;

      wsRef.current.send(
        JSON.stringify({
          command: 'BOARD_UPDATE',
          args: {
            room_name,
            player_name,
          },
          gameData: {
            board,
            score,
            linesCleared: lines,
          },
        })
      );
    },
    [room_name, player_name]
  );

  // Game over handler
  const handleGameOver = useCallback(
    (finalState: GameState) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      addMessage('Game Over! Sending final state...');
      wsRef.current.send(
        JSON.stringify({
          command: 'GAME_OVER',
          args: {
            room_name,
            player_name,
          },
        })
      );
    },
    [room_name, player_name]
  );

  // Tetris game hook
  const tetris = useTetris({
    onGameOver: handleGameOver,
    onBoardUpdate: sendBoardUpdate,
  });

  tetrisRef.current = tetris;

  useEffect(() => {
    // Connect to WebSocket
    const websocket = new WebSocket('ws://10.13.7.3:3000/ws')
    wsRef.current = websocket

    websocket.onopen = () => {
      console.log('WebSocket connected')
      setIsConnected(true)
      setWs(websocket)

      // Auto-join room on connection
      if (!hasJoined.current) {
        websocket.send(
          JSON.stringify({
            command: 'JOIN',
            args: {
              room_name: room_name,
              player_name: player_name,
            },
          })
        )
        hasJoined.current = true
        addMessage(`Joining room: ${room_name} as ${player_name}`)
      }
    }

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('Received:', data)
        setRoomState(data)
        addMessage(`[${data.command}] ${data.room || ''}`)

        // Start game when server sends GAME_START
        if (data.command === 'GAME_START') {
          setGameStarted(true)
          addMessage('Game starting in 3 seconds...')
          setTimeout(() => {
            if (tetrisRef.current) {
              tetrisRef.current.start()
              addMessage('GO!')
            }
          }, 3000)
        }

        // Handle winner announcement
        if (data.command === 'GAME_WINNER') {
          const winner = data.players.find((p: Player) => p.isWinner)
          if (winner) {
            addMessage(`🏆 ${winner.name} wins the game!`)
          }
        }
      } catch (e) {
        console.error('Failed to parse message:', e)
      }
    }

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error)
      addMessage('WebSocket error occurred')
    }

    websocket.onclose = () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
      addMessage('Disconnected from server')
    }

    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(
          JSON.stringify({
            command: 'LEAVE',
            args: {
              room_name: room_name,
              player_name: player_name,
            },
          })
        )
      }
      websocket.close()
      wsRef.current = null
    }
  }, [room_name, player_name])

  const sendReady = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          command: 'READY',
          args: {
            room_name: room_name,
            player_name: player_name,
          },
        })
      )
      addMessage('Sent READY command')
    }
  }

  const sendLeave = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          command: 'LEAVE',
          args: {
            room_name: room_name,
            player_name: player_name,
          },
        })
      )
      addMessage('Sent LEAVE command')
    }
  }

  // Get opponent players (all players except current)
  const opponentPlayers = roomState?.players.filter(p => p.name !== player_name) || []
  const currentPlayer = roomState?.players.find(p => p.name === player_name)

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Red Tetris</h1>

        {/* Connection Status */}
        <div className="mb-6 flex items-center gap-4">
          <span className={`px-3 py-1 rounded ${isConnected ? 'bg-green-600' : 'bg-red-600'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {roomState && (
            <span className="px-3 py-1 rounded bg-blue-600">
              {roomState.gameState.toUpperCase()}
            </span>
          )}
        </div>

        {/* Game Area - Show when playing */}
        {roomState?.gameState === 'playing' && gameStarted ? (
          <div className="flex flex-col gap-6 mb-6">
            {/* Main Game Boards - Side by Side */}
            <div className="flex justify-center items-start gap-6">
              {/* Opponent Boards - LEFT */}
              <div className="grid grid-cols-1 gap-4">
                {opponentPlayers.length > 0 ? (
                  opponentPlayers.map((opponent, idx) => (
                    <OpponentBoard
                      key={idx}
                      board={opponent.gameData?.board || createEmptyBoard()}
                      playerName={opponent.name}
                      score={opponent.gameData?.score || 0}
                      lines={opponent.gameData?.linesCleared || 0}
                      isAlive={opponent.isAlive}
                    />
                  ))
                ) : (
                  <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
                    Waiting for opponents...
                  </div>
                )}
              </div>

              {/* Current Player Board - RIGHT */}
              <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <TetrisBoard board={tetris.board} />

                {/* Game Over Overlay */}
                {tetris.gameState.gameOver && (
                  <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                    <div className="text-center">
                      <h2 className="text-4xl font-bold text-red-500 mb-4">GAME OVER</h2>
                      <p className="text-xl text-white mb-2">Final Score: {tetris.gameState.score}</p>
                      <p className="text-lg text-white">Lines: {tetris.gameState.lines}</p>
                    </div>
                  </div>
                )}

                {/* Paused Overlay */}
                {tetris.isPaused && tetris.isStarted && !tetris.gameState.gameOver && (
                  <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                    <h2 className="text-3xl font-bold text-yellow-400">PAUSED</h2>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="bg-gray-800 rounded-lg p-4 w-64">
                <h3 className="text-lg font-semibold mb-2 text-center">{player_name}</h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-gray-400 text-sm">Score</p>
                    <p className="text-2xl font-bold text-white">{tetris.gameState.score}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Lines</p>
                    <p className="text-2xl font-bold text-white">{tetris.gameState.lines}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Level</p>
                    <p className="text-2xl font-bold text-white">{tetris.gameState.level}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Next</p>
                    {tetris.gameState.nextPiece && (
                      <div className="flex justify-center mt-1">
                        <div className="grid gap-[1px]" style={{ gridTemplateColumns: `repeat(${tetris.gameState.nextPiece.shape[0].length}, 12px)` }}>
                          {tetris.gameState.nextPiece.shape.map((row, y) =>
                            row.map((cell, x) => {
                              const colors: Record<number, string> = {
                                0: 'bg-transparent',
                                1: 'bg-cyan-500',
                                2: 'bg-yellow-500',
                                3: 'bg-purple-500',
                                4: 'bg-green-500',
                                5: 'bg-red-500',
                                6: 'bg-blue-500',
                                7: 'bg-orange-500',
                              };
                              return (
                                <div
                                  key={`${y}-${x}`}
                                  className={`w-3 h-3 ${cell ? colors[tetris.gameState.nextPiece!.color] : 'bg-transparent'}`}
                                />
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        ) : (
          /* Waiting Room UI */
          <div className="max-w-4xl mx-auto">
            {/* Room Info */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-4">Room: {room_name}</h2>
              <p className="text-lg mb-2">Player: {player_name}</p>
              {roomState && (
                <>
                  <p className="mb-2">Players: {roomState.playerCount} / {roomState.maxPlayers}</p>
                  <p className="mb-2">Required: At least {roomState.minPlayers} players</p>
                  <p className="mb-4">Can Start: {roomState.canStart ? '✅' : '❌'}</p>
                </>
              )}
            </div>

            {/* Players List */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold mb-3">Players</h3>
              {roomState && roomState.players.length > 0 ? (
                <ul className="space-y-2">
                  {roomState.players.map((player, idx) => (
                    <li key={idx} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                      <span className="font-medium">{player.name}</span>
                      <div className="flex gap-2">
                        {player.isReady && <span className="px-2 py-1 bg-green-600 rounded text-sm">Ready</span>}
                        {player.isWinner && <span className="px-2 py-1 bg-yellow-500 rounded text-sm">Winner</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400">No players yet</p>
              )}
            </div>

            {/* Controls */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold mb-3">Controls</h3>
              <div className="flex gap-4">
                <button
                  onClick={sendReady}
                  disabled={!isConnected || roomState?.gameState !== 'waiting' || currentPlayer?.isReady}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition"
                >
                  {currentPlayer?.isReady ? 'Ready ✓' : 'Ready'}
                </button>
                <button
                  onClick={sendLeave}
                  disabled={!isConnected}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition"
                >
                  Leave Room
                </button>
              </div>
            </div>

            {/* Message Log */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-3">Message Log</h3>
              <div className="bg-gray-900 rounded p-4 h-64 overflow-y-auto font-mono text-sm">
                {messages.map((msg, idx) => (
                  <div key={idx} className="mb-1 text-gray-300">{msg}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Winner Announcement */}
        {roomState?.gameState === 'finished' && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-12 text-center max-w-md">
              <h2 className="text-5xl font-bold text-yellow-400 mb-6">Game Over!</h2>
              {roomState.players.find(p => p.isWinner) && (
                <>
                  <p className="text-3xl mb-4">
                    🏆 {roomState.players.find(p => p.isWinner)?.name} Wins!
                  </p>
                  <div className="bg-gray-700 rounded p-4 mb-6">
                    <p className="text-xl mb-2">
                      Score: {roomState.players.find(p => p.isWinner)?.gameData?.score || 0}
                    </p>
                    <p className="text-xl">
                      Lines: {roomState.players.find(p => p.isWinner)?.gameData?.linesCleared || 0}
                    </p>
                  </div>
                </>
              )}
              <button
                onClick={sendLeave}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition"
              >
                Leave Room
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
