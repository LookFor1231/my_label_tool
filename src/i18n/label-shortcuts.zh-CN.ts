export const LABEL_SHORTCUT_TEXT = {
  recordHelp: "点击快捷键框后按键录制。先按 Ctrl、Alt 或 Shift，再按一个字母或数字；Backspace/Delete 清除。",
  invalid: "快捷键须为一个字母或数字，可加 Ctrl、Alt、Shift 修饰键。",
  clear: "清除快捷键",
  fixLabels: "修改标签快捷键",
  fixActions: "修改操作快捷键",
  conflictHelp: "以下绑定需修正，冲突键不会执行；标注数据仍可正常使用。",
  invalidExisting: (name: string, binding: string) => `标签「${name}」的快捷键「${binding}」无效，请清除或重新录制。`,
};
