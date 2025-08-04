use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, PartialEq, Clone, Serialize, Deserialize)]
pub enum BD2ModType {
    #[serde(rename = "idle")]
    IDLE,
    #[serde(rename = "cutscene")]
    CUTSCENE,
    #[serde(rename = "illustdating")]
    ILLUSTDATING,
    #[serde(rename = "illustspecial")]
    ILLUSTSPECIAL,
    #[serde(rename = "specialillust")]
    SPECIALILLUST,
    #[serde(rename = "illusttalk")]
    ILLUSTTALK,
    #[serde(rename = "npc")]
    NPC,
    #[serde(rename = "unknown")]
    UNKNOWN,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpineAssetData {
    pub mod_type: BD2ModType,
    pub mod_id: Option<String>,
    pub skeleton_filename: String,
    pub atlas_filename: String,
    pub raw_data: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ModType {
    Cutscene,
    Idle,
    Npc,
    Dating,
    Scene,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadStarted {
    pub destination_path: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadFinished {
    pub destination_path: String,
}
