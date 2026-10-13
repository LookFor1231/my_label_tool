const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const UPDATE_ZH_CN = {
  title: "自动更新",
  found: "发现更新",
  failed: "更新失败",
  dismiss: "关闭更新提示",
  install: "立即更新",
  later: "稍后",
  checking: "正在检查更新...",
  latest: "已是最新版本。",
  releaseNotes: "发布说明：",
  available: (version: string, currentVersion: string) =>
    `发现新版本 ${version}，当前版本 ${currentVersion}。`,
  checkFailed: (error: unknown) => `检查更新失败：${reason(error)}`,
  installFailed: (error: unknown) => `安装更新失败：${reason(error)}`,
  downloading: (version: string, percent: number | null) =>
    `正在下载 ${version}...${percent === null ? "" : ` 已下载 ${percent}%`}`,
  cancelling: "正在取消更新安装，等待当前下载传输结束...",
  installing: (version: string) => `正在安装 ${version}...`,
  installed: "更新已安装，正在重启...",
};
