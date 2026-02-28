// ============================================================
// WaitingRoom tests
// ============================================================

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WaitingRoom from '../components/GameBoard/WaitingRoom';
import { PlayerInfo } from 'dots-and-boxes-shared';

const mockPlayers: PlayerInfo[] = [
  { id: '1', name: 'Alice', color: '#00bcd4', avatar: '🎮' },
];

const mockColors = ['#00bcd4', '#ff4081'];

describe('WaitingRoom', () => {
  const baseProps = {
    roomId: 'test-room-123',
    players: mockPlayers,
    maxPlayers: 2,
    isCreator: false,
    colors: mockColors,
    onStartGame: jest.fn(),
    onBack: jest.fn(),
  };

  it('renders the room ID', () => {
    render(<WaitingRoom {...baseProps} />);
    expect(screen.getByText('test-room-123')).toBeInTheDocument();
  });

  it('shows player count', () => {
    render(<WaitingRoom {...baseProps} />);
    expect(screen.getByText('1')).toBeInTheDocument(); // players joined
    expect(screen.getByText('2')).toBeInTheDocument(); // max players
  });

  it('renders joined player names', () => {
    render(<WaitingRoom {...baseProps} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('shows waiting text for empty slots', () => {
    render(<WaitingRoom {...baseProps} />);
    expect(screen.getByText('Waiting...')).toBeInTheDocument();
  });

  it('does not show start button for non-creator', () => {
    render(<WaitingRoom {...baseProps} />);
    expect(screen.queryByText(/Start Game/)).not.toBeInTheDocument();
  });

  it('shows start button for creator when enough players', () => {
    const twoPlayers: PlayerInfo[] = [
      { id: '1', name: 'Alice', color: '#00bcd4', avatar: '🎮' },
      { id: '2', name: 'Bob', color: '#ff4081', avatar: '🎲' },
    ];
    render(
      <WaitingRoom {...baseProps} players={twoPlayers} isCreator={true} />,
    );
    expect(screen.getByText(/Start Game/)).toBeInTheDocument();
  });

  it('does not show start button for creator with only 1 player', () => {
    render(<WaitingRoom {...baseProps} isCreator={true} />);
    expect(screen.queryByText(/Start Game/)).not.toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = jest.fn();
    render(<WaitingRoom {...baseProps} onBack={onBack} />);
    fireEvent.click(screen.getByText(/Back/));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onStartGame when start button is clicked', () => {
    const onStartGame = jest.fn();
    const twoPlayers: PlayerInfo[] = [
      { id: '1', name: 'Alice', color: '#00bcd4', avatar: '🎮' },
      { id: '2', name: 'Bob', color: '#ff4081', avatar: '🎲' },
    ];
    render(
      <WaitingRoom
        {...baseProps}
        players={twoPlayers}
        isCreator={true}
        onStartGame={onStartGame}
      />,
    );
    fireEvent.click(screen.getByText(/Start Game/));
    expect(onStartGame).toHaveBeenCalledTimes(1);
  });

  it('shows hint for non-creator', () => {
    render(<WaitingRoom {...baseProps} />);
    expect(
      screen.getByText(/Waiting for the room creator/),
    ).toBeInTheDocument();
  });

  it('renders copy invite link button', () => {
    render(<WaitingRoom {...baseProps} />);
    expect(screen.getByText(/Copy Invite Link/)).toBeInTheDocument();
  });
});
