import type { CSSProperties } from 'react';
import type { StoreGameResult } from '../../hooks/useStoreSearch';
import { GameCard, type GameCardAction } from '../../ui/GameCard';

const ITEMS_PER_PAGE = 20;

interface StoreGameGridProps {
  games: StoreGameResult[];
  actions: Array<GameCardAction<StoreGameResult>>;
  isLoading: boolean;
  isTrendingLoading: boolean;
  hasSearched: boolean;
  /** Failure of the last search; the empty state must not claim "no results". */
  searchError: string | null;
  activeQuery: string;
  page: number;
  totalPages: number;
  resultsLength: number;
  useAlternativeGameCards: boolean;
  alternativeCardsOpacity: number;
  alternativeCardsFade: number;
  onPageChange: (page: number) => void;
}

// 1 2 3 4 5 … 12 — windowed around the current page, first/last always shown.
function pageWindow(page: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const near = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...near].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: Array<number | 'ellipsis'> = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('ellipsis');
    out.push(sorted[i]);
  }
  return out;
}

export function StoreGameGrid({
  games,
  actions,
  isLoading,
  isTrendingLoading,
  hasSearched,
  searchError,
  activeQuery,
  page,
  totalPages,
  resultsLength,
  useAlternativeGameCards,
  alternativeCardsOpacity,
  alternativeCardsFade,
  onPageChange,
}: StoreGameGridProps) {
  const alternativeStyle = useAlternativeGameCards
    ? ({
        '--alt-card-opacity': Math.max(0, Math.min(100, alternativeCardsOpacity)),
        '--alt-card-fade': Math.max(0, Math.min(100, alternativeCardsFade)),
      } as CSSProperties)
    : undefined;

  return (
    <>
      <div className={useAlternativeGameCards ? 'store-grid alt-card-grid' : 'store-grid'} style={alternativeStyle}>
        {isLoading || (isTrendingLoading && games.length === 0) ? (
          <div className="store-no-results">
            {isLoading ? 'Loading results from Steam & Hubcap...' : 'Loading trending Steam games...'}
          </div>
        ) : games.length > 0 ? (
          games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              cardVariant={useAlternativeGameCards ? 'backdrop' : 'classic'}
              actions={actions}
            />
          ))
        ) : searchError ? null : (
          <div className="store-no-results">
            {hasSearched ? `No games found for "${activeQuery}"` : 'Enter a query above to search the Steam catalog.'}
          </div>
        )}
      </div>

      {!isLoading && totalPages > 1 && (
        <div className="store-pagination">
          <button disabled={page === 1} onClick={() => onPageChange(Math.max(page - 1, 1))} className="pagination-btn">
            &larr; Prev
          </button>
          {pageWindow(page, totalPages).map((p, i) =>
            p === 'ellipsis' ? (
              <span key={`e${i}`} className="pagination-ellipsis">
                …
              </span>
            ) : (
              <button
                key={p}
                disabled={p > Math.ceil(resultsLength / ITEMS_PER_PAGE)}
                onClick={() => onPageChange(p)}
                className={`pagination-btn${p === page ? ' pagination-active' : ''}`}
              >
                {p}
              </button>
            )
          )}
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(page + 1, totalPages))}
            className="pagination-btn"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </>
  );
}
