import { tryBeginOperation } from "../store/useOperations";
import { OPERATION_ZH_CN as operationText } from "../i18n/operations.zh-CN";
import { UPDATE_ZH_CN as text } from "../i18n/update.zh-CN";
import { useEffect, useState } from "react";
import { checkAppUpdate, installAppUpdate, type AppUpdateStatus } from "../lib/updater";
import type { Update } from "@tauri-apps/plugin-updater";

export function useAppUpdate() {
  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null);
  const [updateStatus, setUpdateStatus] = useState<AppUpdateStatus>("idle");
  const [updateMessage, setUpdateMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkForUpdates(true);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, []);

  async function checkForUpdates(silent = false) {
    if (updateStatus === "checking" || updateStatus === "downloading") {
      return;
    }

    setUpdateStatus("checking");
    if (!silent) {
      setUpdateMessage(text.checking);
    }

    try {
      const update = await checkAppUpdate();
      setPendingUpdate(update);

      if (!update) {
        setUpdateStatus(silent ? "idle" : "not-available");
        setUpdateMessage(silent ? "" : text.latest);
        return;
      }

      setUpdateStatus("available");
      setUpdateMessage(
        text.available(update.version, update.currentVersion) +
          (update.body?.trim() ? `\n\n${text.releaseNotes}\n${update.body}` : ""),
      );
    } catch (caughtError: unknown) {
      setPendingUpdate(null);
      setUpdateStatus(silent ? "idle" : "error");
      setUpdateMessage(silent ? "" : text.checkFailed(caughtError));
    }
  }

  async function installUpdate() {
    if (!pendingUpdate || updateStatus === "downloading") {
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
        setPendingUpdate(null);
        setUpdateStatus("idle");
        return;
      }
      operation.complete(text.installed);
      setUpdateStatus("installed");
    } catch (caughtError: unknown) {
      const message = text.installFailed(caughtError);
      operation.fail(message);
      setUpdateStatus("error");
    }
  }

  return {
    checkForUpdates,
    installUpdate,
    setUpdateMessage,
    updateMessage,
    updateStatus,
  };
}
