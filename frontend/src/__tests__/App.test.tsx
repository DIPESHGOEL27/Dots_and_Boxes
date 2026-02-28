// ============================================================
// App routing tests
// ============================================================

import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock sounds module
jest.mock('../utils/sounds', () => ({
  isMuted: jest.fn(() => false),
  toggleMute: jest.fn(() => true),
  playSound: jest.fn(),
}));

describe('App', () => {
  it('renders the lobby page by default', () => {
    render(<App />);
    expect(screen.getByText(/Dots & Boxes/)).toBeInTheDocument();
  });

  it('renders mode selection buttons', () => {
    render(<App />);
    expect(screen.getByText(/Local/)).toBeInTheDocument();
    expect(screen.getByText(/vs AI/)).toBeInTheDocument();
    expect(screen.getByText(/Online/)).toBeInTheDocument();
  });

  it('renders grid size selector', () => {
    render(<App />);
    expect(screen.getByLabelText(/Grid Size/)).toBeInTheDocument();
  });

  it('renders player name input', () => {
    render(<App />);
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
  });

  it('renders start game button', () => {
    render(<App />);
    expect(screen.getByText(/Start Game/)).toBeInTheDocument();
  });

  it('renders mute button', () => {
    render(<App />);
    expect(screen.getByText('🔊')).toBeInTheDocument();
  });
});
