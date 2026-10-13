import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { AppUpdateNotice } from "../components/AppUpdateNotice";
import { OPERATION_ZH_CN as text } from "../i18n/operations.zh-CN";
import { useOperations } from "../store/useOperations";
import { useAppUpdate } from "./useAppUpdate";

const api = vi.hoisted(() => ({ checkAppUpdate: vi.fn(), installAppUpdate: vi.fn() }));
vi.mock("../lib/updater", () => api);

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  useOperations.setState({ operations: [] });
});

it("reopens cached updates without checking, retains them on failure/cancellation and refreshes newer versions", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers();
  const first = {
    version: "2.0.0",
    currentVersion: "1.0.0",
    close: vi.fn().mockResolvedValue(undefined),
  };
  api.checkAppUpdate.mockResolvedValue(first);
  let update!: ReturnType<typeof useAppUpdate>;
  function Harness() {
    update = useAppUpdate();
    return <AppUpdateNotice {...update} />;
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    act(() => root.render(<Harness />));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    act(() => update.openUpdateDialog());
    expect(update.isUpdateOpen).toBe(true);
    expect(api.checkAppUpdate).toHaveBeenCalledOnce();
    api.checkAppUpdate.mockRejectedValueOnce(new Error("offline"));
    await act(async () => update.checkForUpdates());
    expect(update.pendingUpdate).toBe(first);
    expect(update.updateMessage).toContain("offline");
    api.installAppUpdate.mockResolvedValueOnce(false);
    await act(async () => update.installUpdate());
    expect(update.pendingUpdate).toBe(first);
    expect(update.updateStatus).toBe("available");
    const newer = { ...first, version: "3.0.0", close: vi.fn().mockResolvedValue(undefined) };
    api.checkAppUpdate.mockResolvedValueOnce(newer);
    await act(async () => update.checkForUpdates());
    expect(update.pendingUpdate?.version).toBe("3.0.0");
    expect(first.close).toHaveBeenCalledOnce();
    api.checkAppUpdate.mockResolvedValueOnce(null);
    await act(async () => update.checkForUpdates());
    expect(update.pendingUpdate).toBeNull();
    expect(update.isUpdateOpen).toBe(false);
    expect(newer.close).toHaveBeenCalledOnce();
  } finally {
    act(() => root.unmount());
    host.remove();
  }
});

it("blocks overlapping checks and installations and skips the startup check after a manual check", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers();
  let finish!: (value: null) => void;
  api.checkAppUpdate.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  let update!: ReturnType<typeof useAppUpdate>;
  function Harness() {
    update = useAppUpdate();
    return null;
  }
  const root = createRoot(document.createElement("div"));
  try {
    act(() => root.render(<Harness />));
    let checking!: Promise<void>;
    act(() => {
      checking = update.checkForUpdates();
      void update.checkForUpdates();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(api.checkAppUpdate).toHaveBeenCalledOnce();
    await act(async () => {
      finish(null);
      await checking;
    });
    expect(update.updateStatus).toBe("not-available");
  } finally {
    act(() => root.unmount());
  }
});

it("reports an installation failure in exactly one operation card", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers();
  useOperations.setState({ operations: [] });
  api.checkAppUpdate.mockResolvedValue({
    version: "2.0.0",
    currentVersion: "1.0.0",
    close: vi.fn().mockResolvedValue(undefined),
  });
  api.installAppUpdate.mockRejectedValue(new Error("disk full"));
  let update!: ReturnType<typeof useAppUpdate>;
  function Harness() {
    update = useAppUpdate();
    return <AppUpdateNotice {...update} />;
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    act(() => root.render(<Harness />));
    await act(async () => update.checkForUpdates());
    await act(async () => update.installUpdate());
    expect(api.installAppUpdate).toHaveBeenCalledOnce();
    expect(update.updateStatus).toBe("error");
    const failures = useOperations.getState().operations.filter((op) => op.status === "failed");
    expect(failures).toHaveLength(1);
    expect(failures[0].label).toBe(text.update);
    expect(failures[0].message).toContain("disk full");
    expect(host.querySelectorAll('[role="alert"]')).toHaveLength(1);
    expect(host.textContent).toContain("disk full");
    expect(host.textContent?.match(/disk full/g)).toHaveLength(1);
  } finally {
    act(() => root.unmount());
    host.remove();
  }
});

it("preserves the full release notes and renders only one download card", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers();
  const body = `### 新功能\n\n- 第一项\n- ${"详细说明".repeat(100)}\n\n最后一项`;
  api.checkAppUpdate.mockResolvedValue({
    version: "2.0.0",
    currentVersion: "1.0.0",
    close: vi.fn().mockResolvedValue(undefined),
    body,
  });
  let finish!: (installed: boolean) => void;
  api.installAppUpdate.mockImplementation((_update, progress) => {
    progress({ downloaded: 12, total: 100, percent: 12 });
    return new Promise<boolean>((resolve) => {
      finish = resolve;
    });
  });
  let update!: ReturnType<typeof useAppUpdate>;
  function Harness() {
    update = useAppUpdate();
    return <AppUpdateNotice {...update} />;
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    act(() => root.render(<Harness />));
    await act(async () => update.checkForUpdates());
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("最后一项");
    expect(document.querySelector('[role="dialog"] h3')?.textContent).toBe("新功能");
    let installing!: Promise<void>;
    await act(async () => {
      installing = update.installUpdate();
    });
    const region = host.querySelector('[role="region"]')!;
    expect(region.children).toHaveLength(1);
    expect(host.querySelectorAll("progress")).toHaveLength(1);
    expect(host.querySelector("progress")?.value).toBe(12);
    await act(async () => host.querySelector<HTMLButtonElement>("button")!.click());
    expect(useOperations.getState().operations[0].cancelRequested).toBe(true);
    await act(async () => {
      finish(false);
      await installing;
    });
    expect(region.children).toHaveLength(1);
    expect(host.textContent?.match(/已取消更新安装/g)).toHaveLength(1);
  } finally {
    act(() => root.unmount());
    host.remove();
  }
});

it("keeps installation and restart feedback in the operation card and removes cancellation", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers();
  api.checkAppUpdate.mockResolvedValue({
    version: "2.0.0",
    currentVersion: "1.0.0",
    close: vi.fn().mockResolvedValue(undefined),
  });
  let finish!: (installed: boolean) => void;
  api.installAppUpdate.mockImplementation((_update, _progress, _cancelled, onInstalling) => {
    onInstalling();
    return new Promise<boolean>((resolve) => {
      finish = resolve;
    });
  });
  let update!: ReturnType<typeof useAppUpdate>;
  function Harness() {
    update = useAppUpdate();
    return <AppUpdateNotice {...update} />;
  }
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    act(() => root.render(<Harness />));
    await act(async () => update.checkForUpdates());
    let installing!: Promise<void>;
    await act(async () => {
      installing = update.installUpdate();
    });
    expect(host.querySelector('[role="region"]')?.children).toHaveLength(1);
    expect(host.textContent).toContain("正在安装 2.0.0");
    expect(host.textContent).not.toContain(text.updateCancelHint);
    expect(host.querySelector("button")).toBeNull();
    await act(async () => {
      finish(true);
      await installing;
    });
    expect(update.updateStatus).toBe("installed");
    expect(host.querySelector('[role="region"]')?.children).toHaveLength(1);
    expect(host.textContent).toContain("更新已安装，正在重启");
    expect(host.querySelector("progress")).toBeNull();
  } finally {
    act(() => root.unmount());
  }
});
