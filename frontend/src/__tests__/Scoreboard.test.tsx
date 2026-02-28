// ============================================================
// Scoreboard tests
// ============================================================

import React from 'react';
import { render, screen } from '@testing-library/react';
import Scoreboard from '../components/GameBoard/Scoreboard';
import { PlayerInfo } from 'dots-and-boxes-shared';

const mockPlayers: PlayerInfo[] = [
  { id: '1', name: 'Alice', color: '#00bcd4', avatar: '🎮' },
  { id: '2', name: 'Bob', color: '#ff4081', avatar: '🎲' },
];

const mockScores = [3, 5];
const mockColors = ['#00bcd4', '#ff4081'];

describe('Scoreboard', () => {
  it('renders all player names', () => {
    render(
      <Scoreboard
        players={mockPlayers}
        scores={mockScores}
        currentPlayer={0}
        colors={mockColors}
      />,
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders all player scores', () => {
    render(
      <Scoreboard
        players={mockPlayers}
        scores={mockScores}
        currentPlayer={0}
        colors={mockColors}
      />,
    );

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders player avatars', () => {
    render(
      <Scoreboard
        players={mockPlayers}
        scores={mockScores}
        currentPlayer={0}
        colors={mockColors}
      />,
    );

    expect(screen.getByText('🎮')).toBeInTheDocument();
    expect(screen.getByText('🎲')).toBeInTheDocument();
  });

  it('highlights the active player', () => {
    render(
      <Scoreboard
        players={mockPlayers}
        scores={mockScores}
        currentPlayer={0}
        colors={mockColors}
      />,
    );

    const aliceName = screen.getByText('Alice');
    const bobName = screen.getByText('Bob');

    expect(aliceName.className).toContain('active');
    expect(bobName.className).not.toContain('active');
  });

  it('updates active player when currentPlayer changes', () => {
    const { rerender } = render(
      <Scoreboard
        players={mockPlayers}
        scores={mockScores}
        currentPlayer={1}
        colors={mockColors}
      />,
    );

    const bobName = screen.getByText('Bob');
    expect(bobName.className).toContain('active');
  });
});
