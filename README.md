# 42_red-tetris <img src="https://emojis.slackmojis.com/emojis/images/1643515577/15969/tetris.gif?1643515577"/>

Make a realtime multiplayer tetris clone.

## STACK

- FRONTEND: Vite + React (Need to move to ts instead of js)
- BACKEND: Elysia (handle ws and everything directly)
- STATE MANAGEMENT: Redux 
- SPA (single page application)

We need to follow those rules for the tetris gameplay : [tetris wiki guideline](https://tetris.wiki/Tetris_Guideline)

## Implementation

- First page : Play Solo or create Room buttom or Join a Room
- Room selection page
- Gameplay rule (solo or multiplayer up to 100users) (win / loose render)
- Gamemode (battle royale could be cool, endless)

## FLOW WS messages

-> des mecs join

-> host start_game

<- game_started + first piece

<-> gameplay (move_piece, lock_piece, clear_lines, )

-> game_over : un joueur a perdu

<- game_end 

-><- restart game + reset_state
