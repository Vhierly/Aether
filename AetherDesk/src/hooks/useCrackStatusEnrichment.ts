import { invoke } from '@tauri-apps/api/core';

export interface CrackStatusEnrichableGame {
  appId: string;
  crack_status?: string;
  drm_protection?: string;
}

interface CrackInfo {
  status: string;
  drm?: string | null;
}

export const enrichCrackStatus = async <T extends CrackStatusEnrichableGame>(games: T[]) => {
  const appIds = [...new Set(games.map((game) => Number(game.appId)).filter(Number.isFinite))];
  if (appIds.length === 0) return games;

  const statusMap: Record<string, CrackInfo> = await invoke('check_crack_status_bulk', { appIds });

  return games.map((game) => {
    const info = statusMap[String(game.appId)];
    if (!info) return game;
    return {
      ...game,
      crack_status: info.status,
      drm_protection: info.drm ?? game.drm_protection,
    };
  });
};
