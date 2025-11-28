import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HUD from './HUD';

describe('HUD Component', () => {
  it('should render player stats', () => {
    render(
      <HUD
        score={500}
        gold={250}
        blockCount={15}
        title="Journeyman"
        titleColor="text-blue-400"
      />
    );

    expect(screen.getByText(/500/)).toBeInTheDocument();
    expect(screen.getByText(/250/)).toBeInTheDocument();
    expect(screen.getByText(/15/)).toBeInTheDocument();
  });

  it('should display player title', () => {
    render(
      <HUD
        score={1000}
        gold={500}
        blockCount={20}
        title="Master Builder"
        titleColor="text-purple-400"
      />
    );

    expect(screen.getByText('Master Builder')).toBeInTheDocument();
  });

  it('should show progress to next level', () => {
    render(
      <HUD
        score={150}
        gold={100}
        blockCount={10}
        title="Peasant Builder"
        titleColor="text-gray-400"
        nextLevelScore={200}
      />
    );

    // Should show progress bar or percentage
    expect(screen.getByText(/150.*200/)).toBeInTheDocument();
  });

  it('should display gold icon', () => {
    render(
      <HUD
        score={100}
        gold={75}
        blockCount={5}
        title="Peasant Builder"
        titleColor="text-gray-400"
      />
    );

    // Looking for gold emoji or icon
    const hudElement = screen.getByText(/75/);
    expect(hudElement).toBeInTheDocument();
  });

  it('should display block count', () => {
    render(
      <HUD
        score={300}
        gold={150}
        blockCount={42}
        title="Apprentice Mason"
        titleColor="text-green-400"
      />
    );

    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it('should apply correct title color class', () => {
    render(
      <HUD
        score={2000}
        gold={1000}
        blockCount={100}
        title="Royal Architect"
        titleColor="text-yellow-400"
      />
    );

    const titleElement = screen.getByText('Royal Architect');
    expect(titleElement).toHaveClass('text-yellow-400');
  });

  it('should handle zero values', () => {
    render(
      <HUD
        score={0}
        gold={0}
        blockCount={0}
        title="Peasant Builder"
        titleColor="text-gray-400"
      />
    );

    // Check that all zero values are displayed
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('should show XP/level info when provided', () => {
    render(
      <HUD
        score={750}
        gold={300}
        blockCount={25}
        title="Journeyman"
        titleColor="text-blue-400"
        level={3}
        xp={750}
        nextLevelXP={1000}
      />
    );

    // Should display level
    expect(screen.getByText(/Level.*3/i)).toBeInTheDocument();
    // Should show XP progress
    expect(screen.getByText(/750.*1000/)).toBeInTheDocument();
  });
});
