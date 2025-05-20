import React, { useState } from "react";
import GameBoard from "./components/GameBoard";
import "./App.css";

const gridOptions = [3, 4, 5, 6, 7, 8];
const playerColors = ["#00bcd4", "#ff4081", "#ffc107", "#8bc34a"];
const playerNameOptions = ["Player 1", "Player 2", "Player 3", "Player 4"];

function App() {
  const [stage, setStage] = useState("lobby");
  const [gridSize, setGridSize] = useState(4);
  const [mode, setMode] = useState("local");
  const [roomId, setRoomId] = useState("");
  const [localPlayers, setLocalPlayers] = useState(2);

  const handleStart = () => {
    setStage("game");
  };

  return (
    <div className="app-root">
      {stage === "lobby" && (
        <div className="lobby-card">
          <h1>Dots & Boxes</h1>
          <div className="lobby-section">
            <label>Grid Size:</label>
            <select
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
            >
              {gridOptions.map((size) => (
                <option key={size} value={size}>
                  {size} x {size}
                </option>
              ))}
            </select>
          </div>
          <div className="lobby-section">
            <label>Mode:</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="local">Local Multiplayer</option>
              <option value="online">Online Multiplayer</option>
            </select>
          </div>
          {mode === "local" && (
            <div className="lobby-section">
              <label>Number of Players:</label>
              <select
                value={localPlayers}
                onChange={(e) => setLocalPlayers(Number(e.target.value))}
              >
                {[2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}
          {mode === "online" && (
            <div className="lobby-section">
              <label>Room ID:</label>
              <input
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Leave blank to create"
              />
            </div>
          )}
          <button className="start-btn" onClick={handleStart}>
            Start Game
          </button>
        </div>
      )}
      {stage === "game" && (
        <GameBoard
          gridSize={gridSize}
          mode={mode}
          roomId={roomId}
          playerColors={playerColors.slice(
            0,
            mode === "local" ? localPlayers : 2
          )}
          playerNames={playerNameOptions.slice(
            0,
            mode === "local" ? localPlayers : 2
          )}
          localPlayers={localPlayers}
          onBack={() => setStage("lobby")}
        />
      )}
    </div>
  );
}

export default App;
