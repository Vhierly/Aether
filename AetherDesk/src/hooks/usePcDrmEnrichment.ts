import { invoke } from '@tauri-apps/api/core';

export interface PcDrmEnrichableGame {
  appId: string;
  name: string;
  drm_protection?: string;
}

export const enrichPcDrm = async <T extends PcDrmEnrichableGame>(games: T[]) => {
  const appIds = games.map((game) => Number(game.appId)).filter(Number.isFinite);
  const names = games.map((game) => game.name);
  if (appIds.length === 0) return games;

  const drmMap: Record<string, string> = await invoke('check_pc_drm_bulk', { appIds, names });

  return games.map((game) => {
    const drm = drmMap[String(game.appId)];
    return drm === undefined ? game : { ...game, drm_protection: drm };
  });
};
