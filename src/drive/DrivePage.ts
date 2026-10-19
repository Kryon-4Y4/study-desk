import { Notice, setIcon, Modal, App } from "obsidian";
import type StudyDeskPlugin from "../../main";
import { PageComponent } from "../view/PageComponent";
import {
  openVaultFile,
  uniqueName,
  isHidden,
} from "../utils/vaultFiles";

interface Entry {
  name: string;
  path: string;
  isFolder: boolean;
  size?: number;
  mtime?: number;
}

export class DrivePage extends PageComponent {
  private currentDir = "/";

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("study-desk-page");

    container.createEl("h2", { text: "关联网盘" });
    container.createEl("div", {
      cls: "sd-subtitle",
      text: "本地文件仓库 · 管理 vault 内的学习素材（PDF / 音视频 / 乐谱等）",
    });

    // 工具栏
    const toolbar = container.createDiv({ cls: "sd-toolbar" });
    const btnUp = toolbar.createEl("button", { cls: "mod-cta", text: "上传文件" });
    btnUp.addEventListener("click", () => this.uploadFiles());
    const btnDir = toolbar.createEl("button", { text: "新建文件夹" });
    btnDir.addEventListener("click", () => this.newFolder());
    const btnRoot = toolbar.createEl("button", { text: "返回根目录" });
    btnRoot.addEventListener("click", () => {
      this.currentDir = "/";
      this.render(this.container);
    });

    // 面包屑
    const crumb = container.createDiv({ cls: "sd-breadcrumb" });
    this.renderCrumb(crumb);

    // 文件列表
    const list = container.createDiv({ cls: "sd-drive-list" });
    this.renderList(list);
  }

  private renderCrumb(crumb: HTMLElement): void {
    crumb.empty();
    const root = crumb.createSpan({ cls: "sd-crumb", text: "根目录" });
    root.addEventListener("click", () => {
      this.currentDir = "/";
      this.render(this.container);
    });

    let acc = "";
    for (const part of this.currentDir.split("/").filter(Boolean)) {
      acc += "/" + part;
      crumb.createSpan({ cls: "sd-crumb-sep", text: " / " });
      const s = crumb.createSpan({ cls: "sd-crumb", text: part });
      s.addEventListener("click", () => {
        this.currentDir = acc;
        this.render(this.container);
      });
    }
  }

  private async renderList(list: HTMLElement): Promise<void> {
    list.empty();
    const adapter = this.plugin.app.vault.adapter;

    let folders: string[] = [];
    let files: string[] = [];
    try {
      const listing = await adapter.list(this.currentDir);
      folders = listing.folders;
      files = listing.files;
    } catch {
      list.createEl("div", { cls: "sd-empty", text: "目录不存在或无法读取" });
      return;
    }

    const entries: Entry[] = [];
    for (const f of folders) {
      const name = f.split("/").pop() || f;
      if (isHidden(name)) continue;
      entries.push({ name, path: f, isFolder: true });
    }
    for (const f of files) {
      const name = f.split("/").pop() || f;
      if (isHidden(name)) continue;
      const ext = name.split(".").pop()?.toLowerCase() ?? "";
      // 网盘不展示 Obsidian 笔记，专注管理学习素材
      if (ext === "md" || ext === "markdown") continue;
      entries.push({ name, path: f, isFolder: false });
    }
    entries.sort((a, b) =>
      a.isFolder === b.isFolder
        ? a.name.localeCompare(b.name, "zh-Hans-CN")
        : a.isFolder
        ? -1
        : 1
    );

    // 并发获取文件大小 / 修改时间
    await Promise.all(
      entries.map(async (e) => {
        if (e.isFolder) return;
        try {
          const st = await adapter.stat(e.path);
          if (st) {
            e.size = st.size;
            e.mtime = st.mtime;
          }
        } catch {
          // 忽略 stat 失败
        }
      })
    );

    if (entries.length === 0) {
      list.createEl("div", { cls: "sd-empty", text: "空目录" });
      return;
    }

    for (const e of entries) {
      const row = list.createDiv({ cls: "sd-drive-row" });
      const icon = row.createSpan({ cls: "sd-drive-icon" });
      setIcon(icon, e.isFolder ? "folder" : this.fileIcon(e.name));
      row.createSpan({ cls: "sd-drive-name", text: e.name });
      const metaText = e.isFolder
        ? "文件夹"
        : this.fmtSize(e.size) + (e.mtime ? " · " + this.fmtDate(e.mtime) : "");
      row.createSpan({ cls: "sd-drive-meta", text: metaText });

      if (e.isFolder) {
        row.addEventListener("click", () => {
          this.currentDir = e.path;
          this.render(this.container);
        });
      } else {
        row.addEventListener("click", () => openVaultFile(this.plugin.app, e.path));
        const del = row.createSpan({
          cls: "sd-drive-del",
          text: "✕",
          attr: { title: "删除" },
        });
        del.addEventListener("click", (ev) => {
          ev.stopPropagation();
          this.deleteFile(e);
        });
      }
    }
  }

  // ===== 上传 =====
  private uploadFiles(): void {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener("change", async () => {
      const files = Array.from(input.files || []);
      input.remove();
      if (files.length === 0) return;
      await this.importFiles(files);
    });
    window.setTimeout(() => input.remove(), 120_000);
    input.click();
  }

  private async importFiles(files: File[]): Promise<void> {
    const adapter = this.plugin.app.vault.adapter;
    const dir = this.currentDir.endsWith("/")
      ? this.currentDir
      : this.currentDir + "/";
    let ok = 0;
    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const name = await uniqueName(this.plugin.app, dir, file.name);
        await adapter.writeBinary(dir + name, buffer);
        ok++;
      } catch {
        new Notice("上传失败：" + file.name);
      }
    }
    if (ok) new Notice(`已上传 ${ok} 个文件`);
    this.render(this.container);
  }

  // ===== 新建文件夹 =====
  private async newFolder(): Promise<void> {
    const name = window.prompt("文件夹名称");
    if (!name || !name.trim()) return;
    const dir = this.currentDir.endsWith("/")
      ? this.currentDir
      : this.currentDir + "/";
    const target = dir + name.trim();
    const adapter = this.plugin.app.vault.adapter;
    if (await adapter.exists(target)) {
      new Notice("已存在同名文件夹");
      return;
    }
    await adapter.mkdir(target);
    this.render(this.container);
  }

  // ===== 删除 =====
  private deleteFile(e: Entry): void {
    const file = this.plugin.app.vault.getAbstractFileByPath(e.path);
    if (file) {
      new ConfirmModal(
        this.plugin.app,
        `删除「${e.name}」？将移到回收站，可恢复。`,
        async () => {
          await this.plugin.app.vault.trash(file, true);
          this.render(this.container);
        }
      ).open();
    } else {
      new ConfirmModal(
        this.plugin.app,
        `「${e.name}」未被 Obsidian 索引，删除后将永久删除、无法恢复。确认？`,
        async () => {
          await this.plugin.app.vault.adapter.remove(e.path);
          this.render(this.container);
        }
      ).open();
    }
  }

  // ===== 工具 =====
  private fileIcon(name: string): string {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    if (["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"].includes(ext))
      return "image";
    if (["mp3", "wav", "flac", "m4a", "ogg", "aac"].includes(ext))
      return "audio-lines";
    if (["mp4", "webm", "mov", "m4v", "mkv"].includes(ext)) return "video";
    if (ext === "pdf") return "file-text";
    if (ext === "md" || ext === "markdown") return "file-text";
    if (ext === "html" || ext === "htm") return "globe";
    return "file";
  }

  private fmtSize(size?: number): string {
    if (size == null) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  private fmtDate(ts: number): string {
    const d = new Date(ts);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
}

// ===== 删除确认弹窗 =====
class ConfirmModal extends Modal {
  message: string;
  onConfirm: () => void;

  constructor(app: App, message: string, onConfirm: () => void) {
    super(app);
    this.message = message;
    this.onConfirm = onConfirm;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("p", { cls: "sd-confirm-text", text: this.message });
    const actions = contentEl.createDiv({ cls: "sd-actions" });
    const ok = actions.createEl("button", { cls: "mod-cta", text: "删除" });
    ok.addEventListener("click", () => {
      this.onConfirm();
      this.close();
    });
    actions
      .createEl("button", { text: "取消" })
      .addEventListener("click", () => this.close());
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
