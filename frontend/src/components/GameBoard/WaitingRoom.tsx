// ============================================================
// WaitingRoom — Pre-game lobby for online multiplayer
// ============================================================

import React, { useCallback } from "react";
import toast from "react-hot-toast";
import { PlayerInfo } from "dots-and-boxes-shared";
import "./GameBoard.css";

interface WaitingRoomProps {
  roomId: string;
  players: PlayerInfo[];
  maxPlayers: number;
  isCreator: boolean;
  colors: string[];
  onStartGame: () => void;
  onBack: () => void;
}

const WaitingRoom: React.FC<WaitingRoomProps> = ({
  roomId,
  players,
  maxPlayers,
  isCreator,
  colors,
  onStartGame,
  onBack,
}) => {
  const shareableUrl = `${window.location.origin}/game/online/${roomId}`;

  const copyLink = useCallback(() => {
    navigator.clipboard
      .writeText(shareableUrl)
      .then(() => {
        toast.success("Room link copied to clipboard!");
      })
      .catch(() => {
        toast.error("Failed to copy link");
      });
  }, [shareableUrl]);

  const copyRoomId = useCallback(() => {
    navigator.clipboard
      .writeText(roomId)
      .then(() => {
        toast.success("Room ID copied!");
      })
      .catch(() => {
        toast.error("Failed to copy");
      });
  }, [roomId]);

  return (
    <div className="game-root">
      <div className="game-header">
        <button
          className="back-btn"
          onClick={onBack}
          aria-label="Back to lobby"
        >
          &larr; Back
        </button>
      </div>
      <div className="waiting-room">
        <h2>Waiting for players...</h2>

        <div className="room-id-section">
          <div className="room-id" style={{ marginBottom: "0.5rem" }}>
            Room ID: <b>{roomId}</b>
            <button
              className="copy-btn"
              onClick={copyRoomId}
              title="Copy Room ID"
              aria-label="Copy room ID"
            >
              📋
            </button>
          </div>
          <button className="share-btn" onClick={copyLink}>
            🔗 Copy Invite Link
          </button>
        </div>

        <div className="player-count">
          Players joined: <b>{players.length}</b> / <b>{maxPlayers}</b>
        </div>

        <ul className="player-list">
          {Array.from({ length: maxPlayers }).map((_, i) => (
            <li
              key={i}
              className={`player-slot ${players[i] ? "joined" : "empty"}`}
              style={{ borderLeftColor: colors[i] || "#555" }}
            >
              {players[i] ? (
                <>
                  <span className="player-avatar">{players[i].avatar}</span>
                  <span className="player-name" style={{ color: colors[i] }}>
                    {players[i].name}
                  </span>
                </>
              ) : (
                <span className="player-waiting">Waiting...</span>
              )}
            </li>
          ))}
        </ul>

        {isCreator && players.length >= 2 && (
          <button className="start-btn" onClick={onStartGame}>
            🚀 Start Game
          </button>
        )}

        {!isCreator && (
          <p className="waiting-hint">
            Waiting for the room creator to start the game...
          </p>
        )}
      </div>
    </div>
  );
};

export default React.memo(WaitingRoom);
