import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useRef } from 'react'

export const Route = createFileRoute('/$room_name/$player_name')({
  component: GameRoom,
})

interface Player {
  id: string
  name: string
  isReady: boolean
  isWinner: boolean
}

interface RoomState {
  command: string
  room: string
  players: Player[]
  playerCount: number
  canStart: boolean
  gameState: 'waiting' | 'playing' | 'finished'
}

function GameRoom() {
  const { room_name, player_name } = Route.useParams()
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [messages, setMessages] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const hasJoined = useRef(false)

  useEffect(() => {
    // Connect to WebSocket
    const websocket = new WebSocket('ws://localhost:3000/ws')

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
    }
  }, [room_name, player_name])

  const addMessage = (msg: string) => {
    setMessages((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }

  const sendReady = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
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
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
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

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Red Tetris</h1>

        {/* Connection Status */}
        <div className="mb-6">
          <span className={`px-3 py-1 rounded ${isConnected ? 'bg-green-600' : 'bg-red-600'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Room Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Room: {room_name}</h2>
          <p className="text-lg mb-2">Player: {player_name}</p>
          {roomState && (
            <>
              <p className="mb-2">Game State: <span className="font-bold text-yellow-400">{roomState.gameState}</span></p>
              <p className="mb-2">Players: {roomState.playerCount} / 2</p>
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
              disabled={!isConnected || roomState?.gameState !== 'waiting'}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold transition"
            >
              Ready
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
    </div>
  )
}
