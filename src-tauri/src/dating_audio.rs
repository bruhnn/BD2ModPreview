use base64::{engine::general_purpose::STANDARD, Engine};
use sha2::{Digest, Sha256};
use std::{fs, io::Read, sync::Mutex, time::Duration};
use tauri::Manager;

static CACHE_LOCK: Mutex<()> = Mutex::new(());
const AUDIO_URL: &str = "https://cdn.jsdelivr.net/gh/bruhnn/Brown-Dust-2-Asset@master/audio/dating/";

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
    tauri::async_runtime::spawn_blocking(move || {
        let path = directory.join(format!("{hash}.ogg"));
        {
            let _guard = CACHE_LOCK.lock().map_err(|e| e.to_string())?;
            if let Ok(data) = fs::read(&path) {
                if hex::encode(Sha256::digest(&data)) == hash {
                    return Ok(DatingAudioDownload { data: STANDARD.encode(data), failures: Vec::new() });
                }
                fs::remove_file(&path).map_err(|e| e.to_string())?;
            }
        }
        let client = reqwest::blocking::Client::builder()
            .timeout(Duration::from_secs(30)).build().map_err(|e| e.to_string())?;
        let mut failures = Vec::new();
        let mut downloaded = None;
        for (source, base) in [
            ("jsDelivr", AUDIO_URL),
            ("GitHub", "https://raw.githubusercontent.com/bruhnn/Brown-Dust-2-Asset/master/audio/dating/"),
        ] {
            let result = (|| -> Result<Vec<u8>, String> {
                let response = client.get(format!("{base}{hash}.ogg")).send()
                    .and_then(|r| r.error_for_status()).map_err(|e| e.to_string())?;
                let mut data = Vec::new();
                response.take(20 * 1024 * 1024 + 1).read_to_end(&mut data).map_err(|e| e.to_string())?;
                if data.len() > 20 * 1024 * 1024 || !data.starts_with(b"OggS") || hex::encode(Sha256::digest(&data)) != hash {
                    return Err("Dating audio verification failed".into());
                }
                Ok(data)
            })();
            match result {
                Ok(data) => {
                    downloaded = Some(data);
                    break;
                }
                Err(error) => failures.push(format!("{source}: {error}")),
            }
        }
        let data = downloaded.ok_or_else(|| failures.join("; "))?;
        let _guard = CACHE_LOCK.lock().map_err(|e| e.to_string())?;
        if let Ok(cached) = fs::read(&path) {
            if hex::encode(Sha256::digest(&cached)) == hash {
                return Ok(DatingAudioDownload { data: STANDARD.encode(cached), failures });
            }
        }
        fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
        let temporary = path.with_extension("download");
        fs::write(&temporary, &data).map_err(|e| e.to_string())?;
        fs::rename(&temporary, &path).map_err(|e| e.to_string())?;
        Ok(DatingAudioDownload { data: STANDARD.encode(data), failures })
    }).await.map_err(|e| e.to_string())?
}
