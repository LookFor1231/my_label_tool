import { useEffect, useRef, useSyncExternalStore } from "react";
import { McpController, type McpContext } from "../lib/mcp-controller";
import { useMcpConnection } from "./useMcpConnection";
import { mcpSetAuthority } from "../lib/tauri-api";
import { useOverlayStore } from "../store/useOverlayStore";

let authorityEpoch = 0;

export function useMcpWorkspace(context: McpContext) {
  const contextRef = useRef(context);
  contextRef.current = context;
  const controllerRef = useRef<McpController>();
  if (!controllerRef.current)
    controllerRef.current = new McpController(
      () => contextRef.current,
      (state) => {
        authorityEpoch = Math.max(authorityEpoch + 1, Date.now() * 1000);
        return mcpSetAuthority({
          epoch: authorityEpoch,
          sessionId: state.mode === "mcp" ? state.sessionId : null,
          leaseId: state.mode === "mcp" ? state.leaseId : null,
          expiresAt: state.expiresAt,
        });
      },
    );
  const controller = controllerRef.current;
  const control = useSyncExternalStore(controller.subscribe, controller.snapshot);
  const connection = useMcpConnection(
    controller.handle,
    (status) => controller.observe(status),
    () => controller.control.revoke(),
  );
  const gateRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tick = setInterval(() => controller.control.tick(), 200);
    function block(event: KeyboardEvent) {
      // Keep the sidebar MCP controls keyboard-accessible while rejecting application shortcuts.
      if (
        controller.control.state.mode === "mcp" &&
        useOverlayStore.getState().depth() === 0 &&
        !(event.target instanceof Element && event.target.closest("[data-mcp-control]"))
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }
    window.addEventListener("keydown", block, true);
    return () => {
      clearInterval(tick);
      window.removeEventListener("keydown", block, true);
      controller.dispose();
    };
  }, [controller]);
  useEffect(() => {
    const root = gateRef.current;
    if (!root || control.mode !== "mcp") return;
    const disabled = new Map<HTMLElement, boolean>();
    function restore() {
      disabled.forEach((inert, element) => {
        element.inert = inert;
      });
      disabled.clear();
    }
    function disable(element: HTMLElement) {
      if (element.matches("[data-mcp-control]")) return;
      if (element.querySelector("[data-mcp-control]")) {
        Array.from(element.children).forEach((child) => {
          if (child instanceof HTMLElement) disable(child);
        });
      } else {
        disabled.set(element, element.inert);
        element.inert = true;
      }
    }
    function refresh() {
      restore();
      if (root) disable(root);
    }
    refresh();
    // Preserve the MCP entry while also gating UI mounted during remote control.
    const observer = new MutationObserver(refresh);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      restore();
    };
  }, [control.mode]);
  return { ...connection, controller, control, gateRef };
}
