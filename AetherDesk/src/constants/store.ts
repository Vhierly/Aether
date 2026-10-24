/**
 * Store pagination page size. Shared by the catalog hook (which computes
 * `totalPages` and slices the visible page) and the grid (which disables the
 * page buttons beyond the loaded range). Keeping one value is what keeps the
 * page count and the button states in agreement.
 */
export const STORE_ITEMS_PER_PAGE = 20;
