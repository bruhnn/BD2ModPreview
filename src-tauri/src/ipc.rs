use serde_json::{json, Value};
use std::{
    sync::atomic::{AtomicBool, Ordering},
    time::Duration,
};
use tauri::{Emitter, Manager};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::windows::named_pipe::{ClientOptions, NamedPipeClient},
};

#[derive(Default)]
pub struct ManagerConnection(pub AtomicBool);

async fn connect() -> std::io::Result<NamedPipeClient> {
    loop {
        match ClientOptions::new().open(format!(
            r"\\.\pipe\BD2ModManager-preview-{}",
            std::env::var("USERNAME").unwrap_or_default()
        )) {
            Err(error) if error.raw_os_error() == Some(231) => {
                tokio::time::sleep(Duration::from_millis(25)).await;
            }
            result => return result,
        }
    }
}

async fn write_message(pipe: &mut NamedPipeClient, value: Value) -> Result<(), String> {
    let bytes = serde_json::to_vec(&value).map_err(|e| e.to_string())?;
    pipe.write_u32(bytes.len() as u32)
        .await
        .map_err(|e| e.to_string())?;
    pipe.write_all(&bytes).await.map_err(|e| e.to_string())
}

async fn read_message(pipe: &mut NamedPipeClient) -> Result<Value, String> {
    let length = pipe.read_u32().await.map_err(|e| e.to_string())?;
    if length > 16 * 1024 * 1024 {
        return Err("ModManager response is too large".into());
    }
    let mut bytes = vec![0; length as usize];
    pipe.read_exact(&mut bytes)
        .await
        .map_err(|e| e.to_string())?;
    serde_json::from_slice(&bytes).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn connect_to_bd2mm(app: tauri::AppHandle) -> Result<(), String> {
    if app
        .state::<ManagerConnection>()
        .0
        .swap(true, Ordering::SeqCst)
    {
        return Ok(());
    }
    let result = async {
        let mut pipe = connect().await.map_err(|e| e.to_string())?;
        write_message(&mut pipe, json!({ "command": "subscribe" })).await?;
        let initial = read_message(&mut pipe).await?;
        Ok::<_, String>((pipe, initial))
    };
    let result = tokio::time::timeout(Duration::from_secs(5), result)
        .await
        .unwrap_or_else(|_| Err("BD2MM connection timed out".into()));
    let (mut pipe, initial) = match result {
        Ok(result) => result,
        Err(error) => {
            app.state::<ManagerConnection>()
                .0
                .store(false, Ordering::SeqCst);
            return Err(error);
        }
    };
    let _ = app.emit("bd2mm::state", initial);
    tauri::async_runtime::spawn(async move {
        while let Ok(value) = read_message(&mut pipe).await {
            let _ = app.emit("bd2mm::state", value);
        }
        app.state::<ManagerConnection>()
            .0
            .store(false, Ordering::SeqCst);
        let _ = app.emit("bd2mm::disconnected", ());
    });
    Ok(())
}

#[tauri::command]
pub async fn enable_mod_on_bd2mm(mod_name: String, enabled: bool) -> Result<Value, String> {
    tokio::time::timeout(Duration::from_secs(20), async {
        let mut pipe = connect().await.map_err(|e| e.to_string())?;
        write_message(
            &mut pipe,
            json!({ "command": "setModEnabled", "modName": mod_name, "enabled": enabled }),
        )
        .await?;
        let response = read_message(&mut pipe).await?;
        match response["error"].as_str() {
            Some(error) => Err(error.to_string()),
            None => Ok(response),
        }
    })
    .await
    .map_err(|_| "BD2MM request timed out".to_string())?
}
