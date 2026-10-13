import { OperationStatus } from "./operations/OperationStatus";
import type { AppUpdateStatus } from "../lib/updater";
import { UPDATE_ZH_CN as text } from "../i18n/update.zh-CN";
import { AppUpdateDialog, type AppUpdateDialogProps } from "./AppUpdateDialog";

interface AppUpdateNoticeProps extends Omit<AppUpdateDialogProps, "updateBusy"> {
  updateMessage: string;
  updateStatus: AppUpdateStatus;
  setUpdateMessage: (message: string) => void;
}

export function AppUpdateNotice(props: AppUpdateNoticeProps) {
  const { updateMessage, updateStatus, setUpdateMessage } = props;
  return (
    <>
      <AppUpdateDialog
        {...props}
        updateBusy={updateStatus === "checking" || updateStatus === "downloading"}
      />
      <OperationStatus>
        {updateMessage && (
          <section
            role={updateStatus === "error" ? "alert" : "status"}
            className="w-80 max-w-full rounded-xl border border-slate-700 bg-slate-950/95 p-4 text-sm text-slate-100 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 whitespace-pre-wrap text-slate-300 [overflow-wrap:anywhere]">
                {updateMessage}
              </p>
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
          </section>
        )}
      </OperationStatus>
    </>
  );
}
