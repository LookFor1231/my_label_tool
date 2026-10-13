import { OperationStatus } from "./operations/OperationStatus";
import type { AppUpdateStatus } from "../lib/updater";
import { UPDATE_ZH_CN as text } from "../i18n/update.zh-CN";

interface AppUpdateNoticeProps {
  updateMessage: string;
  updateStatus: AppUpdateStatus;
  setUpdateMessage: (message: string) => void;
  installUpdate: () => void;
}

export function AppUpdateNotice({
  updateMessage,
  updateStatus,
  setUpdateMessage,
  installUpdate,
}: AppUpdateNoticeProps) {
  return (
    <OperationStatus>
      {updateMessage && (
        <section
          role={updateStatus === "error" ? "alert" : "status"}
          className={`flex max-h-[calc(40vh-2rem)] min-w-0 max-w-full shrink-0 flex-col rounded-xl border border-slate-700 bg-slate-950/95 p-4 text-sm text-slate-100 shadow-2xl ${updateStatus === "available" ? "w-[36rem]" : "w-80"}`}
        >
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div className="min-w-0 font-medium">
              {updateStatus === "available"
                ? text.found
                : updateStatus === "error"
                  ? text.failed
                  : text.title}
            </div>
            {updateStatus !== "checking" && (
              <button
                aria-label={text.dismiss}
                className="shrink-0 rounded px-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                type="button"
                onClick={() => setUpdateMessage("")}
              >
                ×
              </button>
            )}
          </div>
          <p className="mt-1 min-h-0 overflow-y-auto whitespace-pre-wrap text-slate-300 [overflow-wrap:anywhere]">
            {updateMessage}
          </p>
          {updateStatus === "available" && (
            <div className="mt-3 flex shrink-0 gap-2">
              <button
                className="rounded bg-sky-500 px-3 py-2 text-sm font-medium text-white hover:bg-sky-400"
                type="button"
                onClick={installUpdate}
              >
                {text.install}
              </button>
              <button
                className="rounded border border-slate-700 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800"
                type="button"
                onClick={() => setUpdateMessage("")}
              >
                {text.later}
              </button>
            </div>
          )}
        </section>
      )}
    </OperationStatus>
  );
}
