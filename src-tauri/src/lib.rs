mod commands;
mod download;
mod errors;
mod types;
mod utils;

pub use commands::*;
pub use types::*;

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

            println!("\n{}", env!("CARGO_PKG_VERSION"));

            #[cfg(windows)]
            {
                free_console();
            }

            std::process::exit(0);
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
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
