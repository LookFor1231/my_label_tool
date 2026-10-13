use super::*;
use crate::github_proxy::test_support::{gateway, redirect};
use tauri::test::{mock_builder, mock_context, noop_assets};

const MANIFEST_PATH: &str = "/gateway/owner/app/releases/latest/download/latest.json";
const ASSET_PATH: &str = "/gateway/owner/app/releases/download/V99/update.exe";
const ASSET_URL: &str = "https://github.com/owner/app/releases/download/V99/update.exe";
const PAYLOAD: &[u8] = include_bytes!("fixtures/payload.txt");

fn app() -> tauri::App<tauri::test::MockRuntime> {
    let mut context = mock_context(noop_assets());
    context.config_mut().plugins.0.insert(
        "updater".into(),
        serde_json::json!({
            "endpoints": ["https://github.com/owner/app/releases/latest/download/latest.json"],
            "pubkey": include_str!("fixtures/public-key.txt").trim(),
            "dangerousInsecureTransportProtocol": true
        }),
    );
    let app = mock_builder()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .build(context)
        .unwrap();
    tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
        .build()
        .unwrap();
    app
}

fn manifest() -> Vec<u8> {
    serde_json::to_vec(&serde_json::json!({
        "version": "99.0.0", "notes": "### 更新说明", "url": ASSET_URL,
        "signature": include_str!("fixtures/payload.txt.sig").trim()
    }))
    .unwrap()
}

#[tokio::test]
async fn checks_via_gateway_downloads_via_new_gateway_and_verifies_signature() {
    let app = app();
    let webview = app.get_webview_window("main").unwrap().as_ref().clone();
    let (first, server) = gateway(manifest(), MANIFEST_PATH);
    let cached = check_with_settings(webview.clone(), &first)
        .await
        .unwrap()
        .unwrap();
    server.join().unwrap();
    assert_eq!(cached.version, "99.0.0");
    let original = webview.resources_table().get::<Update>(cached.rid).unwrap();
    assert_eq!(original.download_url.as_str(), ASSET_URL);
    let (next, server) = gateway(PAYLOAD.to_vec(), ASSET_PATH);
    let prepared = prepare_with_settings(&webview, cached.rid, &next).unwrap();
    let update = webview
        .resources_table()
        .get::<Update>(prepared.rid)
        .unwrap();
    let bytes = update.download(|_, _| {}, || {}).await.unwrap();
    server.join().unwrap();
    assert_eq!(bytes, PAYLOAD);
    webview.resources_table().close(prepared.rid).unwrap();
    // The original resource survives disposal of a download attempt.
    let cleared = prepare_with_settings(&webview, cached.rid, &Default::default()).unwrap();
    let cleared = webview
        .resources_table()
        .get::<Update>(cleared.rid)
        .unwrap();
    assert_eq!(cleared.download_url.as_str(), ASSET_URL);
    assert!(!cleared.no_proxy);
    let (tampered, server) = gateway(b"tampered update".to_vec(), ASSET_PATH);
    let tampered = prepare_with_settings(&webview, cached.rid, &tampered).unwrap();
    let tampered = webview
        .resources_table()
        .get::<Update>(tampered.rid)
        .unwrap();
    assert!(tampered.download(|_, _| {}, || {}).await.is_err());
    server.join().unwrap();
}

#[tokio::test]
async fn gateway_redirect_cannot_bypass_the_proxy_during_check_or_download() {
    let app = app();
    let webview = app.get_webview_window("main").unwrap().as_ref().clone();
    let (settings, server) = redirect("https://github.com/owner/app/latest.json", MANIFEST_PATH);
    assert!(check_with_settings(webview.clone(), &settings)
        .await
        .is_err());
    server.join().unwrap();
    let (settings, server) = gateway(manifest(), MANIFEST_PATH);
    let cached = check_with_settings(webview.clone(), &settings)
        .await
        .unwrap()
        .unwrap();
    server.join().unwrap();
    let (settings, server) = redirect(ASSET_URL, ASSET_PATH);
    let attempt = prepare_with_settings(&webview, cached.rid, &settings).unwrap();
    let update = webview
        .resources_table()
        .get::<Update>(attempt.rid)
        .unwrap();
    assert!(update.download(|_, _| {}, || {}).await.is_err());
    server.join().unwrap();
}
