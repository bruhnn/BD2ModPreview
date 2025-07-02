// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose::STANDARD, Engine as _};
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
};

#[derive(serde::Serialize, Clone)]
struct SpineAssetData {
    skeleton_filename: String,
    atlas_filename: String,
    raw_data: HashMap<String, String>,
}

fn file_to_data_uri(file_path: &Path) -> Result<(String, String), String> {
    let file_name = file_path
        .file_name()
        .and_then(|s| s.to_str())
        .ok_or_else(|| format!("Invalid or non-UTF-8 file name for path: {:?}", file_path))?
        .to_string();

    let bytes = fs::read(file_path)
        .map_err(|e| format!("Failed to read file '{}': {}", file_name, e))?;
    
    let encoded_data = STANDARD.encode(&bytes);

    let mime_type = match file_path.extension().and_then(|s| s.to_str()) {
        Some("json") => "application/json",
        Some("skel") => "application/octet-stream", // Binary skeleton
        Some("atlas") => "text/plain", // Atlas files are plain text
        Some("png") => "image/png",
        _ => "application/octet-stream",
    };

    let data_uri = format!("data:{};base64,{}", mime_type, encoded_data);
    Ok((file_name, data_uri))
}


#[tauri::command]
fn load_spine_assets_as_base64(folder_path: String) -> Result<SpineAssetData, String> {
    let dir_path = Path::new(&folder_path);

    let mut raw_data = HashMap::new();
    let mut skel_path: Option<PathBuf> = None;
    let mut atlas_path: Option<PathBuf> = None;

    let entries = fs::read_dir(dir_path)
        .map_err(|e| format!("Error reading directory '{}': {}", folder_path, e))?;

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

    let skel_file = skel_path.ok_or_else(|| "Could not find a .skel or .json file".to_string())?;
    let atlas_file = atlas_path.ok_or_else(|| "Could not find an .atlas file".to_string())?;

    let skeleton_filename = skel_file
        .file_name()
        .and_then(|s| s.to_str())
        .ok_or_else(|| "Skeleton file has an invalid name".to_string())?
        .to_string();

    let atlas_filename = atlas_file
        .file_name()
        .and_then(|s| s.to_str())
        .ok_or_else(|| "Atlas file has an invalid name".to_string())?
        .to_string();
    
    Ok(SpineAssetData {
        skeleton_filename,
        atlas_filename,
        raw_data,
    })
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_cli::init())
        .invoke_handler(tauri::generate_handler![load_spine_assets_as_base64])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
