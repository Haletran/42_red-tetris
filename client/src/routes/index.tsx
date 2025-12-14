import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import logo from '../logo.svg'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const navigate = useNavigate()
  const [roomName, setRoomName] = useState('')
  const [playerName, setPlayerName] = useState('')

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (roomName.trim() && playerName.trim()) {
      navigate({ to: '/$room_name/$player_name', params: { room_name: roomName, player_name: playerName } })
    }
  }

  return (
    <div className="text-center">
      <header className="min-h-screen flex flex-col items-center justify-center bg-[#282c34] text-white">
        <img
          src={logo}
          className="h-[30vmin] pointer-events-none animate-[spin_20s_linear_infinite] mb-8"
          alt="logo"
        />
        <h1 className="text-5xl font-bold mb-8">Red Tetris</h1>

        <form onSubmit={handleJoin} className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="mb-6">
            <label htmlFor="roomName" className="block text-left mb-2 text-sm font-medium">
              Room Name
            </label>
            <input
              id="roomName"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              placeholder="Enter room name"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="playerName" className="block text-left mb-2 text-sm font-medium">
              Player Name
            </label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              placeholder="Enter your name"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition"
          >
            Join Game
          </button>
        </form>
      </header>
    </div>
  )
}
