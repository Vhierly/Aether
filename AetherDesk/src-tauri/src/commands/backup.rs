use crate::core::backup::GameBackup;
use crate::core::paths::LocalAppPaths;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct BackupGameSummary {
    pub app_id: u32,
    pub has_lua_original: bool,
    pub history_count: usize,
    pub manifest_count: usize,
    pub has_crack: bool,
    pub has_original_files: bool,
    pub backup_path: String,
}

#[tauri::command]
pub fn list_backup_games() -> Result<Vec<BackupGameSummary>, String> {
    let root = LocalAppPaths::backup_root();
    let mut out = Vec::new();
    let Ok(entries) = std::fs::read_dir(&root) else {
        return Ok(out);
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        let Ok(app_id) = name.parse::<u32>() else {
            continue;
        };
        let Some(backup) = GameBackup::open_existing(app_id) else {
            continue;
        };
        let lua_dir = backup.lua_dir();
        let has_lua_original = lua_dir.join(format!("{app_id}.lua")).is_file();
        let (history_count, manifest_count) = {
            let history_dir = lua_dir.join("history");
            let h = std::fs::read_dir(&history_dir)
                .map(|rd| {
                    rd.flatten()
                        .filter(|e| e.path().extension().and_then(|x| x.to_str()) == Some("lua"))
                        .count()
                })
                .unwrap_or(0);
            let m = std::fs::read_dir(&lua_dir)
                .map(|rd| {
                    rd.flatten()
                        .filter(|e| {
                            e.path().extension().and_then(|x| x.to_str()) == Some("manifest")
                        })
                        .count()
                })
                .unwrap_or(0);
            (h, m)
        };
        let has_crack = backup.has_saved_crack();
        let original_dir = backup.original_dir();
        let has_original_files = std::fs::read_dir(&original_dir)
            .map(|rd| rd.flatten().any(|e| e.path().is_file()))
            .unwrap_or(false);
        out.push(BackupGameSummary {
            app_id,
            has_lua_original,
            history_count,
            manifest_count,
            has_crack,
            has_original_files,
            backup_path: path.display().to_string(),
        });
    }
    out.sort_by_key(|s| s.app_id);
    Ok(out)
}
