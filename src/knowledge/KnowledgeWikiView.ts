import {
  Menu,
  Notice,
  FuzzySuggestModal,
  TFile,
  Modal,
  App,
  setIcon,
} from "obsidian";
import type StudyDeskPlugin from "../../main";
import { KnowledgeNode } from "../types";
import { PageComponent } from "../view/PageComponent";
import * as tree from "./tree";

export class WikiPage extends PageComponent {
  selectedId: string | null = null;
  private collapsed: Set<string> = new Set();

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("study-desk-page");

    container.createEl("h2", { text: "知识 Wiki" });
    container.createEl("div", {
      cls: "sd-subtitle",
      text: "配置知识结构树，节点关联 vault 内的笔记",
    });

    const toolbar = container.createDiv({ cls: "sd-toolbar" });
    const btnRoot = toolbar.createEl("button", {
      cls: "mod-cta",
      text: "新建知识点",
    });
    btnRoot.addEventListener("click", () => this.addRoot());

    const btnChild = toolbar.createEl("button", { text: "新建子节点" });
    btnChild.addEventListener("click", () => {
      if (!this.selectedId) {
        new Notice("请先在左侧选中一个节点");
        return;
      }
      this.addChildNode(this.selectedId);
    });

    const btnImport = toolbar.createEl("button", { text: "导入导图" });
    btnImport.addEventListener("click", () => this.importIndex());

    const grid = container.createDiv({ cls: "sd-wiki-grid" });
    const treePane = grid.createDiv({ cls: "sd-wiki-tree" });
    const editPane = grid.createDiv({ cls: "sd-wiki-edit" });

    this.renderTree(treePane);
    this.renderEdit(editPane);
  }

  private renderTree(pane: HTMLElement): void {
    pane.empty();
    const nodes = this.plugin.data.knowledgeTree;
    const roots = tree.getRootNodes(nodes);

    if (roots.length === 0) {
      pane.createEl("div", {
        cls: "sd-empty",
        text: "还没有知识点，点击「新建知识点」开始",
      });
      return;
    }

    const ul = pane.createEl("ul", { cls: "sd-tree" });
    this.renderLevel(ul, null);
  }

  private renderLevel(ul: HTMLElement, parentId: string | null): void {
    const nodes = this.plugin.data.knowledgeTree;
    const children = tree.getChildren(nodes, parentId);

    for (const node of children) {
      const hasChildren = tree.getChildren(nodes, node.id).length > 0;
      const li = ul.createEl("li");

      const row = li.createDiv({
        cls:
          "sd-tnode" + (node.id === this.selectedId ? " is-selected" : ""),
      });

      const tw = row.createSpan({ cls: "sd-tw" });
      if (hasChildren) {
        tw.textContent = this.collapsed.has(node.id) ? "▸" : "▾";
        tw.addEventListener("click", (e) => {
          e.stopPropagation();
          this.toggleCollapse(node.id);
          this.renderTree(this.container.querySelector(".sd-wiki-tree") as HTMLElement);
        });
      } else {
        tw.textContent = "";
      }

      const icon = row.createSpan({ cls: "sd-ticon" });
      setIcon(icon, hasChildren ? "folder" : "file-text");

      const title = row.createSpan({ cls: "sd-title", text: node.title });

      const count = row.createSpan({
        cls: "sd-count",
        text: String(this.countDescendants(node.id)),
      });

      row.addEventListener("click", () => {
        this.selectedId = node.id;
        this.renderTree(this.container.querySelector(".sd-wiki-tree") as HTMLElement);
        this.renderEdit(this.container.querySelector(".sd-wiki-edit") as HTMLElement);
      });

      row.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        this.showNodeMenu(e, node);
      });

      if (!this.collapsed.has(node.id) && hasChildren) {
        const childUl = li.createEl("ul", { cls: "sd-tree" });
        this.renderLevel(childUl, node.id);
      }
    }
  }

  private countDescendants(id: string): number {
    return tree.collectSubtreeIds(this.plugin.data.knowledgeTree, id).size;
  }

  private toggleCollapse(id: string): void {
    if (this.collapsed.has(id)) this.collapsed.delete(id);
    else this.collapsed.add(id);
  }

  private renderEdit(pane: HTMLElement): void {
    pane.empty();
    const node = this.selectedId
      ? tree.getNode(this.plugin.data.knowledgeTree, this.selectedId)
      : undefined;

    if (!node) {
      pane.createEl("div", {
        cls: "sd-empty",
        text: "选中左侧节点以查看/编辑详情",
      });
      return;
    }

    pane.createEl("h3", { text: "节点详情" });

    // 标题
    const titleWrap = pane.createDiv({ cls: "sd-field" });
    titleWrap.createEl("label", { text: "标题" });
    const titleInput = titleWrap.createEl("input", {
      attr: { type: "text", value: node.title },
    });

    // 父节点
    const parentWrap = pane.createDiv({ cls: "sd-field" });
    parentWrap.createEl("label", { text: "父节点" });
    const parentSelect = parentWrap.createEl("select");
    const rootOpt = parentSelect.createEl("option", {
      text: "（根节点）",
      value: "",
    });
    if (node.parentId === null) rootOpt.selected = true;
    for (const n of this.plugin.data.knowledgeTree) {
      if (n.id === node.id) continue; // 不能选自己
      const opt = parentSelect.createEl("option", {
        text: n.title,
        value: n.id,
      });
      if (n.id === node.parentId) opt.selected = true;
    }

    // 关联笔记
    const notesWrap = pane.createDiv({ cls: "sd-field" });
    notesWrap.createEl("label", { text: "关联笔记" });
    const notesList = notesWrap.createDiv({ cls: "sd-notes" });
    this.renderNotes(notesList, node);
    const btnNote = notesWrap.createEl("button", {
      cls: "sd-btn-add",
      text: "挂载笔记",
    });
    btnNote.addEventListener("click", () => this.pickNote(node.id));

    // 排序
    const orderWrap = pane.createDiv({ cls: "sd-field" });
    orderWrap.createEl("label", { text: "同级排序" });
    const orderInput = orderWrap.createEl("input", {
      attr: { type: "number", value: String(node.order) },
    });

    // 操作按钮
    const actions = pane.createDiv({ cls: "sd-actions" });
    const btnSave = actions.createEl("button", {
      cls: "mod-cta",
      text: "保存",
    });
    btnSave.addEventListener("click", () => this.saveNode(node.id, {
      title: titleInput.value.trim() || node.title,
      parentId: parentSelect.value || null,
      order: Number(orderInput.value) || 0,
    }));

    const btnDelete = actions.createEl("button", {
      cls: "sd-btn-danger",
      text: "删除节点",
    });
    btnDelete.addEventListener("click", () => this.deleteNode(node.id));
  }

  private renderNotes(container: HTMLElement, node: KnowledgeNode): void {
    container.empty();
    if (node.notePaths.length === 0) {
      container.createEl("div", {
        cls: "sd-empty-sm",
        text: "暂无关联笔记",
      });
      return;
    }
    for (const p of node.notePaths) {
      const item = container.createDiv({ cls: "sd-note-item" });
      const link = item.createSpan({ cls: "sd-note-path", text: p });
      link.setAttribute("title", "点击打开笔记");
      link.addEventListener("click", () => this.openNote(p));
      const rm = item.createSpan({ cls: "sd-note-rm", text: "✕" });
      rm.addEventListener("click", async () => {
        const next = node.notePaths.filter((x) => x !== p);
        this.plugin.data.knowledgeTree = tree.setNodeNotes(
          this.plugin.data.knowledgeTree,
          node.id,
          next
        );
        await this.plugin.persist();
        this.renderNotes(container, tree.getNode(this.plugin.data.knowledgeTree, node.id)!);
      });
    }
  }

  /** 跳转到挂载的 Obsidian 笔记 */
  private openNote(path: string): void {
    const file = this.plugin.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      this.plugin.app.workspace.getLeaf(true).openFile(file);
    } else {
      new Notice("笔记不存在，可能已被移动或删除");
    }
  }

  private addRoot(): void {
    const title = "新知识点";
    this.plugin.data.knowledgeTree = tree.addNode(
      this.plugin.data.knowledgeTree,
      null,
      title
    );
    const added = this.plugin.data.knowledgeTree[this.plugin.data.knowledgeTree.length - 1];
    this.selectedId = added.id;
    this.persistAndRender();
  }

  private addChildNode(parentId: string): void {
    this.plugin.data.knowledgeTree = tree.addNode(
      this.plugin.data.knowledgeTree,
      parentId,
      "新节点"
    );
    const added = this.plugin.data.knowledgeTree[this.plugin.data.knowledgeTree.length - 1];
    this.selectedId = added.id;
    this.collapsed.delete(parentId);
    this.persistAndRender();
  }

  private deleteNode(id: string): void {
    this.plugin.data.knowledgeTree = tree.removeNode(
      this.plugin.data.knowledgeTree,
      id
    );
    if (this.selectedId === id) this.selectedId = null;
    this.persistAndRender();
  }

  private saveNode(
    id: string,
    p: { title: string; parentId: string | null; order: number }
  ): void {
    let nodes = this.plugin.data.knowledgeTree;
    nodes = tree.renameNode(nodes, id, p.title);
    const cur = tree.getNode(nodes, id)!;
    if (cur.parentId !== p.parentId) {
      nodes = tree.moveNode(nodes, id, p.parentId);
    }
    nodes = nodes.map((n) => (n.id === id ? { ...n, order: p.order } : n));
    this.plugin.data.knowledgeTree = nodes;
    this.persistAndRender();
  }

  private showNodeMenu(e: MouseEvent, node: KnowledgeNode): void {
    const menu = new Menu();
    menu.addItem((item) =>
      item
        .setTitle("新建子节点")
        .setIcon("plus")
        .onClick(() => this.addChildNode(node.id))
    );
    menu.addItem((item) =>
      item
        .setTitle("上移")
        .setIcon("arrow-up")
        .onClick(() => {
          this.plugin.data.knowledgeTree = tree.reorderNode(
            this.plugin.data.knowledgeTree,
            node.id,
            -1
          );
          this.persistAndRender();
        })
    );
    menu.addItem((item) =>
      item
        .setTitle("下移")
        .setIcon("arrow-down")
        .onClick(() => {
          this.plugin.data.knowledgeTree = tree.reorderNode(
            this.plugin.data.knowledgeTree,
            node.id,
            1
          );
          this.persistAndRender();
        })
    );
    menu.addSeparator();
    menu.addItem((item) =>
      item
        .setTitle("删除节点（含子树）")
        .setIcon("trash")
        .onClick(() => this.deleteNode(node.id))
    );
    menu.showAtMouseEvent(e);
  }

  private pickNote(knowledgeId: string): void {
    new NotePickerModal(this.plugin.app, (file) => {
      const node = tree.getNode(this.plugin.data.knowledgeTree, knowledgeId);
      if (!node) return;
      if (!node.notePaths.includes(file.path)) {
        this.plugin.data.knowledgeTree = tree.setNodeNotes(
          this.plugin.data.knowledgeTree,
          knowledgeId,
          [...node.notePaths, file.path]
        );
        this.persistAndRender();
      }
    }).open();
  }

  private persistAndRender(): void {
    this.plugin.persist();
    this.render(this.container);
  }

  /** 导入预设知识点导图（md 标题层级 → 知识树） */
  private importIndex(): void {
    new ImportFileModal(this.plugin.app, async (file) => {
      const md = await this.plugin.app.vault.adapter.read(file.path);
      const nodes = tree.markdownToNodes(md);
      if (nodes.length === 0) {
        new Notice("该文件未解析到标题层级（# 标题）");
        return;
      }
      new ImportPreviewModal(this.plugin.app, file.name, nodes, (mode) => {
        if (mode === "merge") {
          this.plugin.data.knowledgeTree = [
            ...this.plugin.data.knowledgeTree,
            ...nodes,
          ];
        } else {
          this.plugin.data.knowledgeTree = nodes;
        }
        this.selectedId = null;
        this.plugin.persist();
        new Notice(`已导入 ${nodes.length} 个知识点`);
        this.render(this.container);
      }).open();
    }).open();
  }
}

class NotePickerModal extends FuzzySuggestModal<TFile> {
  onChoose: (file: TFile) => void;

  constructor(app: import("obsidian").App, onChoose: (file: TFile) => void) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder("搜索笔记…");
  }

  getItems(): TFile[] {
    return this.app.vault.getMarkdownFiles();
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onChoose(file);
  }
}

// ===== 导入导图：选择 md 文件 =====
class ImportFileModal extends FuzzySuggestModal<TFile> {
  onChoose: (file: TFile) => void;

  constructor(app: App, onChoose: (file: TFile) => void) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder("选择预设知识点导图（如 index.md）…");
  }

  getItems(): TFile[] {
    return this.app.vault.getMarkdownFiles();
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onChoose(file);
  }
}

// ===== 导入预览 + 合并/覆盖确认 =====
class ImportPreviewModal extends Modal {
  fileName: string;
  nodes: KnowledgeNode[];
  onConfirm: (mode: "merge" | "replace") => void;

  constructor(
    app: App,
    fileName: string,
    nodes: KnowledgeNode[],
    onConfirm: (mode: "merge" | "replace") => void
  ) {
    super(app);
    this.fileName = fileName;
    this.nodes = nodes;
    this.onConfirm = onConfirm;
  }

  onOpen(): void {
    this.modalEl.addClass("sd-import-modal");
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h3", { text: "导入知识点导图" });
    contentEl.createEl("div", {
      cls: "sd-subtitle",
      text: `${this.fileName} · 解析出 ${this.nodes.length} 个知识点`,
    });

    const preview = contentEl.createDiv({ cls: "sd-import-preview" });
    this.renderPreview(preview);

    contentEl.createEl("p", {
      cls: "sd-confirm-text",
      text: "合并导入：追加为新的根节点；覆盖导入：清空现有知识树后导入。",
    });

    const actions = contentEl.createDiv({ cls: "sd-actions" });
    const btnMerge = actions.createEl("button", {
      cls: "mod-cta",
      text: "合并导入",
    });
    btnMerge.addEventListener("click", () => {
      this.onConfirm("merge");
      this.close();
    });
    const btnReplace = actions.createEl("button", { text: "覆盖导入" });
    btnReplace.addEventListener("click", () => {
      this.onConfirm("replace");
      this.close();
    });
    actions
      .createEl("button", { text: "取消" })
      .addEventListener("click", () => this.close());
  }

  private renderPreview(preview: HTMLElement): void {
    const byParent = new Map<string | null, KnowledgeNode[]>();
    for (const n of this.nodes) {
      const key = n.parentId;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(n);
    }
    for (const arr of byParent.values()) arr.sort((a, b) => a.order - b.order);

    const walk = (parentId: string | null, depth: number) => {
      const children = byParent.get(parentId) || [];
      for (const c of children) {
        const row = preview.createDiv({ cls: "sd-import-row" });
        row.style.paddingLeft = `${depth * 16}px`;
        row.createSpan({ text: c.title });
        walk(c.id, depth + 1);
      }
    };
    walk(null, 0);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
