import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { checkAppUpdate, installAppUpdate } from "./updater";
import { Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
const api = vi.hoisted(() => ({
  checkAppUpdateMetadata: vi.fn(),
  prepareAppUpdateDownload: vi.fn(),
}));
vi.mock("./tauri-api", () => api);
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: vi.fn() }));
const metadata = { rid: 7, version: "2.0.0", currentVersion: "1.0.0", body: null, rawJson: {} };
const cached = () => new Update({ ...metadata, body: undefined });

beforeEach(() => {
  vi.clearAllMocks();
  api.prepareAppUpdateDownload.mockResolvedValue({ ...metadata, rid: 8 });
  vi.spyOn(Update.prototype, "close").mockResolvedValue();
  vi.spyOn(Update.prototype, "install").mockResolvedValue();
  vi.spyOn(Update.prototype, "download").mockImplementation(async (progress) => {
    progress?.({ event: "Started", data: { contentLength: 20 } });
    progress?.({ event: "Progress", data: { chunkLength: 10 } });
  });
});
afterEach(() => vi.restoreAllMocks());

it("constructs a cached update from the host metadata and handles no update", async () => {
  api.checkAppUpdateMetadata
    .mockResolvedValueOnce(metadata)
    .mockResolvedValueOnce({ ...metadata, body: "### 更新说明" })
    .mockResolvedValueOnce(null);
  expect(await checkAppUpdate()).toMatchObject({ rid: 7, version: "2.0.0", body: undefined });
  expect(await checkAppUpdate()).toMatchObject({ body: "### 更新说明" });
  expect(await checkAppUpdate()).toBeNull();
});
it("keeps the cached handle and closes only the attempt when cancelled during transfer", async () => {
  let cancelled = false;
  const progress = vi.fn(() => {
    cancelled = true;
  });
  expect(await installAppUpdate(cached(), progress, () => cancelled)).toBe(false);
  expect(progress).toHaveBeenLastCalledWith({ downloaded: 10, total: 20, percent: 50 });
  expect(Update.prototype.install).not.toHaveBeenCalled();
  expect(relaunch).not.toHaveBeenCalled();
  expect(vi.mocked(Update.prototype.close).mock.instances[0]).toMatchObject({ rid: 8 });
});
it("disables cancellation before installation and relaunches after installing", async () => {
  const order: string[] = [];
  vi.mocked(Update.prototype.install).mockImplementation(async () => {
    order.push("install");
  });
  expect(
    await installAppUpdate(
      cached(),
      vi.fn(),
      () => false,
      () => {
        order.push("uncancellable");
      },
    ),
  ).toBe(true);
  expect(order).toEqual(["uncancellable", "install"]);
  expect(relaunch).toHaveBeenCalledOnce();
  expect(Update.prototype.close).toHaveBeenCalledOnce();
});
it("retries from the same cached version with a freshly prepared route and releases failed attempts", async () => {
  const update = cached();
  vi.mocked(Update.prototype.download).mockRejectedValueOnce(new Error("offline"));
  await expect(installAppUpdate(update, vi.fn())).rejects.toThrow("offline");
  expect(relaunch).not.toHaveBeenCalled();
  api.prepareAppUpdateDownload.mockResolvedValueOnce({ ...metadata, rid: 9 });
  expect(await installAppUpdate(update, vi.fn())).toBe(true);
  expect(api.prepareAppUpdateDownload.mock.calls).toEqual([[7], [7]]);
  expect(
    vi.mocked(Update.prototype.close).mock.instances.map((value) => (value as Update).rid),
  ).toEqual([8, 9]);
});
it("does not download when cancelled during preparation", async () => {
  expect(await installAppUpdate(cached(), vi.fn(), () => true)).toBe(false);
  expect(Update.prototype.download).not.toHaveBeenCalled();
  expect(Update.prototype.close).toHaveBeenCalledOnce();
});
it("reports signature or installation errors without restarting", async () => {
  vi.mocked(Update.prototype.download).mockRejectedValueOnce(new Error("signature mismatch"));
  await expect(installAppUpdate(cached(), vi.fn())).rejects.toThrow("signature mismatch");
  expect(Update.prototype.install).not.toHaveBeenCalled();
  vi.mocked(Update.prototype.install).mockRejectedValueOnce(new Error("disk full"));
  await expect(installAppUpdate(cached(), vi.fn())).rejects.toThrow("disk full");
  expect(relaunch).not.toHaveBeenCalled();
  expect(Update.prototype.close).toHaveBeenCalledTimes(2);
});
