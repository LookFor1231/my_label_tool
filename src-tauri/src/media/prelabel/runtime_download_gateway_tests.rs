use super::*;
use crate::github_proxy::test_support::{gateway, redirect};

const SOURCE: &str = "https://github.com/owner/app/releases/download/V1/onnxruntime.dll";
const PATH: &str = "/gateway/owner/app/releases/download/V1/onnxruntime.dll";
const ASSET: RuntimeAsset = RuntimeAsset {
    file_name: "onnxruntime.dll",
    sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
};

#[tokio::test]
async fn runtime_gateway_preserves_bytes_progress_and_sha_validation() {
    let (settings, server) = gateway(b"abc".to_vec(), PATH);
    let mut events = Vec::new();
    let bytes = download_checked_asset_from_url(
        &AsyncCancellation::new(),
        &ASSET,
        SOURCE,
        &settings,
        DOWNLOAD_TIMEOUTS,
        |event| events.push(event),
    )
    .await
    .unwrap()
    .unwrap();
    server.join().unwrap();
    assert_eq!(bytes, b"abc");
    assert!(matches!(
        events.last(),
        Some(RuntimeDownloadEvent::Progress {
            downloaded: 3,
            total: Some(3),
            ..
        })
    ));
    let (settings, server) = gateway(b"tampered".to_vec(), PATH);
    let error = download_checked_asset_from_url(
        &AsyncCancellation::new(),
        &ASSET,
        SOURCE,
        &settings,
        DOWNLOAD_TIMEOUTS,
        |_| {},
    )
    .await
    .unwrap_err();
    server.join().unwrap();
    assert!(error.contains("SHA-256"));
}

#[tokio::test]
async fn proxy_failure_and_redirect_are_errors_without_direct_fallback() {
    let (settings, server) = redirect(SOURCE, PATH);
    let error = download_checked_asset_from_url(
        &AsyncCancellation::new(),
        &ASSET,
        SOURCE,
        &settings,
        DOWNLOAD_TIMEOUTS,
        |_| {},
    )
    .await
    .unwrap_err();
    server.join().unwrap();
    assert!(error.contains("下载"));
    // This gateway is now closed; the request must fail instead of reaching GitHub.
    assert!(download_checked_asset_from_url(
        &AsyncCancellation::new(),
        &ASSET,
        SOURCE,
        &settings,
        DOWNLOAD_TIMEOUTS,
        |_| {}
    )
    .await
    .is_err());
}
