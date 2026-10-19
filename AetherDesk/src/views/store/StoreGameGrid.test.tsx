import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StoreGameGrid } from './StoreGameGrid';

vi.mock('../../ui/GameCard', () => ({
  GameCard: () => <div data-testid="game-card" />,
}));

const baseProps = {
  games: [],
  actions: [],
  isLoading: false,
  isTrendingLoading: false,
  hasSearched: false,
  activeQuery: '',
  useAlternativeGameCards: false,
  alternativeCardsOpacity: 100,
  alternativeCardsFade: 100,
  onPageChange: vi.fn(),
};

describe('StoreGameGrid pagination', () => {
  it('shows every page when there are 7 or fewer', () => {
    render(<StoreGameGrid {...baseProps} page={1} totalPages={5} resultsLength={100} />);
    for (const p of [1, 2, 3, 4, 5]) {
      expect(screen.getByRole('button', { name: String(p) })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: '6' })).not.toBeInTheDocument();
  });

  it('windows pages with ellipsis when there are many', () => {
    render(<StoreGameGrid {...baseProps} page={5} totalPages={20} resultsLength={400} />);
    // window around page 5: 1 … 4 5 6 … 20
    for (const p of [1, 4, 5, 6, 20]) {
      expect(screen.getByRole('button', { name: String(p) })).toBeInTheDocument();
    }
    expect(screen.getAllByText('…')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: '10' })).not.toBeInTheDocument();
  });

  it('disables pages whose content is not loaded yet', () => {
    // loadedPages = ceil(25 / 20) = 2 → page 10 is rendered but unreachable
    render(<StoreGameGrid {...baseProps} page={1} totalPages={10} resultsLength={25} />);
    expect(screen.getByRole('button', { name: '2' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: '10' })).toBeDisabled();
  });

  it('calls onPageChange when a loaded page is clicked', () => {
    const onPageChange = vi.fn();
    render(<StoreGameGrid {...baseProps} page={2} totalPages={10} resultsLength={200} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('marks the current page as active', () => {
    render(<StoreGameGrid {...baseProps} page={3} totalPages={10} resultsLength={200} />);
    expect(screen.getByRole('button', { name: '3' })).toHaveClass('pagination-active');
  });
});
