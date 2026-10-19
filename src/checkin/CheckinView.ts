import {
  Notice,
  Modal,
  App,
  FuzzySuggestModal,
  TFile,
} from "obsidian";
import type StudyDeskPlugin from "../../main";
import { CheckinRecord, KnowledgeNode } from "../types";
import { genId } from "../utils/id";
import { getChildren, getNode } from "../knowledge/tree";
import { PageComponent } from "../view/PageComponent";

const VIDEO_EXT = ["mp4", "webm", "mov", "m4v", "mkv"];

export class CheckinPage extends PageComponent {
  // 表单临时状态
  private selectedKnowledgeIds: string[] = [];
  private videoPath: string | null = null;
  private selfScore: string = "";
  private note: string = "";

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("study-desk-page");

    container.createEl("h2", { text: "练习打卡" });
    container.createEl("div", {
      cls: "sd-subtitle",
      text: "记录练习 · 可附视频 · 自评 / 回填老师评分",
    });

    const grid = container.createDiv({ cls: "sd-checkin-grid" });
    this.renderForm(grid.createDiv({ cls: "sd-checkin-form" }));
    this.renderList(grid.createDiv({ cls: "sd-checkin-list" }));
  }

  // ===== 左侧：新建表单 =====
  private renderForm(pane: HTMLElement): void {
    pane.empty();
    pane.createEl("h3", { text: "新建打卡" });

    // 知识点多选
    const kField = pane.createDiv({ cls: "sd-field" });
    kField.createEl("label", { text: "关联知识点（可多选）" });
    const kBox = kField.createDiv({ cls: "sd-pills" });
    this.renderPills(kBox);
    const btnPick = kField.createEl("button", {
      text: this.selectedKnowledgeIds.length ? "调整选择" : "选择知识点",
    });
    btnPick.addEventListener("click", () => this.pickKnowledge());

    // 视频
    const vField = pane.createDiv({ cls: "sd-field" });
    vField.createEl("label", { text: "练习视频（可选）" });
    const vBox = vField.createDiv({ cls: "sd-video-box" });
    const btnVideo = vBox.createEl("button", { text: "选择视频" });
    btnVideo.addEventListener("click", () => this.pickVideo());
    const vInfo = vBox.createSpan({
      cls: "sd-video-info",
      text: this.videoPath || "未选择文件",
    });
    if (this.videoPath) {
      const btnClear = vBox.createEl("button", { text: "清除" });
      btnClear.addEventListener("click", () => {
        this.videoPath = null;
        this.renderForm(pane);
      });
    }

    // 自评
    const sField = pane.createDiv({ cls: "sd-field" });
    sField.createEl("label", { text: "自评分数（0-100，可留空）" });
    const sInput = sField.createEl("input", {
      attr: { type: "number", min: "0", max: "100", placeholder: "如 85" },
    });
    sInput.value = this.selfScore;
    sInput.addEventListener("input", () => {
      this.selfScore = sInput.value;
    });

    // 备注
    const nField = pane.createDiv({ cls: "sd-field" });
    nField.createEl("label", { text: "备注" });
    const nArea = nField.createEl("textarea", {
      attr: { placeholder: "今天的练习感受、遇到难点…" },
    });
    nArea.value = this.note;
    nArea.addEventListener("input", () => {
      this.note = nArea.value;
    });

    const btnSubmit = pane.createEl("button", {
      cls: "mod-cta",
      text: "提交打卡",
    });
    btnSubmit.addEventListener("click", () => this.submit());
  }

  private renderPills(container: HTMLElement): void {
    container.empty();
    if (this.selectedKnowledgeIds.length === 0) {
      container.createEl("div", {
        cls: "sd-empty-sm",
        text: "未选择知识点",
      });
      return;
    }
    for (const id of this.selectedKnowledgeIds) {
      const node = getNode(this.plugin.data.knowledgeTree, id);
      const pill = container.createSpan({
        cls: "sd-pill",
        text: (node ? node.title : "已删除") + " ✕",
      });
      pill.addEventListener("click", () => {
        this.selectedKnowledgeIds = this.selectedKnowledgeIds.filter(
          (x) => x !== id
        );
        this.renderForm(this.container.querySelector(".sd-checkin-form") as HTMLElement);
      });
    }
  }

  private submit(): void {
    if (this.selectedKnowledgeIds.length === 0) {
      new Notice("请至少选择一个知识点");
      return;
    }
    const record: CheckinRecord = {
      id: genId(),
      knowledgeIds: [...this.selectedKnowledgeIds],
      date: Date.now(),
      videoPath: this.videoPath || undefined,
      status: "pending",
      selfScore: this.selfScore === "" ? null : Number(this.selfScore),
      teacherScore: null,
      note: this.note || undefined,
    };
    this.plugin.data.checkins.unshift(record);
    // 重置表单
    this.selectedKnowledgeIds = [];
    this.videoPath = null;
    this.selfScore = "";
    this.note = "";
    this.plugin.persist();
    new Notice("打卡已提交");
    this.render(this.container);
  }

  // ===== 右侧：记录列表 =====
  private renderList(pane: HTMLElement): void {
    pane.empty();
    const head = pane.createDiv({ cls: "sd-list-head" });
    head.createEl("h3", { text: "打卡记录" });
    head.createEl("span", {
      cls: "sd-count",
      text: `共 ${this.plugin.data.checkins.length} 条`,
    });

    const list = pane.createDiv({ cls: "sd-ck-list" });
    if (this.plugin.data.checkins.length === 0) {
      list.createEl("div", {
        cls: "sd-empty",
        text: "还没有打卡记录",
      });
      return;
    }

    for (const rec of this.plugin.data.checkins) {
      list.appendChild(this.renderRecord(rec));
    }
  }

  private renderRecord(rec: CheckinRecord): HTMLElement {
    const item = document.createElement("div");
    item.className = "sd-ck-item";

    const info = item.createDiv({ cls: "sd-ck-info" });
    info.createDiv({
      cls: "sd-ck-title",
      text: this.knowledgeLabel(rec.knowledgeIds),
    });
    info.createDiv({
      cls: "sd-ck-meta",
      text: this.formatDate(rec.date) + (rec.videoPath ? " · 🎥 视频" : ""),
    });

    const right = item.createDiv({ cls: "sd-ck-right" });

    if (rec.status === "pending") {
      // 待评分：显示自评 + 回填老师分
      if (rec.selfScore !== null) {
        right.createSpan({
          cls: "sd-score",
          text: `自评 ${rec.selfScore}`,
        });
      }
      const btnGrade = right.createEl("button", {
        cls: "sd-btn-grade",
        text: "回填老师分",
      });
      btnGrade.addEventListener("click", () => this.gradeModal(rec));
      right.createSpan({ cls: "sd-pill-warn", text: "待评分" });
    } else {
      right.createSpan({
        cls: "sd-score",
        text: `老师 ${rec.teacherScore}`,
      });
      right.createSpan({ cls: "sd-pill-ok", text: "已评分" });
    }

    const btnDel = right.createEl("button", {
      cls: "sd-btn-del",
      text: "删除",
    });
    btnDel.addEventListener("click", () => {
      this.plugin.data.checkins = this.plugin.data.checkins.filter(
        (x) => x.id !== rec.id
      );
      this.plugin.persist();
      this.render(this.container);
    });

    return item;
  }

  private knowledgeLabel(ids: string[]): string {
    const names = ids
      .map((id) => getNode(this.plugin.data.knowledgeTree, id)?.title)
      .filter(Boolean);
    return names.length ? names.join("、") : "未关联知识点";
  }

  private formatDate(ts: number): string {
    const d = new Date(ts);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  // ===== 弹窗 =====
  private pickKnowledge(): void {
    new KnowledgePickerModal(this.plugin.app, this.plugin.data.knowledgeTree, this.selectedKnowledgeIds, (ids) => {
      this.selectedKnowledgeIds = ids;
      this.renderForm(this.container.querySelector(".sd-checkin-form") as HTMLElement);
    }).open();
  }

  private pickVideo(): void {
    new VideoPickerModal(this.plugin.app, (file) => {
      this.videoPath = file.path;
      this.renderForm(this.container.querySelector(".sd-checkin-form") as HTMLElement);
    }).open();
  }

  private gradeModal(rec: CheckinRecord): void {
    new GradeModal(this.plugin.app, rec, (score, comment) => {
      rec.teacherScore = score;
      rec.teacherComment = comment || undefined;
      rec.status = "graded";
      this.plugin.persist();
      this.render(this.container);
    }).open();
  }
}

// ===== 知识点多选弹窗 =====
class KnowledgePickerModal extends Modal {
  tree: KnowledgeNode[];
  selected: string[];
  onDone: (ids: string[]) => void;
  private picked: Set<string>;

  constructor(app: App, tree: KnowledgeNode[], selected: string[], onDone: (ids: string[]) => void) {
    super(app);
    this.tree = tree;
    this.selected = selected;
    this.onDone = onDone;
    this.picked = new Set(selected);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "选择知识点" });

    const box = contentEl.createDiv({ cls: "sd-picker" });
    this.renderLevel(box, null, 0);

    const actions = contentEl.createDiv({ cls: "sd-actions" });
    const ok = actions.createEl("button", { cls: "mod-cta", text: "确定" });
    ok.addEventListener("click", () => {
      this.onDone([...this.picked]);
      this.close();
    });
    actions.createEl("button", { text: "取消" }).addEventListener("click", () => this.close());
  }

  private renderLevel(box: HTMLElement, parentId: string | null, depth: number): void {
    const children = getChildren(this.tree, parentId);
    for (const node of children) {
      const row = box.createDiv({ cls: "sd-picker-row" });
      row.style.paddingLeft = `${depth * 16}px`;
      const cb = row.createEl("input", { attr: { type: "checkbox" } });
      (cb as HTMLInputElement).checked = this.picked.has(node.id);
      cb.addEventListener("change", () => {
        if ((cb as HTMLInputElement).checked) this.picked.add(node.id);
        else this.picked.delete(node.id);
      });
      row.createSpan({ text: node.title });
      this.renderLevel(box, node.id, depth + 1);
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

// ===== 视频选择弹窗 =====
class VideoPickerModal extends FuzzySuggestModal<TFile> {
  onChoose: (file: TFile) => void;

  constructor(app: App, onChoose: (file: TFile) => void) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder("搜索视频文件…");
  }

  getItems(): TFile[] {
    return this.app.vault
      .getFiles()
      .filter((f) => VIDEO_EXT.includes(f.extension.toLowerCase()));
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onChoose(file);
  }
}

// ===== 老师评分回填弹窗 =====
class GradeModal extends Modal {
  rec: CheckinRecord;
  onDone: (score: number, comment: string) => void;

  constructor(app: App, rec: CheckinRecord, onDone: (score: number, comment: string) => void) {
    super(app);
    this.rec = rec;
    this.onDone = onDone;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "回填老师评分" });
    contentEl.createEl("div", {
      cls: "sd-subtitle",
      text: `知识点：${this.rec.knowledgeIds.join(", ")}`,
    });

    const f1 = contentEl.createDiv({ cls: "sd-field" });
    f1.createEl("label", { text: "老师评分（0-100）" });
    const scoreInput = f1.createEl("input", {
      attr: { type: "number", min: "0", max: "100", placeholder: "如 90" },
    });

    const f2 = contentEl.createDiv({ cls: "sd-field" });
    f2.createEl("label", { text: "评语（可选）" });
    const commentInput = f2.createEl("textarea", { attr: { rows: "3" } });

    const actions = contentEl.createDiv({ cls: "sd-actions" });
    const ok = actions.createEl("button", { cls: "mod-cta", text: "保存" });
    ok.addEventListener("click", () => {
      const n = Number(scoreInput.value);
      if (isNaN(n) || n < 0 || n > 100) {
        new Notice("请输入 0-100 的分数");
        return;
      }
      this.onDone(n, commentInput.value.trim());
      this.close();
    });
    actions.createEl("button", { text: "取消" }).addEventListener("click", () => this.close());
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
