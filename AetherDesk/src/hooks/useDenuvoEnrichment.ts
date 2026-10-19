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
    // Absent from the map means the Steam request itself failed: the DRM state
    // is unknown, so leave the card alone instead of guessing.
    if (notice === undefined) return game;

    const lower = notice.toLowerCase();
    // Test Denuvo before the noise filter: Steam reports
    // "Denuvo<br>5 machine activation limit", which is a real detection.
    if (lower.includes('denuvo') || lower.includes('enuvo') || lower.includes('nuvo')) {
      return { ...game, has_denuvo: true, drm_protection: 'Denuvo' };
    }

    // Steam only reports *third-party* DRM. An empty notice means the game is
    // plain Steam DRM — an absent drm_notice is NOT the same as DRM-free.
    if (notice.trim() === '') {
      return { ...game, has_denuvo: false, drm_protection: 'Steam DRM' };
    }

    if (notice.includes('team') || notice.includes('offline') || notice.includes('ffline') || notice.includes('=')) {
      return game;
    }

    return { ...game, has_denuvo: false, drm_protection: notice };
  });
};
