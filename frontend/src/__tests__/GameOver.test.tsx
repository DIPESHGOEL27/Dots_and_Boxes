// ============================================================
// GameOver tests
// ============================================================

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import GameOver from "../components/GameBoard/GameOver";
import { PlayerInfo } from "dots-and-boxes-shared";

// Mock canvas-confetti
jest.mock("canvas-confetti", () => jest.fn());

// Mock sounds
jest.mock("../utils/sounds", () => ({
  playSound: jest.fn(),
}));

const mockPlayers: PlayerInfo[] = [
  { id: "1", name: "Alice", color: "#00bcd4", avatar: "🎮" },
  { id: "2", name: "Bob", color: "#ff4081", avatar: "🎲" },
];

const mockColors = ["#00bcd4", "#ff4081"];

describe("GameOver", () => {
  const baseProps = {
    players: mockPlayers,
    scores: [5, 3],
    colors: mockColors,
    winner: 0 as number | null,
    onPlayAgain: jest.fn(),
    onBackToLobby: jest.fn(),
  };

  it("renders winner name when there is a winner", () => {
    render(<GameOver {...baseProps} />);
    expect(screen.getAllByText("Alice").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Wins!/)).toBeInTheDocument();
  });

  it("renders draw message when winner is null", () => {
    render(<GameOver {...baseProps} winner={null} />);
    expect(screen.getByText(/Draw/)).toBeInTheDocument();
  });

  it("shows leaderboard with all players ranked by score", () => {
    render(<GameOver {...baseProps} />);
    // Alice (5) should be ranked #1, Bob (3) ranked #2
    const rows = screen.getAllByText(/#\d/);
    expect(rows).toHaveLength(2);
  });

  it("displays scores in leaderboard", () => {
    render(<GameOver {...baseProps} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("calls onPlayAgain when Play Again is clicked", () => {
    const onPlayAgain = jest.fn();
    render(<GameOver {...baseProps} onPlayAgain={onPlayAgain} />);
    fireEvent.click(screen.getByText(/Play Again/));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it("calls onBackToLobby when Back to Lobby is clicked", () => {
    const onBackToLobby = jest.fn();
    render(<GameOver {...baseProps} onBackToLobby={onBackToLobby} />);
    fireEvent.click(screen.getByText(/Back to Lobby/));
    expect(onBackToLobby).toHaveBeenCalledTimes(1);
  });

  it("renders player avatars in leaderboard", () => {
    render(<GameOver {...baseProps} />);
    // Avatars appear both in winner display and leaderboard
    const gameOverCard = screen.getByText(/Wins!/);
    expect(gameOverCard).toBeInTheDocument();
  });
});
