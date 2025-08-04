use crate::errors::DownloadError;
use crate::types::{BD2ModType, DownloadProgress, DownloadStarted};
use reqwest::blocking::get;
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use tauri::{AppHandle, Emitter};

const CUTSCENE_URL: &str = "https://raw.githubusercontent.com/myssal/Brown-Dust-2-Asset/refs/heads/master/spine/cutscenes/";
const IDLE_URL: &str =
    "https://raw.githubusercontent.com/bruhnn/Brown-Dust-2-Asset/refs/heads/master/spine/char/";
const NPC_URL: &str =
    "https://raw.githubusercontent.com/bruhnn/Brown-Dust-2-Asset/refs/heads/master/spine/npc/";
const ILLUST_DATING_URL: &str = "https://raw.githubusercontent.com/bruhnn/Brown-Dust-2-Asset/refs/heads/master/spine/illust/illust_dating/";
const ILLUST_SPECIAL_URL: &str = "https://raw.githubusercontent.com/bruhnn/Brown-Dust-2-Asset/refs/heads/master/spine/illust/illust_special/";
const ILLUST_TALK_URL: &str = "https://raw.githubusercontent.com/bruhnn/Brown-Dust-2-Asset/refs/heads/master/spine/illust/illust_talk/";

pub fn download_file(app: AppHandle, url: &str, dest_path: &Path) -> Result<(), DownloadError> {
    app.emit(
        "download-started",
        DownloadStarted {
            destination_path: dest_path.to_string_lossy().to_string(),
        },
    )
    .map_err(|e| {
        DownloadError::NetworkError(format!("Failed to emit download-started event: {}", e))
    })?;

    let response = get(url).map_err(|e| DownloadError::NetworkError(e.to_string()))?;

    if !response.status().is_success() {
        return Err(match response.status().as_u16() {
            404 => DownloadError::SkeletonNotFound(url.to_string()),
            401 | 403 => DownloadError::Unauthorized,
            500..=599 => DownloadError::ServerError(format!("Server error: {}", response.status())),
            _ => DownloadError::NetworkError(format!("HTTP {}", response.status())),
        });
    }

    let total_size = response
        .content_length()
        .ok_or(DownloadError::ContentLengthMissing)?;
    let mut downloaded: u64 = 0;
    let mut stream = response;
    let mut dest = File::create(dest_path).map_err(|e| {
        DownloadError::FileCreationError(format!("Failed to create file '{:?}': {}", dest_path, e))
    })?;

    let mut buffer = [0; 4096];

    loop {
        let chunk_size = match stream.read(&mut buffer) {
            Ok(0) => break, // Download complete
            Ok(n) => n,
            Err(e) => {
                return Err(DownloadError::NetworkError(format!(
                    "Failed to read chunk: {}",
                    e
                )))
            }
        };

        dest.write_all(&buffer[..chunk_size]).map_err(|e| {
            DownloadError::WriteError(format!("Failed to write to '{:?}': {}", dest_path, e))
        })?;
        downloaded += chunk_size as u64;

        app.emit(
            "download-progress",
            DownloadProgress {
                bytes_downloaded: downloaded,
                total_bytes: total_size,
            },
        )
        .map_err(|e| {
            DownloadError::NetworkError(format!("Failed to emit download-progress event: {}", e))
        })?;
    }

    Ok(())
}

pub fn get_download_info(
    mod_type: BD2ModType,
    char_id: &str,
) -> Result<(String, String, String), DownloadError> {
    match mod_type {
        BD2ModType::IDLE => Ok((
            IDLE_URL.to_string(),
            format!("char{0}/char{0}.skel", char_id),
            format!("char{0}.skel", char_id),
        )),
        BD2ModType::CUTSCENE => Ok((
            CUTSCENE_URL.to_string(),
            format!("cutscene_char{0}/cutscene_char{0}.skel", char_id),
            format!("cutscene_char{0}.skel", char_id),
        )),
        BD2ModType::ILLUSTDATING => Ok((
            ILLUST_DATING_URL.to_string(),
            format!("illust_dating{0}/illust_dating{0}.skel", char_id),
            format!("illust_dating{0}.skel", char_id),
        )),
        BD2ModType::ILLUSTSPECIAL => Ok((
            ILLUST_SPECIAL_URL.to_string(),
            format!("illust_special{0}/illust_special{0}.skel", char_id),
            format!("illust_special{0}.skel", char_id),
        )),
        BD2ModType::SPECIALILLUST => Ok((
            ILLUST_SPECIAL_URL.to_string(),
            format!("specialillust{0}/specialillust{0}.skel", char_id),
            format!("specialillust{0}.skel", char_id),
        )),
        BD2ModType::ILLUSTTALK => Ok((
            ILLUST_TALK_URL.to_string(),
            format!("illust_talk{0}/illust_talk{0}.skel", char_id),
            format!("illust_talk{0}.skel", char_id),
        )),
        BD2ModType::NPC => Ok((
            NPC_URL.to_string(),
            format!("npc{0}/npc{0}.skel", char_id),
            format!("npc{0}.skel", char_id),
        )),
        _ => Err(DownloadError::UnsupportedModType),
    }
}
