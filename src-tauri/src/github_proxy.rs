//! Machine-local resource gateway configuration. No plugin or project access.
use crate::i18n::zh_cn as text;
use reqwest::Url;
use serde::{Deserialize, Serialize};
use std::{fs, path::Path, sync::Mutex};
use tauri::Manager;

static SETTINGS_IO: Mutex<()> = Mutex::new(());

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Settings {
    pub url: String,
}

impl Settings {
    fn normalized(self) -> Result<Self, String> {
        let value = self.url.trim();
        if value.is_empty() {
            return Ok(Self::default());
        }
        let lower = value.to_ascii_lowercase();
        if !(lower.starts_with("http://") || lower.starts_with("https://"))
            || value.chars().any(char::is_whitespace)
        {
            return Err(text::GITHUB_PROXY_URL_INVALID.into());
        }
        let url = Url::parse(value).map_err(|_| text::GITHUB_PROXY_URL_INVALID.to_string())?;
        if url.host_str().is_none()
            || !url.username().is_empty()
            || url.password().is_some()
            || url.query().is_some()
            || url.fragment().is_some()
        {
            return Err(text::GITHUB_PROXY_URL_INVALID.into());
        }
        Ok(Self {
            url: url.as_str().trim_end_matches('/').into(),
        })
    }
}

pub fn load(app: &tauri::AppHandle) -> Result<Settings, String> {
    read(
        &app.path()
            .app_data_dir()
            .map_err(text::github_proxy_failed)?
            .join("github-proxy.json"),
    )
}

pub fn save(app: &tauri::AppHandle, settings: Settings) -> Result<Settings, String> {
    write(
        &app.path()
            .app_data_dir()
            .map_err(text::github_proxy_failed)?
            .join("github-proxy.json"),
        settings,
    )
}

fn read(path: &Path) -> Result<Settings, String> {
    let _guard = SETTINGS_IO.lock().map_err(text::github_proxy_failed)?;
    if !path.try_exists().map_err(text::github_proxy_failed)? {
        return Ok(Settings::default());
    }
    let contents = crate::text_read::read(path)?;
    serde_json::from_str::<Settings>(&contents)
        .map_err(text::github_proxy_failed)?
        .normalized()
}

fn write(path: &Path, settings: Settings) -> Result<Settings, String> {
    let settings = settings.normalized()?;
    let _guard = SETTINGS_IO.lock().map_err(text::github_proxy_failed)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(text::github_proxy_failed)?;
    }
    let json = serde_json::to_vec_pretty(&settings).map_err(text::github_proxy_failed)?;
    let staging = path.with_extension("saving");
    if let Err(error) = fs::write(&staging, json).and_then(|()| fs::rename(&staging, path)) {
        let _ = fs::remove_file(&staging);
        return Err(text::github_proxy_failed(error));
    }
    Ok(settings)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_gateway_prefix_and_rejects_invalid_addresses() {
        for (input, expected) in [
            ("  ", ""),
            (
                " http://localhost:8719/github/// ",
                "http://localhost:8719/github",
            ),
            ("https://proxy.example/", "https://proxy.example"),
            ("http://[::1]:8080/gateway", "http://[::1]:8080/gateway"),
        ] {
            assert_eq!(
                Settings { url: input.into() }.normalized().unwrap().url,
                expected
            );
        }
        for input in [
            "socks5://localhost:1080",
            "proxy.example/github",
            "https:proxy.example",
            "https://proxy.example/?q=1",
            "https://proxy.example/#fragment",
            "http://user:pass@proxy.example",
            "http://",
            "https://proxy.\nexample",
        ] {
            assert!(
                Settings { url: input.into() }.normalized().is_err(),
                "{input}"
            );
        }
    }

    #[test]
    fn persists_normalized_settings_preserves_old_value_on_error_and_clears() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("github-proxy.json");
        assert_eq!(read(&path).unwrap(), Settings::default());
        let value = write(
            &path,
            Settings {
                url: " http://proxy.example/github/ ".into(),
            },
        )
        .unwrap();
        assert_eq!(read(&path).unwrap(), value);
        assert!(write(&path, Settings { url: "bad".into() }).is_err());
        assert_eq!(read(&path).unwrap(), value);
        write(&path, Settings::default()).unwrap();
        assert_eq!(read(&path).unwrap(), Settings::default());
        fs::write(&path, "broken json").unwrap();
        assert!(read(&path).is_err());
    }
}
