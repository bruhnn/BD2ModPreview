use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum Error {
    DirectoryNotFound(String),             // folder path
    DirectoryInvalidError(String, String), // folder path, error
    MissingSkeletonOrJson,
    MissingAtlas,
    InvalidSkeletonFileName,
    InvalidAtlasFileName,
    InvalidFileName(String),
    IOError(String),
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum DownloadError {
    NetworkError(String),
    SkeletonNotFound(String),
    ServerError(String),
    Unauthorized,
    InvalidUrl(String),
    FileCreationError(String),
    WriteError(String),
    ContentLengthMissing,
    UnsupportedModType,
    CharacterIdNotFound,
}
