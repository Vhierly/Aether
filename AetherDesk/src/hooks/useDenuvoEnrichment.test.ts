import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enrichDenuvoFlags, type DenuvoEnrichableGame } from './useDenuvoEnrichment';

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }));

type Game = DenuvoEnrichableGame & { name: string };

const game = (appId: string, extra: Partial<Game> = {}): Game => ({
  appId,
  name: appId,
  ...extra,
});

describe('enrichDenuvoFlags', () => {
  beforeEach(() => invokeMock.mockReset());

  it('labels a game with no third-party DRM as Steam DRM', async () => {
    // Steam returns an empty drm_notice for the ~99% of games that only use
    // its own DRM: absent must not read as DRM-free.
    invokeMock.mockResolvedValue({ 100: '' });

    const [out] = await enrichDenuvoFlags([game('100')]);

    expect(out.drm_protection).toBe('Steam DRM');
    expect(out.has_denuvo).toBe(false);
  });

  it('detects Denuvo even when Steam appends extra text', async () => {
    invokeMock.mockResolvedValue({ 100: 'Denuvo<br>5 machine activation limit' });

    const [out] = await enrichDenuvoFlags([game('100')]);

    expect(out.drm_protection).toBe('Denuvo');
    expect(out.has_denuvo).toBe(true);
  });

  it('normalizes a misspelled Denuvo', async () => {
    invokeMock.mockResolvedValue({ 100: 'Enuvo' });

    const [out] = await enrichDenuvoFlags([game('100')]);

    expect(out.drm_protection).toBe('Denuvo');
    expect(out.has_denuvo).toBe(true);
  });

  it('keeps an unrecognized third-party notice verbatim', async () => {
    invokeMock.mockResolvedValue({ 100: 'XIGNCODE3' });

    const [out] = await enrichDenuvoFlags([game('100')]);

    expect(out.drm_protection).toBe('XIGNCODE3');
    expect(out.has_denuvo).toBe(false);
  });

  it('leaves the card alone when the Steam fetch failed', async () => {
    // A failed request is absent from the map, which is a different thing from
    // an empty notice: the DRM state is simply unknown.
    invokeMock.mockResolvedValue({});

    const [out] = await enrichDenuvoFlags([game('100', { drm_protection: 'Steam DRM' })]);

    expect(out.drm_protection).toBe('Steam DRM');
    expect(out.has_denuvo).toBeUndefined();
  });
});
