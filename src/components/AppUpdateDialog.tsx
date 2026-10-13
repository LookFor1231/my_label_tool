import type { Update } from "@tauri-apps/plugin-updater";
import { UPDATE_ZH_CN as text } from "../i18n/update.zh-CN";
import { Overlay } from "./overlay/Overlay";
import { ReleaseNotes } from "./ReleaseNotes";

export interface AppUpdateDialogProps {
  pendingUpdate: Pick<Update, "version" | "currentVersion" | "body"> | null;
  isUpdateOpen: boolean;
  closeUpdateDialog: () => void;
  installUpdate: () => void;
  updateBusy: boolean;
}

export function AppUpdateDialog({
  pendingUpdate,
  isUpdateOpen,
  closeUpdateDialog,
  installUpdate,
  updateBusy,
}: AppUpdateDialogProps) {
  if (!isUpdateOpen || !pendingUpdate) return null;
  return (
    <Overlay onClose={closeUpdateDialog} label={text.found} size="lg">
      <section className="flex max-h-[min(44rem,85vh)] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <header className="shrink-0 border-b border-slate-800 px-6 pb-5 pt-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-medium tracking-widest text-sky-300">{text.ready}</p>
            <button
              type="button"
              onClick={closeUpdateDialog}
              aria-label={text.dismiss}
              className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              ×
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-50">
              {text.version(pendingUpdate.version)}
            </h2>
            <span className="text-xs text-slate-400">
              {text.currentVersion(pendingUpdate.currentVersion)}
            </span>
          </div>
        </header>
        <div
          className="scrollbar-dark min-h-0 overflow-y-auto px-6 py-5"
          tabIndex={0}
          aria-label={text.releaseNotes}
        >
          <ReleaseNotes body={pendingUpdate.body?.trim() || text.noReleaseNotes} />
        </div>
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-slate-800 bg-slate-950/40 px-6 py-4">
          <p className="text-xs text-slate-400">{text.restartHint}</p>
          <div className="ml-auto flex gap-3">
            <button
              type="button"
              onClick={closeUpdateDialog}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              {text.later}
            </button>
            <button
              type="button"
              onClick={installUpdate}
              disabled={updateBusy}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-wait disabled:opacity-50"
            >
              {text.install}
            </button>
          </div>
        </footer>
      </section>
    </Overlay>
  );
}
