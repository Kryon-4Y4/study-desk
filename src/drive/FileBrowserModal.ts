import { App, Modal, setIcon } from "obsidian";
import { isHidden } from "../utils/vaultFiles";

/**
 * 文件浏览选择弹窗：浏览 vault 目录，选中一个文件返回其路径。
 * 用 adapter.list 直接读文件系统，因此能看到未索引的文件（如 html）。
 */
export class FileBrowserModal extends Modal {
  onChoose: (path: string) => void;
  private currentDir = "/";
  private crumbEl!: HTMLElement;
  private listEl!: HTMLElement;

  constructor(app: App, onChoose: (path: string) => void, startDir?: string) {
    super(app);
    this.onChoose = onChoose;
    if (startDir) this.currentDir = startDir;
  }

  onOpen(): void {
    this.modalEl.addClass("sd-browser-modal");
    this.titleEl.setText("选择文件");
    const { contentEl } = this;
    contentEl.empty();

    this.crumbEl = contentEl.createDiv({ cls: "sd-breadcrumb" });
    this.listEl = contentEl.createDiv({ cls: "sd-browser-list" });
    this.renderCrumb();
    this.refresh();
  }

  private renderCrumb(): void {
    const crumb = this.crumbEl;
    crumb.empty();
    const root = crumb.createSpan({ cls: "sd-crumb", text: "根目录" });
    root.addEventListener("click", () => {
      this.currentDir = "/";
      this.renderCrumb();
      this.refresh();
    });

    let acc = "";
    for (const part of this.currentDir.split("/").filter(Boolean)) {
      acc += "/" + part;
      crumb.createSpan({ cls: "sd-crumb-sep", text: " / " });
      const s = crumb.createSpan({ cls: "sd-crumb", text: part });
      s.addEventListener("click", () => {
        this.currentDir = acc;
        this.renderCrumb();
        this.refresh();
      });
    }
  }

  private async refresh(): Promise<void> {
    const el = this.listEl;
    el.empty();

    let folders: string[] = [];
    let files: string[] = [];
    try {
      const listing = await this.app.vault.adapter.list(this.currentDir);
      folders = listing.folders;
      files = listing.files;
    } catch {
      el.createEl("div", { cls: "sd-empty", text: "目录无法读取" });
      return;
    }

    type Row = { name: string; path: string; isFolder: boolean };
    const rows: Row[] = [];
    for (const f of folders) {
      const name = f.split("/").pop() || f;
      if (isHidden(name)) continue;
      rows.push({ name, path: f, isFolder: true });
    }
    for (const f of files) {
      const name = f.split("/").pop() || f;
      if (isHidden(name)) continue;
      rows.push({ name, path: f, isFolder: false });
    }
    rows.sort((a, b) =>
      a.isFolder === b.isFolder
        ? a.name.localeCompare(b.name, "zh-Hans-CN")
        : a.isFolder
        ? -1
        : 1
    );

    if (rows.length === 0) {
      el.createEl("div", { cls: "sd-empty-sm", text: "空目录" });
      return;
    }

    for (const r of rows) {
      const row = el.createDiv({ cls: "sd-browser-row" });
      const icon = row.createSpan({ cls: "sd-ticon" });
      setIcon(icon, r.isFolder ? "folder" : "file");
      row.createSpan({ cls: "sd-title", text: r.name });
      row.addEventListener("click", () => {
        if (r.isFolder) {
          this.currentDir = r.path;
          this.renderCrumb();
          this.refresh();
        } else {
          this.onChoose(r.path);
          this.close();
        }
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
