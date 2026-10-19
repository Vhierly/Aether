import { invoke } from '@tauri-apps/api/core';

export interface Uco2EnrichableGame {
  appId: string;
  uco2_supported?: boolean;
}

export const enrichUco2Flags = async <T extends Uco2EnrichableGame>(games: T[]) => {
  const appIds = [...new Set(games.map((game) => Number(game.appId)).filter(Number.isFinite))];
  if (appIds.length === 0) return games;

  const uco2Map: Record<string, boolean> = await invoke('check_uco2_bulk', { appIds });

  return games.map((game) => ({
    ...game,
    uco2_supported: Boolean(uco2Map[String(game.appId)]),
  }));
};
