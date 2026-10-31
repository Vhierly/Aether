/**
 * Store pagination page size. Shared by the catalog hook (which computes
 * `totalPages` and slices the visible page) and the grid (which disables the
 * page buttons beyond the loaded range). Keeping one value is what keeps the
 * page count and the button states in agreement.
 */
export const STORE_ITEMS_PER_PAGE = 20;

export type StoreSortMode = 'newest' | 'trending' | 'name';

export interface SortableStoreGame {
  name: string;
  release_date_unix?: number;
}

/**
 * Order one batch of results. Applied per loaded batch, never across the whole
 * accumulated catalog: a global re-sort would move games between pages every
 * time a later offset arrives.
 */
export function compareStoreGames(a: SortableStoreGame, b: SortableStoreGame, sortMode: StoreSortMode): number {
  if (sortMode === 'newest') {
    return (b.release_date_unix ?? 0) - (a.release_date_unix ?? 0);
  }
  if (sortMode === 'name') {
    return a.name.localeCompare(b.name);
  }
  return 0;
}
