import { Update, type DownloadEvent } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { checkAppUpdateMetadata, prepareAppUpdateDownload } from "./tauri-api";
import type { AppUpdateMetadata } from "../types/app-update";

export type AppUpdateStatus =
  "idle" | "checking" | "available" | "not-available" | "downloading" | "installed" | "error";

export interface AppUpdateProgress {
  downloaded: number;
  total: number | null;
  percent: number | null;
}

function updateFromMetadata(metadata: AppUpdateMetadata): Update {
  return new Update({ ...metadata, body: metadata.body ?? undefined });
}

export async function checkAppUpdate(): Promise<Update | null> {
  const metadata = await checkAppUpdateMetadata();
  return metadata ? updateFromMetadata(metadata) : null;
}

export async function installAppUpdate(
  update: Update,
  onProgress: (progress: AppUpdateProgress) => void,
  isCancelled: () => boolean = () => false,
  onInstalling: () => void = () => {},
): Promise<boolean> {
  let downloaded = 0;
  let total: number | null = null;
  let download: Update | undefined;

  try {
    const metadata = await prepareAppUpdateDownload(update.rid);
    download = updateFromMetadata(metadata);
    if (isCancelled()) return false;
    await download.download((event: DownloadEvent) => {
      if (event.event === "Started") {
        downloaded = 0;
        total = event.data.contentLength ?? null;
      } else if (event.event === "Progress") {
        downloaded += event.data.chunkLength;
      }

      onProgress({
        downloaded,
        total,
        percent: total && total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : null,
      });
    });
    if (isCancelled()) return false;
    onInstalling();
    await download.install();
    await relaunch();
    return true;
  } catch (error) {
    if (isCancelled()) return false;
    throw error;
  } finally {
    // The cached original remains reusable; release each attempt and its downloaded bytes.
    await download?.close().catch(() => {});
  }
}
