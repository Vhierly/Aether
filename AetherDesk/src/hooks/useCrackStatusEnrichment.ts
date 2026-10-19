import { invoke } from '@tauri-apps/api/core';

export interface CrackStatusEnrichableGame {
  appId: string;
  has_denuvo?: boolean;
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

    const incomingDrm = (info.drm ?? '').trim();
    const existingDrm = (game.drm_protection ?? '').trim();
    const incomingIsDenuvo =
      incomingDrm.toLowerCase().includes('denuvo') ||
      incomingDrm.toLowerCase().includes('enuvo') ||
      incomingDrm.toLowerCase().includes('nuvo');
    const existingIsDenuvo =
      existingDrm.toLowerCase().includes('denuvo') ||
      existingDrm.toLowerCase().includes('enuvo') ||
      existingDrm.toLowerCase().includes('nuvo');

    let drm = game.drm_protection;
    if (incomingIsDenuvo) {
      drm = 'Denuvo';
    } else if (!incomingDrm || incomingDrm.toLowerCase() === 'none') {
      drm = existingIsDenuvo ? existingDrm : incomingDrm || game.drm_protection;
    } else if (!existingIsDenuvo) {
      drm = incomingDrm;
    }

    return {
      ...game,
      crack_status: info.status,
      drm_protection: drm,
      has_denuvo: game.has_denuvo || incomingIsDenuvo,
    };
  });
};
