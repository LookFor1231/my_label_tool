use crate::app_update::{self, Metadata};

#[tauri::command]
pub async fn check_app_update(webview: tauri::Webview) -> Result<Option<Metadata>, String> {
    app_update::check(webview).await
}

#[tauri::command]
pub async fn prepare_app_update_download(
    webview: tauri::Webview,
    rid: tauri::ResourceId,
) -> Result<Metadata, String> {
    app_update::prepare_download(webview, rid).await
}
