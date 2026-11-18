use crate::asset_download::{fetch, sources};
use base64::{engine::general_purpose::STANDARD, Engine};
use sha2::{Digest, Sha256};
use std::{fs, path::PathBuf};
use tauri::Manager;

const LIMIT: usize = 64 * 1024 * 1024;

fn cache_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app.path().app_cache_dir().map_err(|e| e.to_string())?.join("game-backgrounds"))
}

async fn download(app: &tauri::AppHandle, hash: &str) -> Result<Vec<u8>, String> {
    let mut sources = sources("backgrounds/cutscene/");
    // For testing before the images are uploaded, e.g. BD2_BACKGROUNDS_URL=http://127.0.0.1:8765/
    if let Ok(url) = std::env::var("BD2_BACKGROUNDS_URL") {
        sources.insert(0, ("Local".into(), url));
    }
    fetch(app, hash, &sources, &format!("{hash}.webp"), LIMIT, |data| {
        hex::encode(Sha256::digest(data)) == hash
    })
    .await
    .map(|(data, _)| data)
}

#[tauri::command]
pub async fn get_game_background(app: tauri::AppHandle, hash: String) -> Result<String, String> {
    let dir = cache_dir(&app)?;
    let path = dir.join(format!("{hash}.webp"));

    let data = match fs::read(&path) {
        Ok(data) => data,
        Err(_) => {
            let data = download(&app, &hash).await?;
            fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
            fs::write(&path, &data).map_err(|e| e.to_string())?;
            data
        }
    };

    Ok(format!("data:image/webp;base64,{}", STANDARD.encode(data)))
}

#[tauri::command]
pub fn has_game_backgrounds(
    app: tauri::AppHandle,
    hashes: Vec<String>,
) -> Result<bool, String> {
    let dir = cache_dir(&app)?;
    Ok(hashes
        .iter()
        .all(|hash| dir.join(format!("{hash}.webp")).exists()))
}

#[tauri::command]
pub fn get_game_background_cache_size(app: tauri::AppHandle) -> Result<u64, String> {
    let Ok(entries) = fs::read_dir(cache_dir(&app)?) else { return Ok(0) };
    Ok(entries.flatten().filter_map(|entry| entry.metadata().ok()).map(|m| m.len()).sum())
}

#[tauri::command]
pub fn clear_game_background_cache(app: tauri::AppHandle) -> Result<(), String> {
    let _ = fs::remove_dir_all(cache_dir(&app)?);
    Ok(())
}
