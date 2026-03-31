// ============================================================
// Game — Route wrapper that parses URL params and renders GameBoard
// Supports /game/local, /game/ai, /game/online/:roomId
// ============================================================

import React, { useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  PlayerInfo,
  AIDifficulty,
  AI_DIFFICULTIES,
  PLAYER_COLORS,
  DEFAULT_PLAYER_NAMES,
  PLAYER_AVATARS,
  DEFAULT_GRID_SIZE,
  DEFAULT_PLAYERS,
  isValidGridSize,
  isValidPlayerCount,
} from "dots-and-boxes-shared";
import { GameBoard, GameMode } from "../components/GameBoard";

interface GameRouteProps {
  mode: GameMode;
}

const Game: React.FC<GameRouteProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId?: string }>();
  const [searchParams] = useSearchParams();

  const requestedGridSize = Number(searchParams.get("gridSize"));
  const requestedPlayerCount = Number(searchParams.get("playerCount"));
  const requestedDifficulty = searchParams.get("difficulty") as AIDifficulty | null;

  const gridSize = isValidGridSize(requestedGridSize)
    ? requestedGridSize
    : DEFAULT_GRID_SIZE;
  const playerCount = isValidPlayerCount(requestedPlayerCount)
    ? requestedPlayerCount
    : DEFAULT_PLAYERS;
  const difficulty =
    requestedDifficulty && AI_DIFFICULTIES.includes(requestedDifficulty)
      ? requestedDifficulty
      : "medium";

  const playerInfo: PlayerInfo = useMemo(
    () => {
      let stablePlayerId = localStorage.getItem("dots-boxes-player-id");
      if (!stablePlayerId) {
        stablePlayerId =
          `player-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem("dots-boxes-player-id", stablePlayerId);
      }

      return {
        id: stablePlayerId,
        name: searchParams.get("playerName") || DEFAULT_PLAYER_NAMES[0],
        color: searchParams.get("playerColor") || PLAYER_COLORS[0],
        avatar: searchParams.get("playerAvatar") || PLAYER_AVATARS[0],
      };
    },
    // Only create once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleBack = () => {
    navigate("/");
  };

  return (
    <GameBoard
      gridSize={gridSize}
      mode={mode}
      roomId={roomId}
      playerCount={playerCount}
      playerInfo={playerInfo}
      aiDifficulty={difficulty}
      onBack={handleBack}
    />
  );
};

export default Game;
