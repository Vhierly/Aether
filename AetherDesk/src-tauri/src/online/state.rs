//! Per-game UCOnline2 state persistence.
//!
//! File: `<AetherData>/state/uc_online2.json` — `app_id → OnlineRecord` map.
//! Atomic writes (tmp + rename). The record is an INDEX: the truth is the
//! files on disk (reconciliation lives in `OnlineEngine::status`).
//!
//! Concurrency: this store is used by deploy, disable, and the status engine
//! from multiple command threads. All mutating operations are protected by a
//! global mutex so concurrent upserts/removes never lose writes.

use crate::external_tools::fs::write_atomic;
use crate::online::types::OnlineRecord;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};

/// UCOnline2 state file name (used by commands and store — single source).
pub const STATE_FILE: &str = "uc_online2.json";

/// Global lock for the state file. A single Mutex is sufficient because:
/// - All mutating operations load, modify, and save the entire file.
/// - The file is small (< 1KB typical) so lock contention is negligible.
/// - The same lock is used for read-modify-write in deploy/disable/revert.
static STATE_LOCK: Mutex<()> = Mutex::new(());

/// Acquires the state lock and loads the store, returning both for manual save.
fn lock_state_mut(path: &Path) -> (MutexGuard<'_, ()>, OnlineStateStore) {
    let guard = STATE_LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let store = OnlineStateStore::load(path);
    (guard, store)
}

/// UCOnline2 state store.
#[derive(Debug, Clone, Default)]
pub struct OnlineStateStore {
    records: HashMap<u32, OnlineRecord>,
}

impl OnlineStateStore {
    /// Loads the store from file. Missing or corrupt file → empty store
    /// (never an error: the state is rebuildable from the files on disk).
    pub fn load(path: &Path) -> Self {
        let Ok(content) = std::fs::read_to_string(path) else {
            return Self::default();
        };
        serde_json::from_str(&content).unwrap_or_default()
    }

    /// State file path under a given AetherDesk data root.
    pub fn state_path(data_root: &Path) -> PathBuf {
        data_root.join("state").join(STATE_FILE)
    }

    pub fn get(&self, app_id: u32) -> Option<&OnlineRecord> {
        self.records.get(&app_id)
    }

    /// Inserts/updates the record and saves atomically.
    pub fn upsert(&mut self, record: OnlineRecord, path: &Path) -> Result<(), String> {
        self.records.insert(record.app_id, record);
        self.save(path)
    }

    /// Removes the record (if present) and saves atomically.
    pub fn remove(&mut self, app_id: u32, path: &Path) -> Result<(), String> {
        self.records.remove(&app_id);
        self.save(path)
    }

    fn save(&self, path: &Path) -> Result<(), String> {
        let json = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        write_atomic(path, json.as_bytes())
    }

    /// Thread-safe upsert: loads fresh, applies change, saves — all under the lock.
    pub fn upsert_locked(record: OnlineRecord, path: &Path) -> Result<(), String> {
        let (_guard, mut store) = lock_state_mut(path);
        store.upsert(record, path)
    }

    /// Thread-safe remove: loads fresh, applies change, saves — all under the lock.
    pub fn remove_locked(app_id: u32, path: &Path) -> Result<(), String> {
        let (_guard, mut store) = lock_state_mut(path);
        store.remove(app_id, path)
    }
}

impl serde::Serialize for OnlineStateStore {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.records.serialize(serializer)
    }
}

impl<'de> serde::Deserialize<'de> for OnlineStateStore {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let records = HashMap::<u32, OnlineRecord>::deserialize(deserializer)?;
        Ok(Self { records })
    }
}

/// Timestamp epoch (secondi) per `OnlineRecord::enabled_at`.
pub fn now_epoch_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}
