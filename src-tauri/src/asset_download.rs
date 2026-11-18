use serde::Serialize;
use std::sync::LazyLock;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

const JSDELIVR: &str = "https://cdn.jsdelivr.net/gh/bruhnn/Brown-Dust-2-Asset@master/";
const GITHUB: &str = "https://raw.githubusercontent.com/bruhnn/Brown-Dust-2-Asset/master/";

static CLIENT: LazyLock<reqwest::Client> = LazyLock::new(|| {
    reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(8))
        .read_timeout(Duration::from_secs(20))
        .build()
        .expect("failed to build HTTP client")
});

#[derive(Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
enum AssetDownloadEvent<'a> {
    Start { id: &'a str, source: &'a str },
    Progress { id: &'a str, received: u64, total: Option<u64> },
}

#[tauri::command]
pub fn missing_assets(app: AppHandle, kind: String, hashes: Vec<String>) -> Result<Vec<String>, String> {
    let (directory, extension) = match kind.as_str() {
        "background" => ("game-backgrounds", "webp"),
        "voice" => ("dating-audio", "ogg"),
        _ => return Err(format!("Unknown asset kind: {kind}")),
    };

    let directory = app.path().app_cache_dir().map_err(|e| e.to_string())?.join(directory);

    Ok(hashes
        .into_iter()
        .filter(|hash| !directory.join(format!("{hash}.{extension}")).exists())
        .collect())
}

pub fn sources(directory: &str) -> Vec<(String, String)> {
    vec![
        ("jsDelivr".into(), format!("{JSDELIVR}{directory}")),
        ("GitHub".into(), format!("{GITHUB}{directory}")),
    ]
}

pub async fn fetch(
    app: &AppHandle,
    id: &str,
    sources: &[(String, String)],
    file: &str,
    limit: usize,
    verify: impl Fn(&[u8]) -> bool,
) -> Result<(Vec<u8>, Vec<String>), String> {
    let mut failures = Vec::new();

    for (source, base) in sources {
        let _ = app.emit("asset-download", AssetDownloadEvent::Start { id, source });

        match download(app, id, &format!("{base}{file}"), limit).await {
            Ok(data) if verify(&data) => return Ok((data, failures)),
            Ok(_) => failures.push(format!("{source}: verification failed")),
            Err(error) => failures.push(format!("{source}: {error}")),
        }
    }

    Err(failures.join("; "))
}

async fn download(app: &AppHandle, id: &str, url: &str, limit: usize) -> Result<Vec<u8>, String> {
    let mut response = CLIENT
        .get(url)
        .send()
        .await
        .and_then(|r| r.error_for_status())
        .map_err(describe)?;

    let total = response.content_length();
    if total.is_some_and(|total| total > limit as u64) {
        return Err("file is too large".into());
    }

    let progress = |received: usize| AssetDownloadEvent::Progress { id, received: received as u64, total };
    let mut data = Vec::new();
    let mut last = Instant::now();

    while let Some(chunk) = response.chunk().await.map_err(describe)? {
        data.extend_from_slice(&chunk);
        if data.len() > limit {
            return Err("file is too large".into());
        }

        if last.elapsed() >= Duration::from_millis(100) {
            last = Instant::now();
            let _ = app.emit("asset-download", progress(data.len()));
        }
    }

    let _ = app.emit("asset-download", progress(data.len()));
    Ok(data)
}

fn describe(error: reqwest::Error) -> String {
    if error.is_timeout() {
        "timed out".into()
    } else if let Some(status) = error.status() {
        format!("HTTP {}", status.as_u16())
    } else if error.is_connect() {
        "could not connect".into()
    } else {
        error.to_string()
    }
}
