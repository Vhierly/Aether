import { useEffect, useState, memo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toErrorMessage } from '../util/errors';

interface BackupGameSummary {
  app_id: number;
  has_lua_original: boolean;
  history_count: number;
  manifest_count: number;
  has_crack: boolean;
  has_original_files: boolean;
  backup_path: string;
}

export const BackupView = memo(function BackupView() {
  const [rows, setRows] = useState<BackupGameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await invoke<BackupGameSummary[]>('list_backup_games');
      setRows(data || []);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openFolder = async (path: string) => {
    try {
      await invoke('reveal_in_file_manager', { path });
    } catch (err) {
      setError(toErrorMessage(err));
    }
  };

  return (
    <div className="backup-view-container" style={{ padding: '24px' }}>
      <div className="store-header">
        <h1 className="store-title">Backup</h1>
        <p className="store-subtitle">
          Per-game backups stored under AetherData/backup. Lua originals, version history, manifests, cracks and original files.
        </p>
      </div>
      <div className="store-separator" />
      <div style={{ marginBottom: '12px' }}>
        <button className="settings-small-btn" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
      {error && <div className="settings-alert error">{error}</div>}
      {loading && rows.length === 0 ? (
        <div className="log-empty-state">Loading backups…</div>
      ) : rows.length === 0 ? (
        <div className="log-empty-state">No backups yet. Install or apply a crack to create one.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px' }}>App ID</th>
              <th style={{ textAlign: 'center', padding: '8px' }}>Lua</th>
              <th style={{ textAlign: 'center', padding: '8px' }}>History</th>
              <th style={{ textAlign: 'center', padding: '8px' }}>Manifests</th>
              <th style={{ textAlign: 'center', padding: '8px' }}>Crack</th>
              <th style={{ textAlign: 'center', padding: '8px' }}>Originals</th>
              <th style={{ textAlign: 'right', padding: '8px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.app_id} style={{ borderTop: '1px solid var(--border, #333)' }}>
                <td style={{ padding: '8px' }}>{r.app_id}</td>
                <td style={{ textAlign: 'center', padding: '8px' }}>{r.has_lua_original ? '✓' : '—'}</td>
                <td style={{ textAlign: 'center', padding: '8px' }}>{r.history_count}</td>
                <td style={{ textAlign: 'center', padding: '8px' }}>{r.manifest_count}</td>
                <td style={{ textAlign: 'center', padding: '8px' }}>{r.has_crack ? '✓' : '—'}</td>
                <td style={{ textAlign: 'center', padding: '8px' }}>{r.has_original_files ? '✓' : '—'}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>
                  <button className="settings-small-btn" onClick={() => openFolder(r.backup_path)}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
});