use crate::providers::http;
use crate::steam::api::{self, AppDetailsEnvelope};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

const GENRE_TIMEOUT_SECONDS: u64 = 4;
const GENRE_CONCURRENCY_LIMIT: usize = 3;
const CACHE_FILE_NAME: &str = "genres_cache.json";
const CACHE_TTL_SECONDS: u64 = 30 * 24 * 60 * 60;

#[derive(Debug, Default, Serialize, Deserialize)]
struct GenreCacheFile {
    #[serde(default)]
    app_version: String,
    entries: HashMap<u32, GenreCacheEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct GenreCacheEntry {
    genres: Vec<String>,
    checked_at_unix: u64,
}

pub struct GenreDetector {
    client: reqwest::Client,
    cache_path: PathBuf,
    app_version: String,
}

impl GenreDetector {
    pub fn new(cache_dir: &Path, app_version: String) -> Self {
        Self {
            client: http::shared_client(GENRE_TIMEOUT_SECONDS),
            cache_path: cache_dir.join(CACHE_FILE_NAME),
            app_version,
        }
    }

    pub async fn detect_many(&self, app_ids: Vec<u32>) -> Result<HashMap<u32, Vec<String>>, String> {
        let mut cache = self.load_cache();
        let now = Self::now_unix();

        let mut results: HashMap<u32, Vec<String>> = HashMap::new();
        let mut missing: Vec<u32> = Vec::new();
        for app_id in app_ids {
            match cache.entries.get(&app_id) {
                Some(entry) if now.saturating_sub(entry.checked_at_unix) <= CACHE_TTL_SECONDS => {
                    results.insert(app_id, entry.genres.clone());
                }
                _ => missing.push(app_id),
            }
        }

        if missing.is_empty() {
            return Ok(results);
        }

        let rate_limited = Arc::new(AtomicBool::new(false));
        let client = self.client.clone();
        let fetched = api::concurrent_app_tasks(missing, GENRE_CONCURRENCY_LIMIT, {
            let rate_limited = Arc::clone(&rate_limited);
            move |app_id| {
                let client = client.clone();
                let breaker = Arc::clone(&rate_limited);
                async move {
                    if breaker.load(Ordering::Relaxed) {
                        return None;
                    }
                    match Self::fetch_genres(&client, app_id).await {
                        Ok(genres) => Some((app_id, genres)),
                        Err(e) => {
                            if e.starts_with(api::RATE_LIMIT_ERROR_PREFIX) {
                                breaker.store(true, Ordering::Relaxed);
                            }
                            None
                        }
                    }
                }
            }
        })
        .await;

        if !fetched.is_empty() {
            let now = Self::now_unix();
            for (app_id, genres) in &fetched {
                cache.entries.insert(
                    *app_id,
                    GenreCacheEntry {
                        genres: genres.clone(),
                        checked_at_unix: now,
                    },
                );
            }
            if let Err(e) = self.save_cache(&cache) {
                eprintln!("[GENRE] Failed to persist genre cache: {}", e);
            }
        }
        results.extend(fetched);

        Ok(results)
    }

    async fn fetch_genres(client: &reqwest::Client, app_id: u32) -> Result<Vec<String>, String> {
        let envelope: AppDetailsEnvelope = api::fetch_app_details(client, app_id).await?;
        let genres = envelope
            .data
            .as_ref()
            .map(|details| {
                details
                    .get("genres")
                    .and_then(|g| g.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|g| g.get("description").and_then(|d| d.as_str()).map(String::from))
                            .collect()
                    })
                    .unwrap_or_default()
            })
            .unwrap_or_default();
        Ok(genres)
    }

    fn load_cache(&self) -> GenreCacheFile {
        let Ok(content) = fs::read_to_string(&self.cache_path) else {
            return GenreCacheFile::default();
        };
        let mut cache = serde_json::from_str::<GenreCacheFile>(&content).unwrap_or_default();
        if cache.app_version != self.app_version {
            cache.entries.clear();
        }
        cache
    }

    fn save_cache(&self, cache: &GenreCacheFile) -> Result<(), String> {
        if let Some(parent) = self.cache_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create genre cache directory: {}", e))?;
        }
        let temp_path = self.cache_path.with_extension("tmp");
        let stamped = GenreCacheFile {
            app_version: self.app_version.clone(),
            entries: cache.entries.clone(),
        };
        let content = serde_json::to_string(&stamped)
            .map_err(|e| format!("Failed to serialize genre cache: {}", e))?;
        fs::write(&temp_path, &content)
            .map_err(|e| format!("Failed to write genre cache: {}", e))?;
        fs::rename(&temp_path, &self.cache_path)
            .map_err(|e| format!("Failed to apply genre cache: {}", e))
    }

    fn now_unix() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_secs())
            .unwrap_or_default()
    }
}