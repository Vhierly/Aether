import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enrichCrackStatus } from './useCrackStatusEnrichment';

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }));

type Game = {
  appId: string;
  name: string;
  drm_protection?: string;
  crack_status?: string;
};

describe('enrichCrackStatus', () => {
  beforeEach(() => invokeMock.mockReset());

  it('applies the crack status', async () => {
    invokeMock.mockResolvedValue({ 100: { status: 'hypervisor' } });

    const [out] = await enrichCrackStatus<Game>([{ appId: '100', name: 'x' }]);

    expect(out.crack_status).toBe('hypervisor');
  });

  it('never takes DRM from isitcracked', async () => {
    // The source still reports a drm field; it must be ignored so DRM comes
    // only from Steam's drm_notice.
    invokeMock.mockResolvedValue({ 100: { status: 'cracked', drm: 'Denuvo' } });

    const [out] = await enrichCrackStatus<Game>([{ appId: '100', name: 'x', drm_protection: 'Steam DRM' }]);

    expect(out.crack_status).toBe('cracked');
    expect(out.drm_protection).toBe('Steam DRM');
  });

  it('leaves the card untouched when the source has no entry', async () => {
    invokeMock.mockResolvedValue({});

    const [out] = await enrichCrackStatus<Game>([{ appId: '100', name: 'x' }]);

    expect(out).toEqual({ appId: '100', name: 'x' });
  });
});
