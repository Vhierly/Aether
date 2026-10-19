import { invoke } from '@tauri-apps/api/core';

export interface CrackStatusEnrichableGame {
  appId: string;
  crack_status?: string;
}

export const enrichCrackStatus = async <T extends CrackStatusEnrichableGame>(games: T[]) => {
  const appIds = [...new Set(games.map((game) => Number(game.appId)).filter(Number.isFinite))];
  if (appIds.length === 0) return games;

  const statusMap: Record<string, string> = await invoke('check_crack_status_bulk', { appIds });

  return games.map((game) => {
    const status = statusMap[String(game.appId)];
    return status === undefined ? game : { ...game, crack_status: status };
  });
};
