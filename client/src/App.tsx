import { useState, useEffect, useCallback, useRef } from "react";
import { parseRoomUser } from "@/lib/parseRoomUser";
import Board from "@/components/Board";
import { usePlayer } from "@/hooks/usePlayer";
import { useGameBoard, createStage } from "@/hooks/useGameBoard";
import { useWebSocket } from "@/hooks/useWebSocket";

function App() {
  const [roomInfo, setRoomInfo] = useState<{
    room: string;
    username: string;
  } | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [dropTime, setDropTime] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [playerCount, setPlayerCount] = useState(0);
  const [canStart, setCanStart] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [loser, setLoser] = useState<string | null>(null);
  const [opponentStage, setOpponentStage] = useState<any>(null);
  const [opponentUsername, setOpponentUsername] = useState<string>("");
  const hasJoined = useRef(false);

  // Player hook
  const { player, movePlayer, dropPlayer, rotatePlayer, resetPlayer } =
    usePlayer(() => {
      setGameOver(true);
    });

  // Game board hook
  const { stage, setStage, rowsCleared } = useGameBoard(player, resetPlayer);

  // WebSocket hook
  const { isConnected, messages, sendCommand } = useWebSocket({
    url: "ws://192.168.8.233:3000/ws",
    onMessage: (data) => {
      console.log("Received game message:", data);

      switch (data.command) {
        case "JOINED":
          setPlayerCount(data.playerCount);
          setCanStart(data.canStart);
          setIsCreator(data.isCreator);
          setPlayers(data.players);
          break;

        case "ROOM_UPDATE":
          setPlayerCount(data.playerCount);
          setCanStart(data.canStart);
          setPlayers(data.players);
          break;

        case "GAME_STARTED":
          setGameStarted(true);
          setGameOver(false);
          setWinner(null);
          setLoser(null);
          setDropTime(1000);
          setStage(createStage());
          resetPlayer();
          break;

        case "GAME_END":
          setGameStarted(false);
          setGameOver(true);
          setDropTime(null);
          setWinner(data.winner);
          setLoser(data.loser);
          break;

        case "PLAYER_LEFT":
          setPlayerCount(data.remainingPlayers);
          break;

        case "BOARD_UPDATE":
          if (data.username !== roomInfo?.username) {
            setOpponentStage(data.stage);
            setOpponentUsername(data.username);
          }
          break;
      }
    },
  });

  // Parse URL hash on mount
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash) {
        const parsed = parseRoomUser(hash);
        if (parsed) {
          setRoomInfo(parsed);
        }
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  // Auto-join room when connected and roomInfo is available
  useEffect(() => {
    if (
      isConnected &&
      roomInfo &&
      roomInfo.room &&
      roomInfo.username &&
      !hasJoined.current
    ) {
      console.log(
        "Auto-joining room - isConnected:",
        isConnected,
        "roomInfo:",
        roomInfo,
      );
      hasJoined.current = true;

      // Add a small delay to ensure WebSocket is fully ready
      setTimeout(() => {
        console.log("Sending JOIN command...");
        sendCommand("JOIN", {
          room: roomInfo.room,
          username: roomInfo.username,
        });
      }, 100);
    }
  }, [isConnected, roomInfo, sendCommand]);

  // Handle keyboard controls
  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (!gameStarted || gameOver) return;

      if (event.key === "ArrowLeft") {
        movePlayer(stage, -1);
        sendCommand("MOVE_LEFT", {
          room: roomInfo?.room,
          username: roomInfo?.username,
        });
      } else if (event.key === "ArrowRight") {
        movePlayer(stage, 1);
        sendCommand("MOVE_RIGHT", {
          room: roomInfo?.room,
          username: roomInfo?.username,
        });
      } else if (event.key === "ArrowDown") {
        dropPlayer(stage);
        sendCommand("MOVE_DOWN", {
          room: roomInfo?.room,
          username: roomInfo?.username,
        });
      } else if (event.key === "ArrowUp" || event.key === " ") {
        rotatePlayer(stage, 1);
        sendCommand("ROTATE", {
          room: roomInfo?.room,
          username: roomInfo?.username,
        });
      }
    },
    [
      gameStarted,
      gameOver,
      stage,
      movePlayer,
      dropPlayer,
      rotatePlayer,
      sendCommand,
      roomInfo,
    ],
  );

  // Attach keyboard listener
  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  // Auto drop tetromino
  useEffect(() => {
    if (!dropTime || !gameStarted || gameOver) return;

    const interval = setInterval(() => {
      dropPlayer(stage);
    }, dropTime);

    return () => clearInterval(interval);
  }, [dropTime, gameStarted, gameOver, dropPlayer, stage]);

  // Start game (only creator can start)
  const handleStartGame = () => {
    if (!canStart) return;
    sendCommand("START", {
      room: roomInfo?.room,
      username: roomInfo?.username,
    });
  };

  // Handle game over
  useEffect(() => {
    if (gameOver && gameStarted && roomInfo) {
      sendCommand("GAME_OVER", {
        room: roomInfo.room,
        username: roomInfo.username,
      });
    }
  }, [gameOver, gameStarted, roomInfo, sendCommand]);

  // Send board updates to server
  useEffect(() => {
    if (gameStarted && !gameOver && roomInfo) {
      sendCommand("BOARD_UPDATE", {
        room: roomInfo.room,
        username: roomInfo.username,
        stage: stage,
      });
    }
  }, [stage, gameStarted, gameOver, roomInfo, sendCommand]);

  return (
    <div
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "100vh",
        background: "#000",
      }}
    >
      <h1 style={{ color: "#fff", marginBottom: "20px" }}>Red Tetris</h1>

      <div style={{ marginBottom: "20px", color: "#fff", textAlign: "center" }}>
        <p>Status: {isConnected ? "🟢 Connected" : "🔴 Disconnected"}</p>
        {roomInfo ? (
          <>
            <p>
              Room: <strong>{roomInfo.room}</strong> | User:{" "}
              <strong>{roomInfo.username}</strong>
              {isCreator && (
                <span style={{ color: "#FFD700" }}> 👑 (Creator)</span>
              )}
            </p>
            <p>Players in room: {playerCount} / 2</p>
          </>
        ) : (
          <p style={{ color: "#666" }}>
            Navigate to: <code>http://localhost:5173/#roomname[username]</code>
          </p>
        )}
      </div>

      {roomInfo && isConnected && (
        <>
          {winner || loser ? (
            <div
              style={{ textAlign: "center", color: "#fff", marginTop: "20px" }}
            >
              <h2
                style={{
                  fontSize: "48px",
                  marginBottom: "20px",
                  color: winner === roomInfo.username ? "#4CAF50" : "#F44336",
                }}
              >
                {winner === roomInfo.username
                  ? "🎉 YOU WIN! 🎉"
                  : "💀 YOU LOSE 💀"}
              </h2>
              <p style={{ fontSize: "24px" }}>
                Winner: <strong style={{ color: "#4CAF50" }}>{winner}</strong>
              </p>
              <p style={{ fontSize: "24px" }}>
                Loser: <strong style={{ color: "#F44336" }}>{loser}</strong>
              </p>
              <button
                onClick={() => window.location.reload()}
                style={{
                  marginTop: "20px",
                  padding: "10px 20px",
                  fontSize: "18px",
                  cursor: "pointer",
                  background: "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                }}
              >
                Play Again
              </button>
            </div>
          ) : !gameStarted ? (
            <div style={{ textAlign: "center", color: "#fff" }}>
              <div style={{ marginBottom: "20px" }}>
                <h3>Players:</h3>
                {players.map((p) => (
                  <p key={p.name}>
                    {p.name} {p.isCreator && "👑"}
                  </p>
                ))}
              </div>
              {canStart ? (
                <>
                  {isCreator ? (
                    <>
                      <p style={{ marginBottom: "10px" }}>
                        All players ready! You can start the game.
                      </p>
                      <button
                        onClick={handleStartGame}
                        style={{
                          padding: "10px 20px",
                          fontSize: "18px",
                          cursor: "pointer",
                          background: "#4CAF50",
                          color: "white",
                          border: "none",
                          borderRadius: "5px",
                        }}
                      >
                        Start Game
                      </button>
                    </>
                  ) : (
                    <p>Waiting for creator to start the game...</p>
                  )}
                </>
              ) : (
                <p>Waiting for 2 players to join... ({playerCount}/2)</p>
              )}
            </div>
          ) : (
            <div
              style={{ display: "flex", gap: "30px", alignItems: "flex-start" }}
            >
              <div>
                <h3
                  style={{
                    color: "#fff",
                    textAlign: "center",
                    marginBottom: "10px",
                  }}
                >
                  You ({roomInfo?.username})
                </h3>
                <Board stage={stage} />
                {gameOver && (
                  <div
                    style={{
                      color: "red",
                      fontSize: "24px",
                      fontWeight: "bold",
                      marginTop: "10px",
                      textAlign: "center",
                    }}
                  >
                    GAME OVER
                  </div>
                )}
              </div>

              {opponentStage && (
                <div>
                  <h3
                    style={{
                      color: "#fff",
                      textAlign: "center",
                      marginBottom: "10px",
                      fontSize: "16px",
                    }}
                  >
                    {opponentUsername}
                  </h3>
                  <Board stage={opponentStage} small />
                </div>
              )}

              <div style={{ color: "#fff" }}>
                <h3>Controls:</h3>
                <ul>
                  <li>← → : Move left/right</li>
                  <li>↓ : Move down</li>
                  <li>↑ or Space : Rotate</li>
                </ul>
                <h3>Stats:</h3>
                <p>Rows cleared: {rowsCleared}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
