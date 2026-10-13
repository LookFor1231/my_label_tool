import { useEffect, useRef, useState } from "react";
import { loadGitHubProxySettings, saveGitHubProxySettings } from "../../lib/tauri-api";
import { GITHUB_PROXY_ZH_CN as text } from "../../i18n/github-proxy.zh-CN";

interface Props {
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange: (saving: boolean) => void;
}

export function GitHubProxySettings({ onDirtyChange, onSavingChange }: Props) {
  const [saved, setSaved] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void loadGitHubProxySettings()
      .then((settings) => {
        if (!cancelled) {
          setSaved(settings.url);
          setUrl(settings.url);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(text.failed(reason));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [revision]);
  useEffect(() => {
    onDirtyChange(saved !== null && saved !== url);
  }, [saved, url, onDirtyChange]);
  useEffect(() => {
    onSavingChange(saving);
  }, [saving, onSavingChange]);
  async function save() {
    if (busy.current || saved === null) return;
    busy.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const settings = await saveGitHubProxySettings({ url });
      setSaved(settings.url);
      setUrl(settings.url);
      setMessage(text.saved);
    } catch (reason) {
      setError(text.failed(reason));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  return (
    <section
      aria-label={text.title}
      className="mt-5 space-y-3 rounded-xl border border-slate-700 bg-slate-950/30 p-4"
    >
      <h3 className="text-sm font-semibold text-slate-100">{text.title}</h3>
      <p className="text-xs leading-5 text-slate-400">{text.hint}</p>
      <p className="text-xs leading-5 text-slate-400">{text.redirectHint}</p>
      {loading ? (
        <p role="status" className="text-xs text-slate-400">
          {text.loading}
        </p>
      ) : saved !== null ? (
        <>
          <label className="block space-y-2 text-xs text-slate-300">
            <span>{text.url}</span>
            <input
              type="text"
              value={url}
              placeholder={text.placeholder}
              disabled={saving}
              spellCheck={false}
              onChange={(event) => {
                setUrl(event.target.value);
                setMessage("");
                setError("");
              }}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-sky-400 disabled:opacity-60"
            />
          </label>
          <p className="text-xs leading-5 text-slate-500">{text.example}</p>
          <button
            type="button"
            disabled={saving || saved === url}
            onClick={() => void save()}
            className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
          >
            {saving ? text.saving : text.save}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setRevision((value) => value + 1)}
          className="rounded border border-slate-600 px-3 py-2 text-xs text-slate-200"
        >
          {text.retry}
        </button>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-xs text-sky-300">
          {message}
        </p>
      )}
    </section>
  );
}
