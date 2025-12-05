# 42_red-tetris

Make a realtime multiplayer tetris clone.

## STACK

- FRONTEND: Vite + React (Need to move to ts instead of js)
- BACKEND: Elysia (handle ws and everything directly)
- STATE MANAGEMENT: Redux 
- SPA (single page application)

## FLOW WS messages

-> des mecs join

-> host start_game

<- game_started + first piece

<-> gameplay (move_piece, lock_piece, clear_lines, )

-> game_over : un joueur a perdu

<- game_end 

-><- restart game + reset_state
