use base64::{engine::general_purpose::STANDARD, Engine};
use sha2::{Digest, Sha256};
use std::{fs, path::PathBuf, time::Duration};
use tauri::Manager;

const SOURCES: [&str; 2] = [
    "https://cdn.jsdelivr.net/gh/bruhnn/Brown-Dust-2-Asset@master/backgrounds/cutscene/",
    "https://raw.githubusercontent.com/bruhnn/Brown-Dust-2-Asset/master/backgrounds/cutscene/",
];

fn cache_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app.path().app_cache_dir().map_err(|e| e.to_string())?.join("game-backgrounds"))
}

async fn download(hash: &str) -> Result<Vec<u8>, String> {
    let mut sources: Vec<String> = SOURCES.iter().map(|s| s.to_string()).collect();
    // For testing before the images are uploaded, e.g. BD2_BACKGROUNDS_URL=http://127.0.0.1:8765/
    if let Ok(url) = std::env::var("BD2_BACKGROUNDS_URL") {
        sources.insert(0, url);
    }
    // A stalled download fails after 30 s and moves on to the next source.
    let client = reqwest::Client::builder().timeout(Duration::from_secs(30)).build().map_err(|e| e.to_string())?;
    let mut errors = Vec::new();
    for base in sources {
        let response = client.get(format!("{base}{hash}.webp")).send().await.and_then(|r| r.error_for_status());
        match response {
            Ok(response) => match response.bytes().await {
                // The file name is its SHA-256, so a match means the image is complete and correct.
                Ok(data) if hex::encode(Sha256::digest(&data)) == hash => return Ok(data.to_vec()),
                Ok(_) => errors.push(format!("{base}: checksum mismatch")),
                Err(error) => errors.push(error.to_string()),
            },
            Err(error) => errors.push(error.to_string()),
        }
    }
    Err(errors.join("; "))
}

/// Returns the background image as a data URI, downloading it on first use.
#[tauri::command]
pub async fn get_game_background(app: tauri::AppHandle, hash: String) -> Result<String, String> {
    let dir = cache_dir(&app)?;
    let path = dir.join(format!("{hash}.webp"));
    let data = match fs::read(&path) {
        Ok(data) => data,
        Err(_) => {
            let data = download(&hash).await?;
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
