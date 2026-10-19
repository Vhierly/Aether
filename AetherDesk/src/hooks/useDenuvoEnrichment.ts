import { invoke } from '@tauri-apps/api/core';

export interface DenuvoEnrichableGame {
  appId: string;
  has_denuvo?: boolean;
  drm_protection?: string;
}

export const enrichDenuvoFlags = async <T extends DenuvoEnrichableGame>(games: T[]) => {
  const appIds = games.map((game) => Number(game.appId)).filter(Number.isFinite);
  if (appIds.length === 0) return games;

  const denuvoMap: Record<string, string> = await invoke('check_denuvo_bulk', { appIds });

  return games.map((game) => {
    const notice = denuvoMap[String(game.appId)];
    if (notice === undefined) return game;
    const lower = notice.toLowerCase();
    if (
      notice.includes('team') ||
      notice.includes('offline') ||
      notice.includes('ffline') ||
      notice.includes('=') ||
      notice.length > 30
    ) {
      return game;
    }
    if (notice === 'None' || lower === 'none') {
      return { ...game, has_denuvo: false, drm_protection: 'None' };
    }
    if (lower.includes('denuvo') || lower.includes('enuvo') || lower.includes('nuvo')) {
      return { ...game, has_denuvo: true, drm_protection: 'Denuvo' };
    }
    if (notice && notice !== '') {
      return { ...game, has_denuvo: false, drm_protection: notice };
    }
    return { ...game, has_denuvo: false };
  });
};
