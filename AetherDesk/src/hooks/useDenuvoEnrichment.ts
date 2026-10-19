import { invoke } from '@tauri-apps/api/core';

export interface DenuvoEnrichableGame {
  appId: string;
  has_denuvo: boolean;
}

export const enrichDenuvoFlags = async <T extends DenuvoEnrichableGame>(games: T[]) => {
  const appIds = [...new Set(games.map((game) => Number(game.appId)).filter(Number.isFinite))];
  if (appIds.length === 0) return games;

  const denuvoMap: Record<string, boolean> = await invoke('check_denuvo_bulk', { appIds });

  return games.map((game) => {
    const flag = denuvoMap[String(game.appId)];
    // Preserve the previous value when Steam did not answer (rate limit /
    // transient failure) instead of flipping a known title to "no Denuvo".
    return flag === undefined ? game : { ...game, has_denuvo: Boolean(flag) };
  });
};
