//! Keeps original update URLs in the webview resource table; each download gets a
//! disposable clone using the latest gateway. Tauri still verifies and installs it.
use crate::{github_proxy, i18n::zh_cn as text};
use serde::Serialize;
use tauri::{Manager, ResourceId, Webview};
use tauri_plugin_updater::{Update, UpdaterExt};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Metadata {
    rid: ResourceId,
    current_version: String,
    version: String,
    body: Option<String>,
    raw_json: serde_json::Value,
}

fn register<R: tauri::Runtime>(webview: &Webview<R>, update: Update) -> Metadata {
    Metadata {
        current_version: update.current_version.clone(),
        version: update.version.clone(),
        body: update.body.clone(),
        raw_json: update.raw_json.clone(),
        rid: webview.resources_table().add(update),
    }
}

pub async fn check(webview: Webview) -> Result<Option<Metadata>, String> {
    let settings = github_proxy::load_for_request(webview.app_handle().clone()).await?;
    check_with_settings(webview, &settings).await
}

async fn check_with_settings<R: tauri::Runtime>(
    webview: Webview<R>,
    settings: &github_proxy::Settings,
) -> Result<Option<Metadata>, String> {
    let app = webview.app_handle();
    let config: tauri_plugin_updater::Config = serde_json::from_value(
        app.config()
            .plugins
            .0
            .get("updater")
            .cloned()
            .ok_or_else(|| text::UPDATE_CONFIG_MISSING.to_string())?,
    )
    .map_err(text::app_update_failed)?;
    let routes = config
        .endpoints
        .iter()
        .map(|url| settings.route(url.as_str()))
        .collect::<Result<Vec<_>, _>>()?;
    let proxied = routes.iter().any(|route| route.proxied);
    let mut builder = webview
        .updater_builder()
        .configure_client(github_proxy::routing::updater_client)
        .timeout(std::time::Duration::from_secs(30))
        .endpoints(routes.into_iter().map(|route| route.url).collect())
        .map_err(text::app_update_failed)?;
    if proxied {
        builder = builder.no_proxy();
    }
    let result = builder
        .build()
        .map_err(text::app_update_failed)?
        .check()
        .await
        .map_err(text::app_update_failed)?;
    Ok(result.map(|mut update| {
        // Check timeout and gateway preference must not become stale download settings.
        update.timeout = None;
        update.no_proxy = false;
        register(&webview, update)
    }))
}

pub async fn prepare_download(webview: Webview, rid: ResourceId) -> Result<Metadata, String> {
    let settings = github_proxy::load_for_request(webview.app_handle().clone()).await?;
    prepare_with_settings(&webview, rid, &settings)
}

fn prepare_with_settings<R: tauri::Runtime>(
    webview: &Webview<R>,
    rid: ResourceId,
    settings: &github_proxy::Settings,
) -> Result<Metadata, String> {
    let original = webview
        .resources_table()
        .get::<Update>(rid)
        .map_err(text::app_update_failed)?;
    let route = settings.route(original.download_url.as_str())?;
    let mut download = (*original).clone();
    download.download_url = route.url;
    download.no_proxy = route.proxied;
    download.proxy = None;
    Ok(register(webview, download))
}

#[cfg(test)]
mod tests;
