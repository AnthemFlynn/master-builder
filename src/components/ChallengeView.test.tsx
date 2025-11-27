import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChallengeView from './ChallengeView';

describe('ChallengeView', () => {
  const mockChallenge = {
    id: 1,
    name: 'First Steps',
    desc: 'Place your first block',
    reward: 10,
    check: (s: any) => s.blocks >= 1
  };

  const mockStats = {
    blocks: 0,
    height: 0,
    matCount: 0,
    glows: 0
  };

  it('should render challenge name and description', () => {
    render(
      <ChallengeView
        challenge={mockChallenge}
        stats={mockStats}
        onTest={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('First Steps')).toBeInTheDocument();
    expect(screen.getByText('Place your first block')).toBeInTheDocument();
  });

  it('should display requirements section', () => {
    render(
      <ChallengeView
        challenge={mockChallenge}
        stats={mockStats}
        onTest={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/requirements/i)).toBeInTheDocument();
  });

  it('should display reward amount', () => {
    render(
      <ChallengeView
        challenge={mockChallenge}
        stats={mockStats}
        onTest={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/10/)).toBeInTheDocument();
    expect(screen.getByText(/reward/i)).toBeInTheDocument();
  });

  it('should show hints when available', () => {
    const challengeWithHints = {
      ...mockChallenge,
      hints: ['First hint', 'Second hint']
    };

    render(
      <ChallengeView
        challenge={challengeWithHints}
        stats={mockStats}
        onTest={() => {}}
        onClose={() => {}}
      />
    );

    // Hints are collapsed by default, click to expand
    const hintsButton = screen.getByText(/hints/i);
    fireEvent.click(hintsButton);

    expect(screen.getByText('First hint')).toBeInTheDocument();
    expect(screen.getByText('Second hint')).toBeInTheDocument();
  });

  it('should call onTest when test button is clicked', () => {
    const onTest = vi.fn();

    render(
      <ChallengeView
        challenge={mockChallenge}
        stats={mockStats}
        onTest={onTest}
        onClose={() => {}}
      />
    );

    const testButton = screen.getByRole('button', { name: /test/i });
    fireEvent.click(testButton);

    expect(onTest).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();

    render(
      <ChallengeView
        challenge={mockChallenge}
        stats={mockStats}
        onTest={() => {}}
        onClose={onClose}
      />
    );

    // Click the X button in the header
    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    fireEvent.click(closeButtons[0]); // Click first close button (X in header)

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should show current progress stats', () => {
    const statsWithProgress = {
      blocks: 5,
      height: 3,
      matCount: 2,
      glows: 1
    };

    render(
      <ChallengeView
        challenge={mockChallenge}
        stats={statsWithProgress}
        onTest={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/5/)).toBeInTheDocument(); // blocks
  });

  it('should indicate completion status', () => {
    const statsCompleted = {
      blocks: 1,
      height: 1,
      matCount: 1,
      glows: 0
    };

    render(
      <ChallengeView
        challenge={mockChallenge}
        stats={statsCompleted}
        onTest={() => {}}
        onClose={() => {}}
      />
    );

    // Challenge should be completed since blocks >= 1
    const testButton = screen.getByRole('button', { name: /test/i });
    expect(testButton).not.toBeDisabled();
  });

  it('should disable test button when stats do not meet requirements', () => {
    const statsIncomplete = {
      blocks: 0,
      height: 0,
      matCount: 0,
      glows: 0
    };

    render(
      <ChallengeView
        challenge={mockChallenge}
        stats={statsIncomplete}
        onTest={() => {}}
        onClose={() => {}}
        disableTest={true}
      />
    );

    const testButton = screen.getByRole('button', { name: /test/i });
    expect(testButton).toBeDisabled();
  });

  it('should display hints section with collapsible toggle', () => {
    const challengeWithHints = {
      ...mockChallenge,
      hints: ['Hint 1', 'Hint 2', 'Hint 3']
    };

    render(
      <ChallengeView
        challenge={challengeWithHints}
        stats={mockStats}
        onTest={() => {}}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/hints/i)).toBeInTheDocument();
  });

  it('should show result message when provided', () => {
    const result = {
      passed: true,
      stars: 3,
      feedback: ['Great job!']
    };

    render(
      <ChallengeView
        challenge={mockChallenge}
        stats={mockStats}
        onTest={() => {}}
        onClose={() => {}}
        result={result}
      />
    );

    expect(screen.getByText('Great job!')).toBeInTheDocument();
  });
});
