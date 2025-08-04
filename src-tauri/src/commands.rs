use crate::download::{download_file, get_download_info};
use crate::errors::{DownloadError, Error};
use crate::types::{DownloadFinished, SpineAssetData};
use crate::utils::{detect_folder_type, file_to_data_uri};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};

#[tauri::command]
pub fn get_spine_assets(folder_path: String) -> Result<SpineAssetData, Error> {
    let dir_path = Path::new(&folder_path);

    let mut raw_data = HashMap::new();
    let mut skel_path: Option<PathBuf> = None;
    let mut atlas_path: Option<PathBuf> = None;

    if !dir_path.exists() {
        return Err(Error::DirectoryNotFound(folder_path));
    }

    let entries = fs::read_dir(dir_path).map_err(|error| {
        Error::DirectoryInvalidError(folder_path.to_string(), error.to_string())
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

    let (mod_type, id_option) = detect_folder_type(folder_path.clone());

    Ok(SpineAssetData {
        mod_type,
        mod_id: id_option,
        skeleton_filename,
        atlas_filename,
        raw_data,
    })
}

#[tauri::command]
pub fn download_missing_skeleton(app: AppHandle, folder_path: String) -> Result<(), DownloadError> {
    let (mod_type, char_id_option) = detect_folder_type(folder_path.clone());
    let char_id = char_id_option.ok_or(DownloadError::CharacterIdNotFound)?;

    let (base_url, remote_path, local_filename) = get_download_info(mod_type, &char_id)?;

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
                destination_path: folder_path,
            },
        )
        .map_err(|e| {
            DownloadError::NetworkError(format!("Failed to emit download-finished event: {}", e))
        })?;
    }

    Ok(())
}
