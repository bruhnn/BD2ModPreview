use crate::asset_download::{fetch, sources};
use base64::{engine::general_purpose::STANDARD, Engine};
use sha2::{Digest, Sha256};
use std::{fs, sync::Mutex};
use tauri::Manager;

static CACHE_LOCK: Mutex<()> = Mutex::new(());
const LIMIT: usize = 20 * 1024 * 1024;

#[derive(serde::Serialize)]
pub struct DatingAudioDownload {
    data: String,
    failures: Vec<String>,
}

#[tauri::command]
pub async fn get_dating_audio(app: tauri::AppHandle, hash: String) -> Result<DatingAudioDownload, String> {
    if hash.len() != 64 || !hash.bytes().all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)) {
        return Err("Invalid audio hash".into());
    }

    let directory = app.path().app_cache_dir().map_err(|e| e.to_string())?.join("dating-audio");
    let path = directory.join(format!("{hash}.ogg"));
    let verified = |data: &[u8]| hex::encode(Sha256::digest(data)) == hash;

    {
        let _guard = CACHE_LOCK.lock().map_err(|e| e.to_string())?;
        if let Ok(data) = fs::read(&path) {
            if verified(&data) {
                return Ok(DatingAudioDownload { data: STANDARD.encode(data), failures: Vec::new() });
            }
            fs::remove_file(&path).map_err(|e| e.to_string())?;
        }
    }

    let (data, failures) = fetch(
        &app,
        &hash,
        &sources("audio/dating/"),
        &format!("{hash}.ogg"),
        LIMIT,
        |data| data.starts_with(b"OggS") && verified(data),
    )
    .await?;

    let _guard = CACHE_LOCK.lock().map_err(|e| e.to_string())?;
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;

    let temporary = path.with_extension("download");
    fs::write(&temporary, &data).map_err(|e| e.to_string())?;
    fs::rename(&temporary, &path).map_err(|e| e.to_string())?;

    Ok(DatingAudioDownload { data: STANDARD.encode(data), failures })
}
