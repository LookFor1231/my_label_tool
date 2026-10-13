import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { McpPanel } from "./McpPanel";
import { useMcpWorkspace } from "../../hooks/useMcpWorkspace";
import { useOverlayStore } from "../../store/useOverlayStore";
import { useOperations } from "../../store/useOperations";
import { MCP_ZH_CN as text } from "../../i18n/mcp.zh-CN";
import type { McpStatus } from "../../types/mcp";

const api = vi.hoisted(() => ({
  mcpSetAuthority: vi.fn().mockResolvedValue(undefined),
  mcpConfigure: vi.fn().mockResolvedValue(undefined),
  mcpToken: vi.fn().mockResolvedValue("test-token"),
}));
vi.mock("../../lib/tauri-api", async (original) => ({
  ...(await original<typeof import("../../lib/tauri-api")>()),
  ...api,
}));
vi.mock("../../hooks/useMcpConnection", () => ({
  useMcpConnection: () => ({ status, error: "" }),
}));

let host: HTMLDivElement;
let root: Root;
let workspace: ReturnType<typeof useMcpWorkspace>;
let status: McpStatus;
let canGrant: boolean;
const labels: [] = [];
function Fixture() {
  workspace = useMcpWorkspace({ folderPath: "C:/project", labels, canGrant: () => canGrant });
  return (
    <div ref={workspace.gateRef}>
      <div>
        <aside>
          <div data-testid="sidebar-content">
            <button>project</button>
          </div>
          <McpPanel
            status={status}
            error=""
            controller={workspace.controller}
            state={workspace.control}
          />
        </aside>
        <div data-testid="canvas">
          <button>canvas</button>
        </div>
      </div>
    </div>
  );
}
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  useOverlayStore.setState({ stack: [] });
  useOperations.setState({ operations: [], mcpControlled: false });
  canGrant = true;
  status = {
    running: true,
    enabled: true,
    address: "127.0.0.1",
    port: 1421,
    generation: 1,
    error: null,
    audit: [],
    sessions: [{ id: "client", client: "Test client", version: "1", lastSeen: Date.now() }],
  };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<Fixture />));
  act(() => workspace.controller.observe(status));
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});
function opener() {
  return host.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')!;
}
async function click(label: string) {
  const button = Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent === label,
  );
  expect(button).toBeTruthy();
  await act(async () => button!.click());
}
async function open() {
  opener().focus();
  await act(async () => opener().click());
}
function isInert(element: HTMLElement) {
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    if (node.inert) return true;
  }
  return false;
}

it("keeps details collapsed and opens an accessible dialog with settings, Escape and focus return", async () => {
  expect(host.querySelector("aside")?.contains(opener())).toBe(true);
  expect(opener().textContent).toContain(text.statusRunning);
  expect(opener().textContent).toContain(text.sessionCount(1));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  await open();
  expect(useOverlayStore.getState().hasBlocking()).toBe(true);
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
    "http://127.0.0.1:1421/mcp",
  );
  await click(text.apply);
  expect(api.mcpConfigure).toHaveBeenCalledWith(true, "127.0.0.1", 1421, false);
  await click(text.token);
  expect(document.querySelector<HTMLInputElement>(`input[aria-label="${text.token}"]`)?.value).toBe(
    "test-token",
  );
  act(() =>
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    ),
  );
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(opener());
  expect(useOverlayStore.getState().depth()).toBe(0);
  await open();
  expect(document.querySelector(`input[aria-label="${text.token}"]`)).toBeNull();
});

it("approves from the dialog, gates annotation UI, and leaves sidebar reclaim available", async () => {
  act(() => workspace.controller.control.request("client", ["annotations"]));
  expect(opener().textContent).toContain(text.statusPending);
  await open();
  await click(text.approve);
  expect(workspace.control.mode).toBe("mcp");
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(opener().textContent).toContain(text.statusRemote);
  expect(isInert(opener())).toBe(false);
  for (const id of ["sidebar-content", "canvas"]) {
    expect(isInert(host.querySelector<HTMLElement>(`[data-testid="${id}"]`)!)).toBe(true);
  }
  const lateButton = document.createElement("button");
  await act(async () => workspace.gateRef.current!.append(lateButton));
  expect(isInert(lateButton)).toBe(true);
  await open();
  await click(text.close);
  await click(text.reclaim);
  expect(workspace.control.mode).toBe("human");
  expect(isInert(lateButton)).toBe(false);
  expect(isInert(host.querySelector<HTMLElement>('[data-testid="canvas"]')!)).toBe(false);
  lateButton.remove();
});

it("keeps a failed approval pending and presents its error in the reopened dialog", async () => {
  canGrant = false;
  act(() => workspace.controller.control.request("client", ["annotations"]));
  await open();
  await click(text.approve);
  expect(workspace.control.mode).toBe("pending");
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain(text.busy);
  expect(useOverlayStore.getState().depth()).toBe(1);
  await click(text.reject);
  expect(workspace.control.mode).toBe("human");
});

it("shows service errors compactly and exposes the full error only in the dialog", async () => {
  status = { ...status, running: false, error: "Port occupied" };
  await act(async () => root.render(<Fixture />));
  expect(opener().textContent).toContain(text.statusError);
  expect(host.textContent).not.toContain("Port occupied");
  await open();
  expect(document.querySelector('[role="alert"]')?.textContent).toBe("Port occupied");
});
