import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { ReleaseNotes } from "./ReleaseNotes";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it("formats headings, both list kinds, emphasis and code without losing trailing notes", () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    act(() =>
      root.render(
        <ReleaseNotes
          body={
            "## 新功能\r\n\r\n- **更新弹窗**\r\n- `GitHub` 代理\r\n\r\n### 使用方法\r\n1. 检查更新\r\n2. 稍后安装\r\n\r\n最后的说明"
          }
        />,
      ),
    );
    expect(Array.from(host.querySelectorAll("h3"), (node) => node.textContent)).toEqual([
      "新功能",
      "使用方法",
    ]);
    expect(host.querySelectorAll("ul > li")).toHaveLength(2);
    expect(host.querySelectorAll("ol > li")).toHaveLength(2);
    expect(host.querySelector("strong")?.textContent).toBe("更新弹窗");
    expect(host.querySelector("code")?.textContent).toBe("GitHub");
    expect(host.querySelector("p")?.textContent).toBe("最后的说明");
  } finally {
    act(() => root.unmount());
  }
});

it("keeps links, HTML and images inert while preserving their source text", () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  const body =
    '[链接](https://example.com)\n![图片](https://example.com/image.png)\n<img src=x onerror="alert(1)">';
  try {
    act(() => root.render(<ReleaseNotes body={body} />));
    expect(host.querySelector("a, img, script")).toBeNull();
    for (const line of body.split("\n")) expect(host.textContent).toContain(line);
  } finally {
    act(() => root.unmount());
  }
});
