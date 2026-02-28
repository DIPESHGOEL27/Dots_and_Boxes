// ============================================================
// Game — Route wrapper that parses URL params and renders GameBoard
// Supports /game/local, /game/ai, /game/online/:roomId
// ============================================================

import React, { useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  PlayerInfo,
  AIDifficulty,
  PLAYER_COLORS,
  DEFAULT_PLAYER_NAMES,
  PLAYER_AVATARS,
  DEFAULT_GRID_SIZE,
  DEFAULT_PLAYERS,
} from 'dots-and-boxes-shared';
import { GameBoard, GameMode } from '../components/GameBoard';

interface GameRouteProps {
  mode: GameMode;
}

const Game: React.FC<GameRouteProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId?: string }>();
  const [searchParams] = useSearchParams();

  const gridSize = Number(searchParams.get('gridSize')) || DEFAULT_GRID_SIZE;
  const playerCount = Number(searchParams.get('playerCount')) || DEFAULT_PLAYERS;
  const difficulty = (searchParams.get('difficulty') as AIDifficulty) || 'medium';

  const playerInfo: PlayerInfo = useMemo(
    () => ({
      id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: searchParams.get('playerName') || DEFAULT_PLAYER_NAMES[0],
      color: searchParams.get('playerColor') || PLAYER_COLORS[0],
      avatar: searchParams.get('playerAvatar') || PLAYER_AVATARS[0],
    }),
    // Only create once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleBack = () => {
    navigate('/');
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
