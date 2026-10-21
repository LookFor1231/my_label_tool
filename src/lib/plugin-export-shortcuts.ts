import type { ExportData } from "../types/export";

/** v1 plugins accept single keys only. Omit host-only combinations on a copy. */
export function projectPluginExportV1(data: ExportData): ExportData {
  return {
    ...data,
    labels: data.labels.map(({ shortcut, ...label }) => ({
      ...label,
      ...(shortcut && /^[a-z0-9]$/.test(shortcut) ? { shortcut } : {}),
    })),
  };
}
