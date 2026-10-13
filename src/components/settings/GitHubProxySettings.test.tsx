import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { GitHubProxySettings } from "./GitHubProxySettings";

const api = vi.hoisted(() => ({
  loadGitHubProxySettings: vi.fn(),
  saveGitHubProxySettings: vi.fn(),
}));
vi.mock("../../lib/tauri-api", () => api);
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => vi.clearAllMocks());

it("loads, saves normalized values, preserves invalid drafts on failure and clears the proxy", async () => {
  api.loadGitHubProxySettings.mockResolvedValue({ url: "" });
  api.saveGitHubProxySettings.mockResolvedValue({ url: "http://proxy.example/github" });
  const host = document.createElement("div");
  const root = createRoot(host);
  const dirty = vi.fn(),
    saving = vi.fn();
  const change = async (value: string) => {
    await act(async () => {
      const input = host.querySelector("input")!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  try {
    await act(async () =>
      root.render(<GitHubProxySettings onDirtyChange={dirty} onSavingChange={saving} />),
    );
    expect(host.querySelector("input")?.value).toBe("");
    expect(host.textContent).toContain("跳转到其他站点（含 CDN）的入口不受支持");
    expect(host.querySelector("button")?.disabled).toBe(true);
    await change(" http://proxy.example/github/ ");
    expect(dirty).toHaveBeenLastCalledWith(true);
    await act(async () => host.querySelector("button")!.click());
    expect(api.saveGitHubProxySettings).toHaveBeenCalledWith({
      url: " http://proxy.example/github/ ",
    });
    expect(host.querySelector("input")?.value).toBe("http://proxy.example/github");
    expect(dirty).toHaveBeenLastCalledWith(false);
    await change("invalid");
    api.saveGitHubProxySettings.mockRejectedValueOnce(new Error("invalid URL"));
    await act(async () => host.querySelector("button")!.click());
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("invalid URL");
    expect(host.querySelector("input")?.value).toBe("invalid");
    await change("");
    api.saveGitHubProxySettings.mockResolvedValueOnce({ url: "" });
    await act(async () => host.querySelector("button")!.click());
    expect(api.saveGitHubProxySettings).toHaveBeenLastCalledWith({ url: "" });
    expect(dirty).toHaveBeenLastCalledWith(false);
    expect(saving).toHaveBeenLastCalledWith(false);
  } finally {
    act(() => root.unmount());
  }
});

it("does not enable writes after a load failure and supports retry", async () => {
  api.loadGitHubProxySettings.mockRejectedValueOnce(new Error("read failed"));
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    await act(async () =>
      root.render(<GitHubProxySettings onDirtyChange={vi.fn()} onSavingChange={vi.fn()} />),
    );
    expect(host.querySelector("input")).toBeNull();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("read failed");
    api.loadGitHubProxySettings.mockResolvedValueOnce({ url: "https://proxy.example/github" });
    await act(async () => host.querySelector("button")!.click());
    expect(host.querySelector("input")?.value).toBe("https://proxy.example/github");
    expect(host.querySelector('[role="alert"]')).toBeNull();
  } finally {
    act(() => root.unmount());
  }
});
