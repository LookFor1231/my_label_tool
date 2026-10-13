export const GITHUB_PROXY_ZH_CN = {
  title: "GitHub 代理",
  url: "代理 URL",
  hint: "留空不使用 GitHub 代理。用于软件更新、ONNX Runtime 和 GitHub 模型下载。",
  example:
    "填写资源代理入口（例如 http://proxy.example:8080/github），将替换 https://github.com 前缀；不是 HTTP CONNECT 或 SOCKS 代理地址。",
  placeholder: "留空不使用代理",
  save: "保存代理设置",
  saving: "正在保存…",
  loading: "正在读取代理设置…",
  retry: "重新读取",
  saved: "代理设置已保存，后续请求立即生效。",
  discard: "GitHub 代理设置尚未保存，确定放弃修改并关闭吗？",
  failed: (error: unknown) =>
    `代理设置失败：${error instanceof Error ? error.message : String(error)}`,
};
