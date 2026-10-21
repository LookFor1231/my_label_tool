# 画布提示与标签快捷键验收记录

日期：2026-10-21。范围：ROADMAP 中本次指定的六项任务，不包含多普通键组合扩展。

## 当前结论

六项功能均已实现并分项本地提交，未推送。配置与插件兼容方案已验收；其余五项的代码审查与自动化回归通过，但完整桌面验收尚未完成，ROADMAP 顶层保留未完成状态，已实现的子项保留勾选。

桌面验收过程中用户按下物理 Esc 停止 Computer Use，因此停止后未再操作界面。不得把下面的自动化结果当作全部人工验收通过。

| 任务 | 实现与自动化检查 | 人工验收状态 |
| --- | --- | --- |
| 提示数量与空间 | 分别设置上限、本机持久化、当前标签保留、省略计数与截断 | 已检查 50 标签及 800×600 窗口；1366×768 与重启组合检查待补 |
| 逐项提示开关 | 全动作覆盖、默认隐藏撤销/重做/保存、独立恢复默认 | 总开关、逐项开关、数量和 Ctrl+Z 的完整组合手验待补 |
| 避让与透明 | 实际尺寸测量、上下避让、全层透明、延迟恢复、鼠标穿透 | 四角绘制/拖动、连续边界及减少动态效果手验待补 |
| 标签选择面板 | F2 可改绑、搜索/键盘/鼠标、懒加载样例、门禁与兼容性 | 已检查原生窗口搜索/鼠标选择；真实浏览器方向键+Enter 选择并恢复画布焦点；完整原生键盘链路待补 |
| 配置与插件方案 | 设计文档、版本边界和输入输出案例齐全 | 通过 |
| 标签组合键 | Ctrl/Alt/Shift 精确匹配、统一冲突检查、旧配置修复入口、插件投影 | A、Ctrl+A、Alt+1、Shift+1 录制和触发有自动化覆盖；原生应用保存重开和系统快捷键手验待补 |

## 验证命令与结果

- `npm run typecheck`：通过。
- `npm run lint`：通过。
- `npm run test:coverage -- --maxWorkers=4`：124 文件、760 测试通过；行覆盖率 96.20%，高于项目 90% 要求。
- `cargo clippy --manifest-path src-tauri/Cargo.toml`：通过。
- `cargo test --manifest-path src-tauri/Cargo.toml --lib`：301 通过，14 项按测试原有定义忽略，0 失败。
- `cargo test --manifest-path src-tauri/Cargo.toml --test plugin_conformance`：1 通过，0 失败。
- `cargo build --manifest-path src-tauri/Cargo.toml --bin my_label_tool`：通过，已启动原生开发程序验收。

Rust 测试用 `$env:TEXT_READ_TEST_PYTHON = (python -c 'import sys; print(sys.executable)').Trim()` 指定实际解释器。首次运行的 5 个失败源于 PATH 中的 Python shim；设置解释器后通过。插件集成测试首次编译遇到开发 exe 占用，关闭本次启动的开发程序后通过。没有放宽测试断言、超时或覆盖率门槛。

前端早期默认并发测试与 Rust 构建同时运行时出现超时，后续全量回归固定 4 个 worker。UI 组件按现有 coverage 配置不计入统计，因此另有 LabelPicker、LabelSettings 和键盘 hook 的交互测试；覆盖率数字不代表全部 UI 人工场景。

## 整体审查与修复

- 需求：逐条对照 ROADMAP；五项仍缺完整桌面手验，未将其标记为全部验收完成。
- 质量：发现窄画布下长组合键可能挤出提示区域，已给画布与选择面板的键位文本增加最大宽度和截断。
- 规范：提示默认值已归入 [defaults/canvas-hints.ts](../../src/lib/defaults/canvas-hints.ts)，文案集中在 i18n，API 调用仍经 tauri-api。
- 测试：保留 50 标签、非法数量、当前标签省略、ResizeObserver 重测、透明恢复定时器、搜索/取消/IME/忙碌、组合键精确匹配、冲突与项目/模板/插件往返的回归。
- 未修改标注坐标、撤销历史、导出数据内容或插件隔离机制。

## 插件正式审查

结论：插件边界审查通过，阻断 0 / 严重 0 / 一般 0 / 建议 0。规范缺陷：无。

| 维度 | 结果与证据 | 约束引用 |
| --- | --- | --- |
| 契约与 Schema | 通过。LabelConfig 仍是可选字符串；宿主 Schema 扩展，插件 Schema 保持 v1；[投影测试](../../src/lib/plugin-export-shortcuts.test.ts)用原 Schema 校验实际调用边界 | AGENTS §5、§10 |
| ID 与版本分层 | 通过。协议、宿主 API、业务能力与 manifest schemaVersion 不变，未改插件 ID 或插件版本 | AGENTS §10；[版本说明](../plugin-api-versioning.md) |
| 能力声明 | 通过。未新增插件能力或依赖版本号推断能力；既有握手保持原样 | AGENTS §10；ADR 0003 |
| 向后兼容 | 通过。[projectPluginExportV1](../../src/lib/plugin-export-shortcuts.ts:4)保留单键，仅在复制的导出标签中省略宿主组合键；[实际封装](../../src/lib/tauri-api.ts:666)统一应用；原项目不改写 | AGENTS §10；ADR 0004；[往返规则](../label-shortcuts.md) |
| 权限与隔离 | 通过。未增加命令、路径、权限或进程通道；Rust 现有 AppContainer 和权限测试通过 | AGENTS §10；ADR 0003、0005 |
| 目录与工程 | 通过。UI 不直接 invoke，新增逻辑分模块、文案集中；配置仍随宿主项目/模板，显示偏好仅保存在本机 | AGENTS §6、§10；ADR 0006 |
| 测试 | 通过。新增 v1 Schema/实际调用边界测试，既有 Rust 插件协议集成测试通过 | AGENTS §7、§10 |

## 继续验收清单

- 在 1366×768 和缩小窗口完成提示条数、重启持久化、逐项隐藏与 Ctrl+Z 仍有效的组合检查。
- 在原生窗口完成四角绘制与拖拽、缩放后框与图片对齐、图片切换后标注保存加载、边界透明恢复及减少动态效果检查。
- 完成原生窗口快捷键录制/保存/重开、输入法与长按、冲突修复、面板纯键盘选择以及确认改标签后撤销。
- 从原生应用实际导出文件，并使用对应格式标准解析器检查输出。

上述手验通过后，再原地勾选五项任务顶层条目。当前没有已知的未修复代码缺陷；剩余阻塞是人工验收未完成。
