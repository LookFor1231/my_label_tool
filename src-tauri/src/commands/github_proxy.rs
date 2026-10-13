use crate::github_proxy::{self, Settings};

#[tauri::command]
pub async fn load_github_proxy_settings(app: tauri::AppHandle) -> Result<Settings, String> {
    super::host_text_io(move || github_proxy::load(&app)).await
}

#[tauri::command]
pub async fn save_github_proxy_settings(
    app: tauri::AppHandle,
    settings: Settings,
) -> Result<Settings, String> {
    super::host_text_io(move || github_proxy::save(&app, settings)).await
}
