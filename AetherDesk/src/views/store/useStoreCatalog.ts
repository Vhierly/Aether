import { useEffect, useRef, useState } from 'react';
import { enrichDenuvoFlags } from '../../hooks/useDenuvoEnrichment';
import { enrichUco2Flags } from '../../hooks/useUco2Enrichment';
import { enrichCrackStatus } from '../../hooks/useCrackStatusEnrichment';
import { enrichGenres } from '../../hooks/useGenreEnrichment';
import { useStoreSearch } from '../../hooks/useStoreSearch';
import { preloadGameCovers } from '../../ui/GameCover';
import { useTrendingStore } from './useTrendingStore';

const ITEMS_PER_PAGE = 20;

type SortMode = 'newest' | 'trending' | 'name';

interface Params {
  settingsRevision: number;
  settingsReady: boolean;
}

export function useStoreCatalog({ settingsRevision, settingsReady }: Params) {
  const [page, setPage] = useState(1);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [genreFilter, setGenreFilter] = useState<string>('');
  const [storeFrontFilter, setStoreFrontFilter] = useState<string>('trending');
  const observedSettingsRevision = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const storeSearch = useStoreSearch();
  const trending = useTrendingStore(storeSearch.setResults, storeFrontFilter);
  const { results, setResults, isLoading, hasSearched, activeQuery, search, clear } = storeSearch;

  useEffect(() => {
    if (!settingsReady || observedSettingsRevision.current === settingsRevision) return;
    observedSettingsRevision.current = settingsRevision;
    setPage(1);
    trending.reset();
    if (activeQuery.trim()) {
      search(activeQuery).catch((error) => console.warn('Store search refresh after settings save failed:', error));
      return;
    }
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsRevision, settingsReady]);

  // Enrich genres for any result that doesn't have them yet.
  useEffect(() => {
    const missing = results.filter((g) => !g.genres);
    if (missing.length === 0) return;
    let cancelled = false;
    enrichGenres(missing)
      .then((enriched) => {
        if (cancelled) return;
        const map = new Map(enriched.map((g) => [String(g.appId), g.genres]));
        setResults((current) =>
          current.map((g) => {
            const genres = map.get(String(g.appId));
            return genres === undefined ? g : { ...g, genres };
          })
        );
      })
      .catch((error) => console.warn('Genre enrichment failed:', error));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.length]);

  const prevStoreFrontFilter = useRef(storeFrontFilter);
  // Reset trending session when the storefront filter changes.
  useEffect(() => {
    if (prevStoreFrontFilter.current === storeFrontFilter) return;
    prevStoreFrontFilter.current = storeFrontFilter;
    setPage(1);
    clear();
    trending.reset();
    void trending.loadNext(ITEMS_PER_PAGE * 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeFrontFilter]);

  const availableGenres = Array.from(
    new Set(results.flatMap((g) => g.genres || []))
  ).sort();

  const filteredSortedResults = [...results]
    .filter((g) => (genreFilter ? (g.genres || []).includes(genreFilter) : true))
    .sort((a, b) => {
      if (sortMode === 'newest') {
        const da = a.release_date_unix ?? 0;
        const db = b.release_date_unix ?? 0;
        return db - da;
      }
      if (sortMode === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0; // trending: keep original order
    });

  const totalPages = Math.ceil(filteredSortedResults.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const pageGames = filteredSortedResults.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const pageKey = pageGames.map((game) => game.appId).join(',');

  useEffect(() => {
    if (pageGames.length === 0 || document.visibilityState !== 'visible') return;
    preloadGameCovers(
      pageGames.map((game) => ({ appId: game.appId, imageUrl: game.imageUrl })),
      pageGames.length
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  useEffect(() => {
    if (!settingsReady || activeQuery.trim()) return;
    if (results.length < (page + 1) * ITEMS_PER_PAGE) {
      void trending.loadNext(ITEMS_PER_PAGE * 2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, results.length, activeQuery, settingsReady]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [page, activeQuery, sortMode, genreFilter]);

  useEffect(() => {
    if (pageGames.length === 0) return;
    let cancelled = false;
    enrichDenuvoFlags(pageGames)
      .then((enriched) => {
        if (cancelled) return;
        const flags = new Map(enriched.map((game) => [String(game.appId), game.has_denuvo]));
        setResults((current) =>
          current.map((game) => {
            const flag = flags.get(String(game.appId));
            return flag === undefined ? game : { ...game, has_denuvo: flag };
          })
        );
      })
      .catch((error) => console.warn('Denuvo enrichment failed:', error));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  useEffect(() => {
    if (pageGames.length === 0) return;
    let cancelled = false;
    enrichUco2Flags(pageGames)
      .then((enriched) => {
        if (cancelled) return;
        const flags = new Map(enriched.map((game) => [String(game.appId), game.uco2_supported]));
        setResults((current) =>
          current.map((game) => {
            const flag = flags.get(String(game.appId));
            return flag === undefined ? game : { ...game, uco2_supported: flag };
          })
        );
      })
      .catch((error) => console.warn('UCO2 enrichment failed:', error));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);


  useEffect(() => {
    if (pageGames.length === 0) return;
    let cancelled = false;
    enrichCrackStatus(pageGames)
      .then((enriched) => {
        if (cancelled) return;
        const statusMap = new Map(enriched.map((game) => [String(game.appId), game.crack_status]));
        const drmMap = new Map(enriched.map((game) => [String(game.appId), game.drm_protection]));
        setResults((current) =>
          current.map((game) => {
            const status = statusMap.get(String(game.appId));
            const drm = drmMap.get(String(game.appId));
            return {
              ...game,
              ...(status === undefined ? {} : { crack_status: status }),
              ...(drm === undefined ? {} : { drm_protection: drm }),
            };
          })
        );
      })
      .catch((error) => console.warn('Crack status enrichment failed:', error));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  const refreshCatalog = () => {
    setPage(1);
    clear();
    trending.reset();
    void trending.loadNext(ITEMS_PER_PAGE * 2);
  };

  // Live update: periodically refresh the trending catalog so new releases
  // appear without a manual reload. Only while the store is in browse mode
  // (no active search) and the tab is visible.
  useEffect(() => {
    if (activeQuery.trim()) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      refreshCatalog();
    }, 3 * 60 * 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuery, settingsReady]);

  const runSearch = async (query: string) => {
    setPage(1);
    try {
      if (!query.trim()) {
        clear();
        trending.reset();
        return;
      }
      await search(query);
    } catch (error) {
      alert(`Search error: ${error}`);
    }
  };

  const clearSearch = () => {
    clear();
    trending.reset();
  };

  return {
    scrollRef,
    page,
    setPage,
    pageGames,
    totalPages,
    isLoading,
    isTrendingLoading: trending.isLoading,
    hasSearched,
    activeQuery,
    runSearch,
    clearSearch,
    refreshCatalog,
    sortMode,
    setSortMode,
    genreFilter,
    setGenreFilter,
    availableGenres,
    storeFrontFilter,
    setStoreFrontFilter,
  };
}