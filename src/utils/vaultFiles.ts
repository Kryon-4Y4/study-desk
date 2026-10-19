import { App, Notice, TFile } from "obsidian";
import { VIEW_TYPE_HTML } from "../view/HtmlFileView";

/** 按扩展名分派打开 vault 内文件：html 在新标签页内置预览，其余用 Obsidian 查看器 */
export function openVaultFile(app: App, path: string): void {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "html" || ext === "htm") {
    // 在 Obsidian 主工作区新开一个标签页承载 iframe
    app.workspace.getLeaf(true).setViewState({
      type: VIEW_TYPE_HTML,
      active: true,
      state: { path },
    });
    return;
  }
  const file = app.vault.getAbstractFileByPath(path);
  if (file instanceof TFile) {
    app.workspace.getLeaf(true).openFile(file);
  } else {
    new Notice("该文件类型暂不支持在 Obsidian 内打开");
  }
}

/** 确保目录存在（末尾可带 / 或不带） */
export async function ensureDir(app: App, dir: string): Promise<void> {
  const adapter = app.vault.adapter;
  const norm = dir.endsWith("/") ? dir : dir + "/";
  if (!(await adapter.exists(norm))) {
    await adapter.mkdir(norm);
  }
}

/** 目标目录内若重名则追加 (n) 后缀 */
export async function uniqueName(
  app: App,
  dir: string,
  name: string
): Promise<string> {
  const adapter = app.vault.adapter;
  const norm = dir.endsWith("/") ? dir : dir + "/";
  if (!(await adapter.exists(norm + name))) return name;
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let i = 1;
  while (await adapter.exists(`${norm}${base} (${i})${ext}`)) i++;
  return `${base} (${i})${ext}`;
}

/** 判断路径片段是否为隐藏项（.obsidian/.trash/.DS_Store 等） */
export function isHidden(name: string): boolean {
  return name.startsWith(".");
}
