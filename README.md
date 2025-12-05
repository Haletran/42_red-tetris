# 42_red-tetris


## FLOW WS messages

-> 2 mecs join
-> host start_game
<- game_started + first piece
<-> gameplay (move_piece, lock_piece, clear_lines, )
-> game_over : un joueur a perdu
<- game_end 
-><- restart game + reset_state
