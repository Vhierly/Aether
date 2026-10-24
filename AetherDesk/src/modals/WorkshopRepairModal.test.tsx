import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkshopRepairModal, type WorkshopSyncReport } from './WorkshopRepairModal';

const invokeMock = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

const report = (overrides: Partial<WorkshopSyncReport> = {}): WorkshopSyncReport => ({
  discovered: 3,
  generated: 1,
  restoredFromCache: 0,
  alreadyLocal: 1,
  contentMissing: 0,
  failed: 0,
  deferred: 1,
  items: [
    {
      appId: 10,
      appName: 'Test Game',
      workshopId: 111,
      manifestGid: '12345678901234567890',
      status: 'ready',
      reason: null,
      contentMissing: false,
    },
    {
      appId: 10,
      appName: 'Test Game',
      workshopId: 222,
      manifestGid: '22345678901234567890',
      status: 'deferred',
      reason: 'generationCap',
      contentMissing: false,
    },
  ],
  ...overrides,
});

const renderModal = () => {
  const callbacks = { onStatus: vi.fn(), onClose: vi.fn() };
  return { ...callbacks, view: render(<WorkshopRepairModal {...callbacks} />) };
};

describe('WorkshopRepairModal', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('reports the item behind a deferred counter instead of only the count', async () => {
    const user = userEvent.setup();
    invokeMock.mockResolvedValue(report());
    renderModal();

    await user.click(screen.getByRole('button', { name: /Repair Workshop manifests/ }));

    expect(await screen.findByText(/Deferred \(1\)/)).toBeInTheDocument();
    expect(screen.getByText('Test Game — mod #222')).toBeInTheDocument();
    expect(screen.getByText(/Deferred by the per-run limit/)).toBeInTheDocument();
  });

  it('names ready items and flags the ones still missing content', async () => {
    const user = userEvent.setup();
    invokeMock.mockResolvedValue(
      report({
        contentMissing: 1,
        items: [
          {
            appId: 10,
            appName: 'Test Game',
            workshopId: 111,
            manifestGid: '12345678901234567890',
            status: 'ready',
            reason: null,
            contentMissing: true,
          },
        ],
      })
    );
    const { view } = renderModal();

    await user.click(screen.getByRole('button', { name: /Repair Workshop manifests/ }));

    expect(await screen.findByText(/Ready \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Steam still needs to download the content/)).toBeInTheDocument();
    expect(view.container.querySelectorAll('.workshop-report-group')).toHaveLength(1);
  });

  it('falls back to the App ID when the backend could not resolve a name', async () => {
    const user = userEvent.setup();
    invokeMock.mockResolvedValue(
      report({
        items: [
          {
            appId: 730,
            appName: null,
            workshopId: 999,
            manifestGid: '92345678901234567890',
            status: 'failed',
            reason: 'unknownError',
            contentMissing: false,
          },
        ],
      })
    );
    renderModal();

    await user.click(screen.getByRole('button', { name: /Repair Workshop manifests/ }));

    expect(await screen.findByText(/Failed \(1\)/)).toBeInTheDocument();
    expect(screen.getByText('App 730 — mod #999')).toBeInTheDocument();
  });

  it('shows no report when the run found nothing to do', async () => {
    const user = userEvent.setup();
    invokeMock.mockResolvedValue(report({ discovered: 0, generated: 0, alreadyLocal: 0, deferred: 0, items: [] }));
    const { view } = renderModal();

    await user.click(screen.getByRole('button', { name: /Repair Workshop manifests/ }));

    expect(await screen.findByText(/No installed Steam Workshop items/)).toBeInTheDocument();
    expect(view.container.querySelector('.workshop-report')).toBeNull();
  });

  it('keeps the modal open and surfaces the command failure', async () => {
    const user = userEvent.setup();
    invokeMock.mockRejectedValue(new Error('Steam path is empty'));
    const { onStatus } = renderModal();

    await user.click(screen.getByRole('button', { name: /Repair Workshop manifests/ }));

    expect(await screen.findByText(/Steam path is empty/)).toBeInTheDocument();
    expect(onStatus).toHaveBeenCalledWith(expect.stringContaining('Workshop repair failed'), 'error');
  });
});
