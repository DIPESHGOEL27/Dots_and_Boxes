// ============================================================
// Home — Landing page / lobby with game mode selection
// Features player customization, grid size, and mode selection.
// ============================================================

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GRID_OPTIONS,
  PLAYER_COLORS,
  DEFAULT_PLAYER_NAMES,
  PLAYER_AVATARS,
  AI_DIFFICULTIES,
  AIDifficulty,
} from 'dots-and-boxes-shared';
import { isMuted, toggleMute } from '../utils/sounds';
import '../App.css';

const Home: React.FC = () => {
  const navigate = useNavigate();

  // Player customization
  const [playerName, setPlayerName] = useState(
    () => localStorage.getItem('dots-boxes-name') || DEFAULT_PLAYER_NAMES[0],
  );
  const [playerColor, setPlayerColor] = useState(
    () => localStorage.getItem('dots-boxes-color') || PLAYER_COLORS[0],
  );
  const [playerAvatar, setPlayerAvatar] = useState(
    () => localStorage.getItem('dots-boxes-avatar') || PLAYER_AVATARS[0],
  );

  // Game settings
  const [gridSize, setGridSize] = useState(4);
  const [mode, setMode] = useState<'local' | 'ai' | 'online'>('local');
  const [localPlayers, setLocalPlayers] = useState(2);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [muted, setMuted] = useState(isMuted());

  const handleToggleMute = useCallback(() => {
    const newMuted = toggleMute();
    setMuted(newMuted);
  }, []);

  const savePlayerPrefs = useCallback(() => {
    localStorage.setItem('dots-boxes-name', playerName);
    localStorage.setItem('dots-boxes-color', playerColor);
    localStorage.setItem('dots-boxes-avatar', playerAvatar);
  }, [playerName, playerColor, playerAvatar]);

  const handleStart = useCallback(() => {
    savePlayerPrefs();

    const params = new URLSearchParams({
      gridSize: String(gridSize),
      playerCount: String(mode === 'local' ? localPlayers : 2),
      playerName,
      playerColor,
      playerAvatar,
    });

    switch (mode) {
      case 'local':
        navigate(`/game/local?${params.toString()}`);
        break;
      case 'ai':
        params.set('difficulty', aiDifficulty);
        navigate(`/game/ai?${params.toString()}`);
        break;
      case 'online':
        if (joinRoomId.trim()) {
          navigate(`/game/online/${joinRoomId.trim()}?${params.toString()}`);
        } else {
          navigate(`/game/online?${params.toString()}`);
        }
        break;
    }
  }, [mode, gridSize, localPlayers, aiDifficulty, joinRoomId, playerName, playerColor, playerAvatar, navigate, savePlayerPrefs]);

  return (
    <div className="app-root">
      <div className="lobby-card">
        <div className="lobby-title-row">
          <h1>Dots &amp; Boxes</h1>
          <button
            className="mute-btn"
            onClick={handleToggleMute}
            title={muted ? 'Unmute sounds' : 'Mute sounds'}
            aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>

        {/* Player Customization */}
        <fieldset className="lobby-fieldset">
          <legend>Your Profile</legend>

          <div className="lobby-section">
            <label htmlFor="player-name">Name:</label>
            <input
              id="player-name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
              placeholder="Your name"
              maxLength={20}
            />
          </div>

          <div className="lobby-section">
            <label>Avatar:</label>
            <div className="avatar-picker">
              {PLAYER_AVATARS.map((av) => (
                <button
                  key={av}
                  className={`avatar-option ${playerAvatar === av ? 'selected' : ''}`}
                  onClick={() => setPlayerAvatar(av)}
                  aria-label={`Select avatar ${av}`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          <div className="lobby-section">
            <label>Color:</label>
            <div className="color-picker">
              {PLAYER_COLORS.map((c) => (
                <button
                  key={c}
                  className={`color-option ${playerColor === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setPlayerColor(c)}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>
        </fieldset>

        {/* Game Settings */}
        <fieldset className="lobby-fieldset">
          <legend>Game Settings</legend>

          <div className="lobby-section">
            <label htmlFor="grid-size">Grid Size:</label>
            <select
              id="grid-size"
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
            >
              {GRID_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} &times; {size} ({(size - 1) * (size - 1)} boxes)
                </option>
              ))}
            </select>
          </div>

          <div className="lobby-section">
            <label htmlFor="mode">Mode:</label>
            <div className="mode-picker">
              <button
                className={`mode-btn ${mode === 'local' ? 'active' : ''}`}
                onClick={() => setMode('local')}
              >
                👥 Local
              </button>
              <button
                className={`mode-btn ${mode === 'ai' ? 'active' : ''}`}
                onClick={() => setMode('ai')}
              >
                🤖 vs AI
              </button>
              <button
                className={`mode-btn ${mode === 'online' ? 'active' : ''}`}
                onClick={() => setMode('online')}
              >
                🌐 Online
              </button>
            </div>
          </div>

          {mode === 'local' && (
            <div className="lobby-section">
              <label htmlFor="player-count">Players:</label>
              <select
                id="player-count"
                value={localPlayers}
                onChange={(e) => setLocalPlayers(Number(e.target.value))}
              >
                {[2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} Players
                  </option>
                ))}
              </select>
            </div>
          )}

          {mode === 'ai' && (
            <div className="lobby-section">
              <label htmlFor="ai-difficulty">AI Difficulty:</label>
              <div className="difficulty-picker">
                {AI_DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    className={`difficulty-btn ${aiDifficulty === d ? 'active' : ''}`}
                    onClick={() => setAiDifficulty(d)}
                  >
                    {d === 'easy' && '😊 Easy'}
                    {d === 'medium' && '🧠 Medium'}
                    {d === 'hard' && '💀 Hard'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'online' && (
            <div className="lobby-section">
              <label htmlFor="room-id">Room ID (leave blank to create):</label>
              <input
                id="room-id"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="Paste room ID or link"
              />
            </div>
          )}
        </fieldset>

        <button className="start-btn" onClick={handleStart}>
          🚀 Start Game
        </button>
      </div>
    </div>
  );
};

export default Home;
