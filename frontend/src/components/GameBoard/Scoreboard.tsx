// ============================================================
// Scoreboard — Displays player scores and turn indicator
// ============================================================

import React from "react";
import { PlayerInfo } from "dots-and-boxes-shared";
import "./GameBoard.css";

interface ScoreboardProps {
  players: PlayerInfo[];
  scores: number[];
  currentPlayer: number;
  colors: string[];
}

const Scoreboard: React.FC<ScoreboardProps> = ({
  players,
  scores,
  currentPlayer,
  colors,
}) => {
  return (
    <div className="scores-block">
      {players.map((player, idx) => (
        <div key={player.id || idx} className="score-row">
          <span className="score-avatar">{player.avatar}</span>
          <span
            className={`score-name ${currentPlayer === idx ? "active" : ""}`}
            style={{ color: colors[idx] || player.color }}
          >
            {player.name}
          </span>
          <span className="score-value">
            {scores[idx] !== undefined ? scores[idx] : 0}
          </span>
        </div>
      ))}
    </div>
  );
};

export default React.memo(Scoreboard);
