import { invoke } from '@tauri-apps/api/core';

export interface GenreEnrichableGame {
  appId: string;
  genres?: string[];
}

export const enrichGenres = async <T extends GenreEnrichableGame>(games: T[]) => {
  const appIds = [...new Set(games.map((game) => Number(game.appId)).filter(Number.isFinite))];
  if (appIds.length === 0) return games;

  const genreMap: Record<string, string[]> = await invoke('get_genres_bulk', { appIds });

  return games.map((game) => {
    const genres = genreMap[String(game.appId)];
    return genres === undefined ? game : { ...game, genres };
  });
};
