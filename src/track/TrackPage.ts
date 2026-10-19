import { Notice, setIcon } from "obsidian";
import type StudyDeskPlugin from "../../main";
import { Track } from "../types";
import { genId } from "../utils/id";
import { PageComponent } from "../view/PageComponent";
import { openVaultFile, ensureDir, uniqueName } from "../utils/vaultFiles";
import { FileBrowserModal } from "../drive/FileBrowserModal";

/** 上传文件保存目录（vault 内相对路径） */
const UPLOAD_DIR = "study-desk-assets/";

export class TrackPage extends PageComponent {
  selectedId: string | null = null;

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("study-desk-page");

    container.createEl("h2", { text: "曲式分析" });
    container.createEl("div", {
      cls: "sd-subtitle",
      text: "对每首曲目挂载笔记，或上传 PDF / HTML 分析文档",
    });

    const toolbar = container.createDiv({ cls: "sd-toolbar" });
    const btnAdd = toolbar.createEl("button", {
      cls: "mod-cta",
      text: "新建曲目",
    });
    btnAdd.addEventListener("click", () => this.addTrack());

    const grid = container.createDiv({ cls: "sd-wiki-grid" });
    const listPane = grid.createDiv({ cls: "sd-wiki-tree" });
    const editPane = grid.createDiv({ cls: "sd-wiki-edit" });

    this.renderList(listPane);
    this.renderEdit(editPane);
  }

  private getTracks(): Track[] {
    return [...this.plugin.data.tracks].sort((a, b) => a.createdAt - b.createdAt);
  }

  private renderList(pane: HTMLElement): void {
    pane.empty();
    const tracks = this.getTracks();

    if (tracks.length === 0) {
      pane.createEl("div", {
        cls: "sd-empty",
        text: "还没有曲目，点击「新建曲目」开始",
      });
      return;
    }

    for (const track of tracks) {
      const row = pane.createDiv({
        cls: "sd-tnode" + (track.id === this.selectedId ? " is-selected" : ""),
      });
      const icon = row.createSpan({ cls: "sd-ticon" });
      setIcon(icon, "music-2");
      row.createSpan({ cls: "sd-title", text: track.title });
      row.createSpan({
        cls: "sd-count",
        text: track.notePaths.length ? `${track.notePaths.length} 篇` : "",
      });

      row.addEventListener("click", () => {
        this.selectedId = track.id;
        this.renderList(this.container.querySelector(".sd-wiki-tree") as HTMLElement);
        this.renderEdit(this.container.querySelector(".sd-wiki-edit") as HTMLElement);
      });
    }
  }

  private renderEdit(pane: HTMLElement): void {
    pane.empty();
    const track = this.selectedId
      ? this.plugin.data.tracks.find((t) => t.id === this.selectedId)
      : undefined;

    if (!track) {
      pane.createEl("div", {
        cls: "sd-empty",
        text: "选中左侧曲目以查看 / 挂载笔记",
      });
      return;
    }

    pane.createEl("h3", { text: "曲目详情" });

    // 标题
    const titleWrap = pane.createDiv({ cls: "sd-field" });
    titleWrap.createEl("label", { text: "曲目名称" });
    const titleInput = titleWrap.createEl("input", {
      attr: { type: "text", value: track.title },
    });

    // 挂载 / 上传
    const notesWrap = pane.createDiv({ cls: "sd-field" });
    notesWrap.createEl("label", { text: "挂载文件 / 上传" });
    const notesList = notesWrap.createDiv({ cls: "sd-notes" });
    this.renderNotes(notesList, track);
    const btnRow = notesWrap.createDiv({ cls: "sd-btn-row" });
    const btnNote = btnRow.createEl("button", {
      cls: "sd-btn-add",
      text: "挂载文件",
    });
    btnNote.addEventListener("click", () => this.pickNote(track.id));
    const btnUpload = btnRow.createEl("button", {
      cls: "sd-btn-add",
      text: "上传 PDF / HTML",
    });
    btnUpload.addEventListener("click", () => this.uploadFile(track.id));

    // 操作按钮
    const actions = pane.createDiv({ cls: "sd-actions" });
    const btnSave = actions.createEl("button", {
      cls: "mod-cta",
      text: "保存",
    });
    btnSave.addEventListener("click", () => {
      const title = titleInput.value.trim() || track.title;
      this.plugin.data.tracks = this.plugin.data.tracks.map((t) =>
        t.id === track.id ? { ...t, title } : t
      );
      this.plugin.persist();
      this.renderList(this.container.querySelector(".sd-wiki-tree") as HTMLElement);
      new Notice("已保存");
    });

    const btnDelete = actions.createEl("button", {
      cls: "sd-btn-danger",
      text: "删除曲目",
    });
    btnDelete.addEventListener("click", () => this.deleteTrack(track.id));
  }

  private renderNotes(container: HTMLElement, track: Track): void {
    container.empty();
    if (track.notePaths.length === 0) {
      container.createEl("div", {
        cls: "sd-empty-sm",
        text: "暂无挂载文件",
      });
      return;
    }
    for (const p of track.notePaths) {
      const item = container.createDiv({ cls: "sd-note-item" });
      const link = item.createSpan({ cls: "sd-note-path", text: p });
      link.setAttribute("title", "点击打开");
      link.addEventListener("click", () => openVaultFile(this.plugin.app, p));
      const rm = item.createSpan({ cls: "sd-note-rm", text: "✕" });
      rm.addEventListener("click", () => {
        this.plugin.data.tracks = this.plugin.data.tracks.map((t) =>
          t.id === track.id
            ? { ...t, notePaths: t.notePaths.filter((x) => x !== p) }
            : t
        );
        this.plugin.persist();
        const updated = this.plugin.data.tracks.find((t) => t.id === track.id)!;
        this.renderNotes(container, updated);
        this.renderList(this.container.querySelector(".sd-wiki-tree") as HTMLElement);
      });
    }
  }

  private addTrack(): void {
    const track: Track = {
      id: genId(),
      title: "新曲目",
      notePaths: [],
      createdAt: Date.now(),
    };
    this.plugin.data.tracks.push(track);
    this.selectedId = track.id;
    this.plugin.persist();
    this.render(this.container);
  }

  private deleteTrack(id: string): void {
    this.plugin.data.tracks = this.plugin.data.tracks.filter((t) => t.id !== id);
    if (this.selectedId === id) this.selectedId = null;
    this.plugin.persist();
    this.render(this.container);
  }

  /** 从网盘（vault 文件浏览器）选择文件挂载 */
  private pickNote(trackId: string): void {
    new FileBrowserModal(
      this.plugin.app,
      (p) => {
        const track = this.plugin.data.tracks.find((t) => t.id === trackId);
        if (!track) return;
        if (!track.notePaths.includes(p)) {
          this.plugin.data.tracks = this.plugin.data.tracks.map((t) =>
            t.id === trackId
              ? { ...t, notePaths: [...t.notePaths, p] }
              : t
          );
          this.plugin.persist();
          this.render(this.container);
        }
      },
      UPLOAD_DIR
    ).open();
  }

  // ===== 上传 PDF / HTML =====
  private uploadFile(trackId: string): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.html,.htm";
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return;
      await this.importFile(trackId, file);
    });
    window.setTimeout(() => input.remove(), 60_000);
    input.click();
  }

  private async importFile(trackId: string, file: File): Promise<void> {
    try {
      const buffer = await file.arrayBuffer();
      await ensureDir(this.plugin.app, UPLOAD_DIR);
      const name = await uniqueName(this.plugin.app, UPLOAD_DIR, file.name);
      const targetPath = UPLOAD_DIR + name;
      await this.plugin.app.vault.createBinary(targetPath, buffer);
      this.plugin.data.tracks = this.plugin.data.tracks.map((t) =>
        t.id === trackId
          ? { ...t, notePaths: [...t.notePaths, targetPath] }
          : t
      );
      await this.plugin.persist();
      new Notice(`已上传：${name}`);
      this.render(this.container);
    } catch (e) {
      new Notice("上传失败：" + ((e as Error)?.message || String(e)));
    }
  }
}
