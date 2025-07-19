// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use base64::{engine::general_purpose::STANDARD, Engine as _};
use reqwest::blocking::get;
use serde::Serialize;
use std::io::Read;
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Emitter};

#[derive(serde::Serialize, Clone)]

struct SpineAssetData {
    skeleton_filename: String,
    atlas_filename: String,
    raw_data: HashMap<String, String>,
}

#[derive(serde::Serialize)]
#[serde(tag = "type", content = "message")]
enum Error {
    DirectoryNotFound,
    MissingSkeletonOrJson,
    MissingAtlas,
    InvalidSkeletonFileName,
    InvalidAtlasFileName,
    InvalidFileName(String),
    DirectoryReadError(String),
    IOError(String),
}
// const ASSETS_URL: &str = "https://github.com/bruhnn/Brown-Dust-2-Asset/tree/master/spine/";
const CUTSCENE_URL: &str = "https://raw.githubusercontent.com/myssal/Brown-Dust-2-Asset/refs/heads/master/spine/cutscenes/";
const IDLE_URL: &str = "https://raw.githubusercontent.com/bruhnn/Brown-Dust-2-Asset/refs/heads/master/spine/char/";
const NPC_URL: &str = "https://raw.githubusercontent.com/bruhnn/Brown-Dust-2-Asset/refs/heads/master/spine/npc/";
const ILLUST_DATING_URL: &str = "https://raw.githubusercontent.com/bruhnn/Brown-Dust-2-Asset/refs/heads/master/spine/illust/illust_dating/";
const ILLUST_SPECIAL_URL: &str = "https://raw.githubusercontent.com/bruhnn/Brown-Dust-2-Asset/refs/heads/master/spine/illust/illust_special/";
const ILLUST_TALK_URL: &str = "https://raw.githubusercontent.com/bruhnn/Brown-Dust-2-Asset/refs/heads/master/spine/illust/illust_talk/";

fn file_to_data_uri(file_path: &Path) -> Result<(String, String), Error> {
    let file_name = file_path
        .file_name()
        .and_then(|s| s.to_str())
        .ok_or_else(|| Error::InvalidFileName(format!("{:?}", file_path)))?
        .to_string();

    let ext = file_path.extension().and_then(|s| s.to_str());

    let (mime_type, encoded_data) = match ext {
        Some("json") | Some("atlas") => {
            let content = fs::read_to_string(file_path).map_err(|e| {
                Error::IOError(format!("Failed to read file '{}': {}", file_name, e))
            })?;
            let mime_type = if ext == Some("json") {
                "application/json"
            } else {
                "text/plain"
            };
            let encoded_data = STANDARD.encode(content.as_bytes());
            (mime_type, encoded_data)
        }
        Some("png") => {
            let bytes = fs::read(file_path).map_err(|e| {
                Error::IOError(format!("Failed to read file '{}': {}", file_name, e))
            })?;
            ("image/png", STANDARD.encode(&bytes))
        }
        Some("skel") | _ => {
            let bytes = fs::read(file_path).map_err(|e| {
                Error::IOError(format!("Failed to read file '{}': {}", file_name, e))
            })?;
            ("application/octet-stream", STANDARD.encode(&bytes))
        }
    };

    let data_uri = format!("data:{};base64,{}", mime_type, encoded_data);
    Ok((file_name, data_uri))
}

#[tauri::command]
fn get_spine_assets(folder_path: String) -> Result<SpineAssetData, Error> {
    let dir_path = Path::new(&folder_path);

    let mut raw_data = HashMap::new();
    let mut skel_path: Option<PathBuf> = None;
    let mut atlas_path: Option<PathBuf> = None;

    if !dir_path.exists() {
        return Err(Error::DirectoryNotFound);
    }

    let entries = fs::read_dir(dir_path).map_err(|e| {
        Error::DirectoryReadError(format!("Error reading directory '{}': {}", folder_path, e))
    })?;

    for entry in entries.filter_map(Result::ok) {
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                match ext {
                    "json" | "skel" => {
                        skel_path = Some(path.clone());
                        let (file_name, data_uri) = file_to_data_uri(&path)?;
                        raw_data.insert(file_name, data_uri);
                    }
                    "atlas" => {
                        atlas_path = Some(path.clone());
                        let (file_name, data_uri) = file_to_data_uri(&path)?;
                        raw_data.insert(file_name, data_uri);
                    }
                    "png" => {
                        let (file_name, data_uri) = file_to_data_uri(&path)?;
                        raw_data.insert(file_name, data_uri);
                    }
                    _ => {}
                }
            }
        }
    }

    let skel_file = skel_path.ok_or(Error::MissingSkeletonOrJson)?;
    let atlas_file = atlas_path.ok_or(Error::MissingAtlas)?;

    let skeleton_filename = skel_file
        .file_name()
        .and_then(|s| s.to_str())
        .ok_or(Error::InvalidSkeletonFileName)?
        .to_string();

    let atlas_filename = atlas_file
        .file_name()
        .and_then(|s| s.to_str())
        .ok_or(Error::InvalidAtlasFileName)?
        .to_string();

    Ok(SpineAssetData {
        skeleton_filename,
        atlas_filename,
        raw_data,
    })
}

#[derive(Debug, PartialEq, Clone)]
pub enum BD2ModType {
    IDLE,
    CUTSCENE,
    ILLUSTDATING,
    ILLUSTSPECIAL,
    SPECIALILLUST, // for some reason it has these two?
    ILLUSTTALK,
    NPC,
    UNKNOWN,
}
fn extract_character_id(filename: &str, prefix: &str) -> Option<String> {
    if filename.starts_with(prefix) && filename.ends_with(".modfile") {
        let without_prefix = &filename[prefix.len()..];
        let without_suffix = &without_prefix[..without_prefix.len() - 8]; // Remove ".modfile"

        // Handle cases like "123" or "123_456"
        if let Some(underscore_pos) = without_suffix.find('_') {
            without_suffix[..underscore_pos].to_string().into()
        } else {
            without_suffix.to_string().into()
        }
    } else {
        None
    }
}

fn detect_folder_type(folder_path: String) -> (BD2ModType, Option<String>) {
    if let Ok(entries) = fs::read_dir(folder_path) {
        let patterns = [
            (BD2ModType::IDLE, "char"),
            (BD2ModType::CUTSCENE, "cutscene_char"),
            (BD2ModType::ILLUSTDATING, "illust_dating"),
            (BD2ModType::ILLUSTSPECIAL, "illust_special"),
            (BD2ModType::SPECIALILLUST, "specialillust"),
            (BD2ModType::ILLUSTTALK, "illust_talk"),
            (BD2ModType::NPC, "npc"),
        ];

        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(filename) = path.file_name().and_then(|s| s.to_str()) {
                    let filename_lower = filename.to_lowercase();
                    if filename_lower.ends_with(".modfile") {
                        for (mod_type, prefix) in &patterns {
                            if let Some(character_id) =
                                extract_character_id(&filename_lower, prefix)
                            {
                                return (mod_type.clone(), Some(character_id));
                            }
                        }
                    }
                }
            }
        }
    }

    (BD2ModType::UNKNOWN, None)
}

#[tauri::command]
fn download_missing_skeleton(app: AppHandle, folder_path: String) -> Result<(), String> {
    let (mod_type, char_id_option) = detect_folder_type(folder_path.clone());
    let char_id = char_id_option.ok_or("Could not determine character ID from .modfile.")?;

    println!("{:?}", mod_type);
    println!("{}", char_id);

    let (base_url, remote_path, local_filename) = match mod_type {
        BD2ModType::IDLE => (
            IDLE_URL,
            format!("char{0}/char{0}.skel", char_id),
            format!("char{0}.skel", char_id),
        ),
        BD2ModType::CUTSCENE => (
            CUTSCENE_URL,
            format!("cutscene_char{0}/cutscene_char{0}.skel", char_id),
            format!("cutscene_char{0}.skel", char_id),
        ),
        BD2ModType::ILLUSTDATING => (
            ILLUST_DATING_URL,
            format!("illust_dating{0}/illust_dating{0}.skel", char_id),
            format!("illust_dating{0}.skel", char_id),
        ),
        BD2ModType::ILLUSTSPECIAL => (
            ILLUST_SPECIAL_URL,
            format!("illust_special{0}/illust_special{0}.skel", char_id),
            format!("illust_special{0}.skel", char_id),
        ),
        BD2ModType::SPECIALILLUST => (
            ILLUST_SPECIAL_URL,
            format!("specialillust{0}/specialillust{0}.skel", char_id),
            format!("specialillust{0}.skel", char_id),
        ),
        BD2ModType::ILLUSTTALK => (
            ILLUST_TALK_URL,
            format!("illust_talk{0}/illust_talk{0}.skel", char_id),
            format!("illust_talk{0}.skel", char_id),
        ),
        BD2ModType::NPC => (
            NPC_URL,
            format!("npc{0}/npc{0}.skel", char_id),
            format!("npc{0}.skel", char_id),
        ),
        _ => return Err("Unknown or unsupported mod type.".into()),
    };

    let dir_path = Path::new(&folder_path);
    let skel_file_path = dir_path.join(&local_filename);

    if !skel_file_path.exists() {
        download_file(
            app.clone(),
            &format!("{}{}", base_url, remote_path),
            &skel_file_path,
        )?;

        app.emit(
            "download-finished",
            DownloadFinished {
                folder_path: folder_path,
            },
        )
        .map_err(|e| format!("Failed to emit download-finished event: {}", e))?;
    }

    Ok(())
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct DownloadStarted {
    destination_path: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DownloadProgress {
    bytes_downloaded: u64,
    total_bytes: u64,
    destination_path: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DownloadFinished {
    folder_path: String,
}

use std::fs::File;
use std::io::Write;

fn download_file(app: AppHandle, url: &str, dest_path: &Path) -> Result<(), String> {
    app.emit(
        "download-started",
        DownloadStarted {
            destination_path: dest_path.to_string_lossy().to_string(),
        },
    )
    .map_err(|e| format!("Failed to emit download-started event: {}", e))?;

    let response = get(url).map_err(|e| format!("Failed to download from {}: {}", url, e))?;

    if !response.status().is_success() {
        let err_msg = match response.status().as_u16() {
            404 => "Oops! The skeleton asset is missing from the GitHub repository.".to_string(),
            _ => format!(
                "Failed to download file: Server responded with {}",
                response.status()
            ),
        };

        return Err(err_msg);
    }

    let total_size = response
        .content_length()
        .ok_or("Failed to get content length")?;
    let mut downloaded: u64 = 0;
    let mut stream = response;
    let mut dest = File::create(dest_path)
        .map_err(|e| format!("Failed to create file '{:?}': {}", dest_path, e))?;

    let mut buffer = [0; 4096];

    loop {
        let chunk_size = match stream.read(&mut buffer) {
            Ok(0) => break, // Download complete
            Ok(n) => n,
            Err(e) => return Err(format!("Failed to read chunk: {}", e)),
        };

        dest.write_all(&buffer[..chunk_size])
            .map_err(|e| format!("Failed to write to '{:?}': {}", dest_path, e))?;
        downloaded += chunk_size as u64;

        app.emit(
            "download-progress",
            DownloadProgress {
                bytes_downloaded: downloaded,
                total_bytes: total_size,
                destination_path: dest_path.to_string_lossy().to_string(),
            },
        )
        .map_err(|e| format!("Failed to emit download-progress event: {}", e))?;
    }
    Ok(())
}

#[cfg(windows)]
fn attach_to_parent_console() {
    use windows::Win32::System::Console::{AttachConsole, ATTACH_PARENT_PROCESS};

    unsafe {
        let _ = AttachConsole(ATTACH_PARENT_PROCESS);
    }
}

#[cfg(windows)]
fn free_console() {
    use windows::Win32::System::Console::FreeConsole;

    unsafe {
        let _ = FreeConsole();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let args: Vec<String> = std::env::args().collect();

    if args.len() > 1 {
        if let Some("--version") = args.get(1).map(|s| s.as_str()) {
            #[cfg(windows)]
            {
                attach_to_parent_console();
            }

            println!("{}", env!("CARGO_PKG_VERSION"));

            #[cfg(windows)]
            {
                free_console();
            }

            std::process::exit(0);
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_spine_assets,
            download_missing_skeleton
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
