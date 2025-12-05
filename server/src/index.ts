import { Elysia } from "elysia";


const app = new Elysia()
		.get("/", () => "Red Tetris")
		.ws('/game/:room', {
			open(ws) {
				const { room } = ws.data.params
				ws.subscribe(room)
				console.log(`Player connected to ${room}`)
			},
			message(ws, { message }) {
				const data = JSON.parse(message)
				console.log('message from ', ws.data.params.room, data)
			},
			close(ws) {
				console.log('Disconnected from', ws.data.params.room)
		}
})
		

app.listen(3000)

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
