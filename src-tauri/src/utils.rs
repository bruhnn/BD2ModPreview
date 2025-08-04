use crate::errors::Error;
use crate::types::BD2ModType;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use std::{fs, path::Path};

pub fn file_to_data_uri(file_path: &Path) -> Result<(String, String), Error> {
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

pub fn extract_character_id(filename: &str, prefix: &str) -> Option<String> {
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

pub fn detect_folder_type(folder_path: String) -> (BD2ModType, Option<String>) {
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
