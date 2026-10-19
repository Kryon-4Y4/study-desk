import { Notice, Modal, App } from "obsidian";
import { Rating, Grade } from "ts-fsrs";
import type StudyDeskPlugin from "../../main";
import { Flashcard } from "../types";
import { grade, createNewCard } from "./scheduler";
import { getNode } from "../knowledge/tree";
import { PageComponent } from "../view/PageComponent";

export class FlashcardPage extends PageComponent {
  private revealed = false;
  private queue: Flashcard[] = [];

  private getDueCards(): Flashcard[] {
    const now = Date.now();
    return this.plugin.data.flashcards
      .filter((f) => f.due <= now)
      .sort((a, b) => a.due - b.due);
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("study-desk-page");

    this.queue = this.getDueCards();

    container.createEl("h2", { text: "闪卡复习" });
    container.createEl("div", {
      cls: "sd-subtitle",
      text: "基于 FSRS 间隔重复算法",
    });

    this.renderKPIs(container);

    const grid = container.createDiv({ cls: "sd-flash-grid" });
    this.renderReview(grid.createDiv({ cls: "sd-flash-review" }));
    this.renderManage(grid.createDiv({ cls: "sd-flash-manage" }));
  }

  private renderKPIs(container: HTMLElement): void {
    const data = this.plugin.data;
    const grid = container.createDiv({ cls: "sd-kpis sd-kpis-3" });
    this.kpi(grid, "今日待复习", String(this.queue.length), "张卡片");
    this.kpi(
      grid,
      "新卡",
      String(data.flashcards.filter((f) => f.state === "new").length),
      "尚未学习"
    );
    this.kpi(grid, "累计卡片", String(data.flashcards.length), "张");
  }

  private kpi(
    grid: HTMLElement,
    label: string,
    value: string,
    sub: string
  ): void {
    const card = grid.createDiv({ cls: "sd-kpi" });
    card.createDiv({ cls: "sd-kpi-label", text: label });
    card.createDiv({ cls: "sd-kpi-value", text: value });
    card.createDiv({ cls: "sd-kpi-sub", text: sub });
  }

  // ===== 复习区 =====
  private renderReview(pane: HTMLElement): void {
    pane.empty();
    const current = this.queue[0];

    if (!current) {
      pane.createEl("div", {
        cls: "sd-empty",
        text: "今日复习完成 🎉\n暂无到期卡片",
      });
      return;
    }

    const node = getNode(this.plugin.data.knowledgeTree, current.knowledgeId);
    const cardEl = pane.createDiv({ cls: "sd-flashcard" });

    const tag = cardEl.createDiv({ cls: "sd-flash-tag" });
    tag.setText(node ? node.title : "未关联知识点");

    const body = cardEl.createDiv({ cls: "sd-flash-body" });
    body.setText(this.revealed ? current.back : current.front);

    const hint = cardEl.createDiv({
      cls: "sd-flash-hint",
      text: this.revealed ? "" : "点击翻面",
    });

    cardEl.addEventListener("click", () => {
      this.revealed = !this.revealed;
      this.renderReview(pane);
    });

    const rateRow = pane.createDiv({ cls: "sd-rate-row" });
    const opts: { label: string; key: string; rating: Grade; cls: string }[] = [
      { label: "Again", key: "重来", rating: Rating.Again, cls: "sd-ra" },
      { label: "Hard", key: "困难", rating: Rating.Hard, cls: "sd-rh" },
      { label: "Good", key: "良好", rating: Rating.Good, cls: "sd-rg" },
      { label: "Easy", key: "简单", rating: Rating.Easy, cls: "sd-re" },
    ];
    for (const o of opts) {
      const btn = rateRow.createEl("button", { cls: "sd-rate-btn " + o.cls });
      btn.createDiv({ cls: "sd-rate-label", text: o.label });
      btn.createDiv({ cls: "sd-rate-key", text: o.key });
      btn.addEventListener("click", () => this.rate(o.rating));
    }

    const prog = pane.createDiv({ cls: "sd-flash-prog" });
    prog.setText(`队列 ${this.queue.length} 张 · 当前第 1 张`);
  }

  private rate(rating: Grade): void {
    const current = this.queue[0];
    if (!current) return;
    const result = grade(current, rating);
    this.plugin.data.flashcards = this.plugin.data.flashcards.map((f) =>
      f.id === current.id ? result.card : f
    );
    this.plugin.persist();
    this.revealed = false;
    this.render(this.container);
  }

  // ===== 卡片管理 =====
  private renderManage(pane: HTMLElement): void {
    pane.empty();

    const head = pane.createDiv({ cls: "sd-list-head" });
    head.createEl("h3", { text: "卡片管理" });
    const btnNew = head.createEl("button", { cls: "mod-cta", text: "新建卡片" });
    btnNew.addEventListener("click", () => this.newCard());

    const list = pane.createDiv({ cls: "sd-card-list" });
    const cards = this.plugin.data.flashcards;
    if (cards.length === 0) {
      list.createEl("div", { cls: "sd-empty", text: "还没有卡片" });
      return;
    }

    for (const c of cards) {
      const item = list.createDiv({ cls: "sd-card-item" });
      const node = getNode(this.plugin.data.knowledgeTree, c.knowledgeId);
      item.createDiv({ cls: "sd-card-front", text: c.front });
      item.createDiv({
        cls: "sd-card-meta",
        text: `${node ? node.title : "未关联"} · ${this.stateLabel(c.state)} · 复习 ${c.reps} 次`,
      });
      const del = item.createSpan({ cls: "sd-card-del", text: "✕" });
      del.addEventListener("click", () => {
        this.plugin.data.flashcards = this.plugin.data.flashcards.filter(
          (f) => f.id !== c.id
        );
        this.plugin.persist();
        this.render(this.container);
      });
    }
  }

  private stateLabel(state: string): string {
    const map: Record<string, string> = {
      new: "新卡",
      learning: "学习中",
      review: "复习中",
      relearning: "重学中",
    };
    return map[state] || state;
  }

  private newCard(): void {
    if (this.plugin.data.knowledgeTree.length === 0) {
      new Notice("请先在「知识 Wiki」创建知识点");
      return;
    }
    new CardEditModal(this.plugin.app, this.plugin, (fc) => {
      this.plugin.data.flashcards.push(fc);
      this.plugin.persist();
      this.render(this.container);
    }).open();
  }
}

// ===== 新建/编辑卡片弹窗 =====
class CardEditModal extends Modal {
  plugin: StudyDeskPlugin;
  onSave: (fc: Flashcard) => void;

  constructor(app: App, plugin: StudyDeskPlugin, onSave: (fc: Flashcard) => void) {
    super(app);
    this.plugin = plugin;
    this.onSave = onSave;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "新建卡片" });

    const f1 = contentEl.createDiv({ cls: "sd-field" });
    f1.createEl("label", { text: "知识点" });
    const select = f1.createEl("select");
    this.fillKnowledgeOptions(select, null, 0);

    const f2 = contentEl.createDiv({ cls: "sd-field" });
    f2.createEl("label", { text: "正面（问题）" });
    const frontInput = f2.createEl("textarea", {
      attr: { rows: "2", placeholder: "如：C 大调的调号是什么？" },
    });

    const f3 = contentEl.createDiv({ cls: "sd-field" });
    f3.createEl("label", { text: "背面（答案）" });
    const backInput = f3.createEl("textarea", {
      attr: { rows: "2", placeholder: "如：无升降号" },
    });

    const f4 = contentEl.createDiv({ cls: "sd-field" });
    f4.createEl("label", { text: "标签（逗号分隔，可选）" });
    const tagsInput = f4.createEl("input", {
      attr: { type: "text", placeholder: "如：乐理,调号" },
    });

    const actions = contentEl.createDiv({ cls: "sd-actions" });
    const ok = actions.createEl("button", { cls: "mod-cta", text: "保存" });
    ok.addEventListener("click", () => {
      const front = frontInput.value.trim();
      const back = backInput.value.trim();
      if (!front || !back) {
        new Notice("请填写正面和背面");
        return;
      }
      const tags = tagsInput.value
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean);
      const fc = createNewCard(select.value, front, back, tags);
      this.onSave(fc);
      this.close();
    });
    actions.createEl("button", { text: "取消" }).addEventListener("click", () => this.close());
  }

  private fillKnowledgeOptions(
    select: HTMLElement,
    parentId: string | null,
    depth: number
  ): void {
    const nodes = this.plugin.data.knowledgeTree
      .filter((n) => n.parentId === parentId)
      .sort((a, b) => a.order - b.order);
    for (const n of nodes) {
      select.createEl("option", {
        text: "　".repeat(depth) + n.title,
        value: n.id,
      });
      this.fillKnowledgeOptions(select, n.id, depth + 1);
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
