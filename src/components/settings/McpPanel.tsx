import { useState } from "react";
import { flushSync } from "react-dom";
import { mcpConfigure, mcpToken } from "../../lib/tauri-api";
import { MCP_ZH_CN as text } from "../../i18n/mcp.zh-CN";
import type { McpControlState, McpPermission, McpStatus } from "../../types/mcp";
import type { McpController } from "../../lib/mcp-controller";
import { confirmAction } from "../../lib/prompts";
import { Overlay } from "../overlay/Overlay";
import { McpControlBar } from "./McpControlBar";

export function McpPanel({
  status,
  error,
  controller,
  state,
}: {
  status: McpStatus | null;
  error: string;
  controller: McpController;
  state: McpControlState;
}) {
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("127.0.0.1");
  const [port, setPort] = useState(1421);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const button =
    "rounded border border-slate-600 px-3 py-1 text-xs hover:border-sky-400 focus-visible:outline focus-visible:outline-sky-400 disabled:opacity-40";
  const endpoint = status
    ? `http://${status.address.includes(":") ? `[${status.address}]` : status.address}:${status.port}/mcp`
    : "";
  const connectionError = error || status?.error;
  const summary = connectionError
    ? text.statusError
    : state.mode === "pending"
      ? text.statusPending
      : state.mode === "mcp"
        ? text.statusRemote
        : state.mode === "locked"
          ? text.statusLocked
          : !status
            ? text.statusLoading
            : status.running
              ? text.statusRunning
              : text.statusStopped;
  const indicator = connectionError
    ? "bg-rose-400"
    : state.mode !== "human"
      ? "bg-amber-400"
      : status?.running
        ? "bg-emerald-400"
        : "bg-slate-500";
  function close() {
    setOpen(false);
    setToken("");
  }
  function approve(permissions: McpPermission[]) {
    // Remove this dialog from the overlay stack before the controller checks
    // whether the workspace is ready. Other dialogs still prevent approval.
    flushSync(() => close());
    try {
      controller.approve(permissions);
    } catch (error) {
      setMessage(String(error));
      setOpen(true);
    }
  }
  async function configure(enabled: boolean, rotate = false) {
    if (rotate && !(await confirmAction(text.rotateConfirm))) return;
    controller.control.revoke();
    setBusy(true);
    setMessage("");
    try {
      await mcpConfigure(enabled, address, port, rotate);
      setToken("");
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      data-mcp-control
      className="shrink-0 border-t border-slate-800 bg-slate-900 px-3 py-2 text-slate-100"
      aria-label={text.title}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={text.title}
          aria-haspopup="dialog"
          aria-expanded={open}
          title={`${text.title} · ${summary} · ${text.sessionCount(status?.sessions.length ?? 0)}`}
          className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-xs hover:bg-slate-800 focus-visible:outline focus-visible:outline-sky-400"
          onClick={() => {
            setAddress(status?.address ?? "127.0.0.1");
            setPort(status?.port ?? 1421);
            setToken("");
            setMessage("");
            setOpen(true);
          }}
        >
          <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${indicator}`} />
          <span className="font-medium text-slate-300">{text.shortTitle}</span>
          <span
            role="status"
            className={`truncate ${connectionError ? "text-rose-300" : state.mode !== "human" ? "text-amber-300" : "text-slate-400"}`}
          >
            {summary}
          </span>
          {state.mode !== "mcp" && (
            <span className="ml-auto shrink-0 text-slate-500">
              {text.sessionCount(status?.sessions.length ?? 0)}
            </span>
          )}
          <span aria-hidden="true" className="ml-auto text-slate-500">
            ›
          </span>
        </button>
        {state.mode === "mcp" && (
          <button
            type="button"
            className={`${button} shrink-0 border-amber-500/50 text-amber-200`}
            onClick={() => controller.control.revoke()}
          >
            {text.reclaim}
          </button>
        )}
      </div>
      {open && (
        <Overlay onClose={close} label={text.title} size="lg" closeOnBackdrop>
          <section
            data-mcp-control
            className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-4 text-slate-100 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">{text.title}</h2>
              <button type="button" className={button} onClick={close}>
                {text.close}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              {!status ? text.loading : status.running ? text.running : text.stopped} ·{" "}
              {text.sessionCount(status?.sessions.length ?? 0)}
            </p>
            {connectionError && (
              <p role="alert" className="break-words text-xs text-rose-300">
                {connectionError}
              </p>
            )}
            <div className="space-y-2 border-t border-slate-700 pt-3 text-xs">
              <h3 className="text-sm">{text.control}</h3>
              <McpControlBar controller={controller} state={state} onApprove={approve} />
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-400">{text.endpoint}</p>
              <code className="break-all text-sm text-sky-300">{endpoint}</code>
            </div>
            <fieldset disabled={busy || !status} className="flex flex-wrap items-end gap-2">
              <label className="text-xs">
                {text.address}
                <select
                  className="ml-2 rounded bg-slate-800 p-2"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                >
                  <option>127.0.0.1</option>
                  <option>::1</option>
                </select>
              </label>
              <label className="text-xs">
                {text.port}
                <input
                  className="ml-2 w-24 rounded bg-slate-800 p-2"
                  type="number"
                  min={1}
                  max={65535}
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                />
              </label>
              <button className={button} onClick={() => void configure(true)}>
                {status?.running ? text.apply : text.start}
              </button>
              <button className={button} onClick={() => void configure(false)}>
                {text.stop}
              </button>
            </fieldset>
            <div className="space-y-2 border-t border-slate-700 pt-3">
              <p className="text-xs text-slate-400">{text.tokenHint}</p>
              <div className="flex gap-2">
                <button
                  className={button}
                  disabled={busy}
                  onClick={() =>
                    void mcpToken()
                      .then(setToken)
                      .catch((e) => setMessage(String(e)))
                  }
                >
                  {text.token}
                </button>
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => void configure(status?.enabled ?? true, true)}
                >
                  {text.rotate}
                </button>
              </div>
              {token && (
                <input
                  aria-label={text.token}
                  readOnly
                  className="w-full rounded bg-slate-950 p-2 font-mono text-xs"
                  value={token}
                />
              )}
            </div>
            {message && (
              <p role="status" className="text-xs text-amber-300">
                {message}
              </p>
            )}
            <div className="border-t border-slate-700 pt-3">
              <h3 className="mb-2 text-sm">{text.connections}</h3>
              {!status?.sessions.length ? (
                <p className="text-xs text-slate-400">{text.noConnections}</p>
              ) : (
                status.sessions.map((s) => (
                  <p key={s.id} className="truncate text-xs">
                    {s.client} · {s.version} · {s.id.slice(0, 8)}
                  </p>
                ))
              )}
            </div>
            <div className="border-t border-slate-700 pt-3">
              <h3 className="mb-2 text-sm">{text.audit}</h3>
              <div className="max-h-40 overflow-auto font-mono text-xs text-slate-400">
                {!status?.audit.length
                  ? text.noAudit
                  : [...status.audit].reverse().map((a, i) => (
                      <p key={i}>
                        {new Date(a.time).toLocaleTimeString()} · {a.session} · {a.tool} ·{" "}
                        {a.result}
                      </p>
                    ))}
              </div>
            </div>
          </section>
        </Overlay>
      )}
    </section>
  );
}
