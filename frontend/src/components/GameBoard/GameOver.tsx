// ============================================================
// GameOver — Game-over screen with results and confetti
// ============================================================

import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { PlayerInfo } from 'dots-and-boxes-shared';
import { playSound } from '../../utils/sounds';
import './GameBoard.css';

interface GameOverProps {
  players: PlayerInfo[];
  scores: number[];
  colors: string[];
  winner: number | null;       // null = draw
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

const GameOver: React.FC<GameOverProps> = ({
  players,
  scores,
  colors,
  winner,
  onPlayAgain,
  onBackToLobby,
}) => {
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    if (hasPlayedRef.current) return;
    hasPlayedRef.current = true;

    playSound('gameOver');

    // Fire confetti for the winner
    if (winner !== null) {
      const color = colors[winner] || '#00bcd4';
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: [color, '#ffffff', '#ffc107'],
      });
    } else {
      // Draw — small confetti for everyone
      confetti({
        particleCount: 60,
        spread: 120,
        origin: { y: 0.6 },
        colors: colors.slice(0, players.length),
      });
    }
  }, [winner, colors, players.length]);

  const isDraw = winner === null;
  const winnerName = winner !== null ? players[winner]?.name || `Player ${winner + 1}` : '';
  const winnerAvatar = winner !== null ? players[winner]?.avatar || '🏆' : '';

  // Sort players by score for leaderboard
  const ranked = players
    .map((p, i) => ({ ...p, score: scores[i] ?? 0, index: i }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="game-over-overlay">
      <div className="game-over-card">
        <div className="game-over-title">
          {isDraw ? (
            <>🤝 It&apos;s a Draw!</>
          ) : (
            <>
              <span className="winner-avatar">{winnerAvatar}</span>
              <span style={{ color: colors[winner!] }}>{winnerName}</span> Wins!
            </>
          )}
        </div>

        <div className="leaderboard">
          {ranked.map((player, rank) => (
            <div
              key={player.id || player.index}
              className={`leaderboard-row ${rank === 0 ? 'first-place' : ''}`}
              style={{ borderLeftColor: colors[player.index] || '#555' }}
            >
              <span className="rank">#{rank + 1}</span>
              <span className="lb-avatar">{player.avatar}</span>
              <span className="lb-name" style={{ color: colors[player.index] }}>
                {player.name}
              </span>
              <span className="lb-score">{player.score}</span>
            </div>
          ))}
        </div>

        <div className="game-over-actions">
          <button className="start-btn" onClick={onPlayAgain}>
            🔄 Play Again
          </button>
          <button className="back-btn" onClick={onBackToLobby}>
            🏠 Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(GameOver);
