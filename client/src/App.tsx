import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { NavLink } from "react-router";

function App() {

  return (
      <div className="min-h-screen flex items-center justify-center bg-background">
		<div className="flex flex-col items-center gap-8">
		  <h1 className="text-6xl font-bold text-foreground">Red Tetris</h1>
		  <div className="flex flex-col gap-4 w-64">
			<NavLink to="/game/play">
		    	<Button size="lg" className="w-full">Play</Button>
			</NavLink>
		    <Button size="lg" variant="outline" className="w-full">Create Room</Button>
		    <Button size="lg" variant="outline" className="w-full">Join Room</Button>
		  </div>
		</div>
	  </div>
  )
}

export default App
