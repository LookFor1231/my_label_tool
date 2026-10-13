# 更新交互与 GitHub 代理验收

日期：2026-10-13。范围：ROADMAP 开发中的三个更新/代理任务；实现提交 `31acdbc`、`a18c5a7`、`5935a1b`。整体审查基线为 `11e0285`，并包含本次补充提交的测试常量清理。

## 验证结果

| 检查 | 结果 |
| --- | --- |
| `npm run typecheck`、`npm run lint` | 通过 |
| `npm run test:coverage -- --maxWorkers=4` | 115 个文件、727 项测试通过；行 96.12%、语句 95.79%、分支 91.47%、函数 97.78% |
| `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` | 通过 |
| `cargo test --manifest-path src-tauri/Cargo.toml` | 301 项单元测试及 11 项集成测试通过；原有 15 项显式 opt-in 测试未运行 |
| `npm run build` | 通过；保留现有大 chunk 提示 |
| `cargo build --manifest-path src-tauri/Cargo.toml --bin my_label_tool` | Windows MSVC 开发构建通过 |
| `git diff --check` | 通过 |

Rust 回归设置 `TEXT_READ_TEST_PYTHON` 指向本机 Python 3.12.2，以运行原有隔离测试。真实模型、真实 Agent 等 opt-in 测试不属于本次下载路由改动的验收范围。

首次全量前端覆盖率遇到既有脚本 UI 示例枚举超时，该文件独立运行的 25 项测试通过；将本次本机运行的 worker 数设为 4 后全量通过，未修改 CI、测试超时或覆盖率阈值。Rust 首轮回归在同时编译时遇到原有 30ms 请求头取消测试超时，停止并行编译后按原命令重新跑完整套件通过，未跳过测试或放宽超时。

严格 all-targets lint 检出既有预打标测试中的四处 `identity_op`，已去掉乘 1、加 0；断言、测试数据及生产推理逻辑不变。Tauri 模拟应用测试需要 Common Controls v6，构建脚本为测试宿主嵌入依赖；普通二进制仍使用 Tauri 的资源清单，避免重复 MANIFEST 资源。

## 需求与场景

- 更新 hook 与菜单入口测试覆盖：自动/手动检查、新版弹窗、稍后及重开、缓存替换、检查失败、下载失败、取消、重复操作拦截和卸载资源清理。重新打开缓存弹窗不调用检查接口。
- 代理设置测试覆盖：空值、路径前缀、首尾空格、末尾斜杠、非法 URL、保存与清空、读取失败重试、保存失败保留草稿和未保存关闭确认。Rust 测试经真实临时文件保存后重新读取，配置不进入项目数据。
- 回环 HTTP 服务断言代理请求路径；真实 Tauri 更新器通过代理获取清单，再用另一个代理下载固定签名样本；原始缓存可在清空代理后恢复原 URL。篡改样本、跨源重定向和关闭的代理均失败，不回退直连。
- Runtime 路由测试验证下载字节、进度和 SHA-256 拒绝篡改；模型路由测试验证 ONNX 样本解析和落盘。非 GitHub 模型源在配置不可达代理时仍直接下载成功。既有取消、超时、无效模型测试通过。
- 更新器前端测试验证每次尝试重新准备下载资源、签名/安装失败不重启、取消不安装，释放当次资源但保留缓存。安装和重启调用在前端测试中使用桩，不运行测试样本。
- 使用实际更新弹窗组件做浏览器交互检查：1280×720 视口下，长日志区域可视高度 414px、内容高度 1020px，滚至底部时按钮仍可见；「稍后」、重新打开、Esc 和焦点归还正常。预览版本数据仅用于本地验证，未进入产品。

验证边界：网络测试使用本地回环代理和签名/模型样本，没有实际安装新版、替换本机 Runtime，也未在外部代理上下载真实发布包。本次没有打包发布或推送。

## 整体审查结果

依据项目 `plugin-review` 技能进行只读审查，并核对需求、生命周期与回归结果。结论：通过（阻断 0 / 严重 0 / 一般 0 / 建议 0）。以下行号均在最终源码中复核。

| 维度 | 条目与结果 | 证据 | 严重度 |
| --- | --- | --- | --- |
| 契约与 Schema | 通过：新增类型为宿主专用；前后端字段对应，既有标注、ProjectConfig、插件及预打标契约无变更 | `src/types/app-update.ts:1`、`src/types/github-proxy.ts:2`、`src-tauri/src/app_update.rs:10`、`src-tauri/src/github_proxy.rs:15`；核心契约相对基线无 diff | — |
| ID 与版本分层 | 通过：不修改插件 ID、协议版本、宿主 API 或能力版本 | `src-tauri/src/plugins/protocol.rs:5`；插件目录相对基线无 diff | — |
| 能力声明 | 通过：没有新增插件能力、握手字段或隐式网络权限；仅登记宿主命令 | `src-tauri/src/commands/app_update.rs:4`、`src-tauri/src/commands/github_proxy.rs:4` | — |
| 向后兼容 | 通过：设置文件不存在时默认空代理；项目结构与既有下载结果类型不变 | `src-tauri/src/github_proxy.rs:71`；`src/types/prelabel.ts`、`src/lib/importers.ts` 相对基线无 diff | — |
| 权限与隔离 | 通过：配置读取经宿主文本适配器；命令不进入插件、Lua 或 MCP HTTP，签名与完整性验证保留 | `src-tauri/src/github_proxy.rs:76`、`src-tauri/src/mcp/mod.rs:27`、`src-tauri/src/app_update/tests.rs:39`、`src-tauri/src/media/prelabel/runtime_download_gateway_tests.rs:12` | — |
| 目录与工程约定 | 通过：命令只转发，调用封装进 tauri-api，文案位于 i18n；代理与更新逻辑在宿主模块 | `src/lib/tauri-api.ts:5`、`src-tauri/src/commands/app_update.rs:4`、`src/components/AppUpdateDialog.tsx:2`、`src/components/settings/GitHubProxySettings.tsx:3` | — |
| 测试 | 通过：新增代理/签名/交互回归通过，完整套件包含原有插件协议和隔离测试，无新增插件协议行为 | `src-tauri/src/app_update/tests.rs:80`、`src-tauri/src/github_proxy/routing.rs:101`、`src-tauri/src/media/prelabel/model_download.rs:349`；上表完整回归结果 | — |

约束引用：契约、版本、能力与兼容性对应 AGENTS.md §10「契约先行」「边界影响评估」「版本分层」「能力声明优先」「向后兼容优先」及 ADR 0003、0004、0006；权限与隔离对应 §10「权限最小化」「故障隔离」及 ADR 0005；目录和验证对应 §6、§7、§10「目录归属」。规范缺陷：未发现。
