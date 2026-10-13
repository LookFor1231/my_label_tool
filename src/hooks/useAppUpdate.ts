import { tryBeginOperation } from "../store/useOperations";
import { OPERATION_ZH_CN as operationText } from "../i18n/operations.zh-CN";
import { UPDATE_ZH_CN as text } from "../i18n/update.zh-CN";
import { useEffect, useRef, useState } from "react";
import { checkAppUpdate, installAppUpdate, type AppUpdateStatus } from "../lib/updater";
import type { Update } from "@tauri-apps/plugin-updater";

export function useAppUpdate() {
  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null);
  const [updateStatus, setUpdateStatus] = useState<AppUpdateStatus>("idle");
  const [updateMessage, setUpdateMessage] = useState("");
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const busy = useRef(false);
  const pending = useRef<Update | null>(null);
  const mounted = useRef(true);
  const checked = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const timer = window.setTimeout(() => {
      if (!checked.current) void checkForUpdates(true);
    }, 1500);

    return () => {
      mounted.current = false;
      window.clearTimeout(timer);
      void pending.current?.close().catch(() => {});
    };
  }, []);

  async function checkForUpdates(silent = false) {
    if (busy.current) {
      return;
    }

    busy.current = true;
    checked.current = true;
    setUpdateStatus("checking");
    if (!silent) {
      setUpdateMessage(text.checking);
    }

    try {
      const update = await checkAppUpdate();
      if (!mounted.current) {
        await update?.close();
        return;
      }
      if (pending.current !== update) void pending.current?.close().catch(() => {});
      pending.current = update;
      setPendingUpdate(update);

      if (!update) {
        setIsUpdateOpen(false);
        setUpdateStatus(silent ? "idle" : "not-available");
        setUpdateMessage(silent ? "" : text.latest);
        return;
      }

      setUpdateStatus("available");
      setUpdateMessage("");
      setIsUpdateOpen(true);
    } catch (caughtError: unknown) {
      if (!mounted.current) return;
      setUpdateStatus(silent ? "idle" : "error");
      setUpdateMessage(silent ? "" : text.checkFailed(caughtError));
    } finally {
      busy.current = false;
    }
  }

  async function installUpdate() {
    if (!pendingUpdate || busy.current) {
      return;
    }

    let cancelled = false;
    const operation = tryBeginOperation({
      label: operationText.update,
      resource: "app-update",
      cancel: () => {
        cancelled = true;
        operation?.progress(null, text.cancelling);
      },
    });
    if (!operation) return;
    busy.current = true;
    setIsUpdateOpen(false);
    const downloadMessage = (percent: number | null) =>
      `${text.downloading(pendingUpdate.version, percent)}\n${operationText.updateCancelHint}`;
    operation.progress(null, downloadMessage(null));
    setUpdateStatus("downloading");
    // Download progress and terminal messages belong exclusively to the operation card.
    setUpdateMessage("");

    try {
      const installed = await installAppUpdate(
        pendingUpdate,
        (progress) => {
          operation.progress(
            progress.percent,
            cancelled ? text.cancelling : downloadMessage(progress.percent),
          );
        },
        () => cancelled,
        () => {
          operation.setCancel();
          operation.progress(null, text.installing(pendingUpdate.version));
        },
      );
      if (!installed) {
        operation.complete(operationText.updateCancelled, "warning");
        setUpdateStatus("available");
        return;
      }
      operation.complete(text.installed);
      setUpdateStatus("installed");
    } catch (caughtError: unknown) {
      const message = text.installFailed(caughtError);
      operation.fail(message);
      setUpdateStatus("error");
    } finally {
      busy.current = false;
    }
  }

  return {
    pendingUpdate,
    isUpdateOpen,
    closeUpdateDialog: () => setIsUpdateOpen(false),
    openUpdateDialog: () => {
      if (pending.current && !busy.current) setIsUpdateOpen(true);
    },
    checkForUpdates,
    installUpdate,
    setUpdateMessage,
    updateMessage,
    updateStatus,
  };
}
