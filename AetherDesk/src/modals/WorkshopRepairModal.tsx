import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ModalShell } from '../ui/ModalShell';
import { StatusType } from '../types/ui';
import { toErrorMessage } from '../util/errors';

/** Report returned by the backend `sync_hubcap_workshop_manifests` command. */
export interface WorkshopSyncReport {
  discovered: number;
  generated: number;
  restoredFromCache: number;
  alreadyLocal: number;
  /** Items with a staged manifest but without Steam's content folder. */
  contentMissing: number;
  failed: number;
  /** Items beyond the per-run generation cap; the next lane pass handles them. */
  deferred: number;
  /** Per-item outcome, so the report can name the items behind the counters. */
  items: WorkshopItemReport[];
}

export type WorkshopItemStatus = 'ready' | 'deferred' | 'failed';

/** Why an item is not ready. `null` on a ready item: being ready is not a failure. */
export type WorkshopItemReason = 'generationCap' | 'contentCap' | 'unknownError' | null;

export interface WorkshopItemReport {
  appId: number;
  appName: string | null;
  workshopId: number;
  manifestGid: string;
  status: WorkshopItemStatus;
  reason: WorkshopItemReason;
  contentMissing: boolean;
}

const itemLabel = (item: WorkshopItemReport): string => {
  const name = item.appName?.trim() || `App ${item.appId}`;
  return `${name} — mod #${item.workshopId}`;
};

const reasonLabel = (item: WorkshopItemReport): string => {
  if (item.status === 'ready') {
    return item.contentMissing
      ? 'Manifest staged; Steam still needs to download the content.'
      : 'Manifest staged; start the download in Steam.';
  }
  switch (item.reason) {
    case 'generationCap':
      return 'Deferred by the per-run limit; run Repair again to retry.';
    case 'contentCap':
      return 'Manifest staged; the content download was deferred to the next pass.';
    default:
      return 'Failed.';
  }
};

const groupItems = (items: WorkshopItemReport[], status: WorkshopItemStatus) =>
  items.filter((item) => item.status === status);

const ReportGroup = ({ label, items }: { label: string; items: WorkshopItemReport[] }) =>
  items.length === 0 ? null : (
    <div className="workshop-report-group">
      <p className="workshop-report-group-label">
        {label} ({items.length})
      </p>
      <ul className="workshop-report-list">
        {items.map((item) => (
          <li key={`${item.appId}-${item.workshopId}`}>
            <span className="workshop-report-item-name">{itemLabel(item)}</span>
            <span className="workshop-report-item-reason">{reasonLabel(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );

export interface WorkshopRepairModalProps {
  /** Toast feedback in the hosting view (same StatusAlert as other actions). */
  onStatus: (text: string, type: StatusType) => void;
  /** X / Escape / overlay — dismiss (disabled while the sync runs). */
  onClose: () => void;
}

/** Human-readable one-liner for the sync report. */
const formatReport = (report: WorkshopSyncReport): string => {
  if (report.discovered === 0) {
    return 'No installed Steam Workshop items were found.';
  }
  const parts = [
    `${report.discovered} item(s) discovered`,
    `${report.generated} generated`,
    `${report.restoredFromCache} restored from cache`,
    `${report.alreadyLocal} already local`,
  ];
  if (report.contentMissing > 0) {
    parts.push(`${report.contentMissing} missing content (download requested from Steam)`);
  }
  if (report.failed > 0) {
    parts.push(`${report.failed} failed`);
  }
  if (report.deferred > 0) {
    parts.push(`${report.deferred} deferred to the next pass (generation cap)`);
  }
  return `Workshop repair: ${parts.join(', ')}.`;
};

/**
 * Explicit, user-triggered Steam Workshop manifest repair.
 *
 * The backend scans Steam's `appworkshop_*.acf` files and stages every
 * missing item manifest — exact local files and the validated local cache
 * are reused first, everything else is generated through the authenticated
 * Hubcap key (Workshop quota). Items whose content folder is absent get
 * their download requested from the running Steam client. Completed items
 * never touch the provider.
 */
export const WorkshopRepairModal = ({ onStatus, onClose }: WorkshopRepairModalProps) => {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [items, setItems] = useState<WorkshopItemReport[]>([]);

  const runRepair = async () => {
    if (busy) return;
    setBusy(true);
    setResult(null);
    setItems([]);
    onStatus('Repairing Steam Workshop manifests...', 'info');
    try {
      const report = await invoke<WorkshopSyncReport>('sync_hubcap_workshop_manifests');
      const summary = formatReport(report);
      setResult(summary);
      setItems(report.items ?? []);
      onStatus(summary, report.failed > 0 ? 'error' : 'success');
    } catch (err: unknown) {
      const message = `Workshop repair failed: ${toErrorMessage(err)}`;
      setResult(message);
      onStatus(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title="Repair Workshop"
      onClose={() => {
        if (!busy) onClose();
      }}
      closeDisabled={busy}
      containerClassName="uninstall-modal"
      bodyClassName="uninstall-modal-body"
    >
      <p className="uninstall-modal-copy">
        Scan every installed Steam Workshop item and stage its manifest: files already in depotcache or in the local
        cache are reused, everything else is generated through your authenticated Hubcap key. Mods whose installation
        folder is missing are requested from Steam automatically.
      </p>
      {busy && <p className="uninstall-modal-copy">Repairing Workshop manifests…</p>}
      {!busy && result && <p className="uninstall-modal-copy">{result}</p>}
      {!busy && items.length > 0 && (
        <div className="workshop-report">
          <ReportGroup label="Ready" items={groupItems(items, 'ready')} />
          <ReportGroup label="Deferred" items={groupItems(items, 'deferred')} />
          <ReportGroup label="Failed" items={groupItems(items, 'failed')} />
        </div>
      )}

      <div className="uninstall-modal-actions">
        <button
          type="button"
          className="uninstall-btn uninstall-btn-primary"
          onClick={() => void runRepair()}
          disabled={busy}
        >
          {busy ? 'Repairing…' : 'Repair Workshop manifests'}
        </button>
      </div>
    </ModalShell>
  );
};
