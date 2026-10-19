import { Notice } from "obsidian";
import type StudyDeskPlugin from "../../main";
import { Schedule, SchedulePreset } from "../types";
import { genId } from "../utils/id";
import { PageComponent } from "../view/PageComponent";

const PRESET_OPTIONS: { value: SchedulePreset; label: string }[] = [
  { value: null, label: "通用日程" },
  { value: "checkin", label: "打卡练习" },
];

export class SchedulePage extends PageComponent {
  // 表单临时状态
  private title = "";
  private date = "";
  private tags: string[] = [];
  private preset: SchedulePreset = null;
  private note = "";
  private tagInput = "";

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("study-desk-page");

    container.createEl("h2", { text: "日程管理" });
    container.createEl("div", {
      cls: "sd-subtitle",
      text: "创建日程 · 添加标签 · 预设打卡练习",
    });

    const grid = container.createDiv({ cls: "sd-sched-grid" });
    this.renderForm(grid.createDiv({ cls: "sd-sched-form" }));
    this.renderList(grid.createDiv({ cls: "sd-sched-list" }));
  }

  // ===== 左侧：新建表单 =====
  private renderForm(pane: HTMLElement): void {
    pane.empty();
    pane.createEl("h3", { text: "新建日程" });

    // 标题
    const tField = pane.createDiv({ cls: "sd-field" });
    tField.createEl("label", { text: "标题" });
    const tInput = tField.createEl("input", {
      attr: { type: "text", placeholder: "如：练习《车尔尼》第 10 条" },
    });
    tInput.value = this.title;
    tInput.addEventListener("input", () => {
      this.title = tInput.value;
    });

    // 日期时间
    const dField = pane.createDiv({ cls: "sd-field" });
    dField.createEl("label", { text: "日期时间" });
    const dInput = dField.createEl("input", { attr: { type: "datetime-local" } });
    dInput.value = this.date;
    dInput.addEventListener("input", () => {
      this.date = dInput.value;
    });

    // 预设类型
    const pField = pane.createDiv({ cls: "sd-field" });
    pField.createEl("label", { text: "预设类型" });
    const pSelect = pField.createEl("select");
    for (const opt of PRESET_OPTIONS) {
      pSelect.createEl("option", {
        text: opt.label,
        attr: { value: opt.value ?? "" },
      });
    }
    pSelect.value = this.preset ?? "";
    pSelect.addEventListener("change", () => {
      this.preset = pSelect.value === "" ? null : (pSelect.value as SchedulePreset);
    });
    if (this.preset === "checkin") {
      pField.createEl("div", {
        cls: "sd-sched-hint",
        text: "该日程将标记为「打卡练习」，完成后可回填评分。",
      });
    }

    // 标签
    const tagField = pane.createDiv({ cls: "sd-field" });
    tagField.createEl("label", { text: "标签" });
    this.renderTagPills(tagField);
    const tagRow = tagField.createDiv({ cls: "sd-tag-row" });
    const tagInput = tagRow.createEl("input", {
      attr: { type: "text", placeholder: "输入标签后回车添加" },
    });
    tagInput.value = this.tagInput;
    tagInput.addEventListener("input", () => {
      this.tagInput = tagInput.value;
    });
    tagInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.addTag();
        this.renderForm(this.container.querySelector(".sd-sched-form") as HTMLElement);
      }
    });
    const btnTag = tagRow.createEl("button", { text: "添加" });
    btnTag.addEventListener("click", () => {
      this.addTag();
      this.renderForm(this.container.querySelector(".sd-sched-form") as HTMLElement);
    });

    // 备注
    const nField = pane.createDiv({ cls: "sd-field" });
    nField.createEl("label", { text: "备注（可选）" });
    const nArea = nField.createEl("textarea", {
      attr: { placeholder: "补充说明…" },
    });
    nArea.value = this.note;
    nArea.addEventListener("input", () => {
      this.note = nArea.value;
    });

    const btnSubmit = pane.createEl("button", {
      cls: "mod-cta",
      text: "创建日程",
    });
    btnSubmit.addEventListener("click", () => this.submit());
  }

  private renderTagPills(container: HTMLElement): void {
    const box = container.createDiv({ cls: "sd-pills" });
    if (this.tags.length === 0) {
      box.createEl("div", { cls: "sd-empty-sm", text: "尚未添加标签" });
      return;
    }
    for (const tag of this.tags) {
      const pill = box.createSpan({ cls: "sd-pill sd-tag-pill", text: `#${tag} ✕` });
      pill.addEventListener("click", () => {
        this.tags = this.tags.filter((x) => x !== tag);
        this.renderForm(this.container.querySelector(".sd-sched-form") as HTMLElement);
      });
    }
  }

  private addTag(): void {
    const t = this.tagInput.trim().replace(/^#/, "");
    if (!t) return;
    if (!this.tags.includes(t)) this.tags.push(t);
    this.tagInput = "";
  }

  private submit(): void {
    if (!this.title.trim()) {
      new Notice("请填写日程标题");
      return;
    }
    if (!this.date) {
      new Notice("请选择日期时间");
      return;
    }
    const ts = new Date(this.date).getTime();
    if (isNaN(ts)) {
      new Notice("日期时间格式无效");
      return;
    }

    const sched: Schedule = {
      id: genId(),
      title: this.title.trim(),
      date: ts,
      tags: [...this.tags],
      preset: this.preset,
      done: false,
      note: this.note || undefined,
      createdAt: Date.now(),
    };
    this.plugin.data.schedules.push(sched);

    // 重置表单
    this.title = "";
    this.date = "";
    this.tags = [];
    this.preset = null;
    this.note = "";
    this.tagInput = "";
    this.plugin.persist();
    new Notice("日程已创建");
    this.render(this.container);
  }

  // ===== 右侧：日程列表 =====
  private renderList(pane: HTMLElement): void {
    pane.empty();
    const head = pane.createDiv({ cls: "sd-list-head" });
    head.createEl("h3", { text: "日程列表" });
    head.createEl("span", {
      cls: "sd-count",
      text: `共 ${this.plugin.data.schedules.length} 条`,
    });

    const list = pane.createDiv({ cls: "sd-sched-items" });
    const schedules = [...this.plugin.data.schedules].sort((a, b) => a.date - b.date);
    if (schedules.length === 0) {
      list.createEl("div", {
        cls: "sd-empty",
        text: "还没有日程\n在左侧创建你的第一个日程",
      });
      return;
    }

    for (const s of schedules) {
      list.appendChild(this.renderItem(s));
    }
  }

  private renderItem(s: Schedule): HTMLElement {
    const item = document.createElement("div");
    item.className = "sd-sched-item" + (s.done ? " is-done" : "");

    // 完成勾选
    const cb = item.createEl("input", { attr: { type: "checkbox" } });
    (cb as HTMLInputElement).checked = s.done;
    cb.addEventListener("change", () => {
      s.done = (cb as HTMLInputElement).checked;
      this.plugin.persist();
      this.render(this.container);
    });

    const info = item.createDiv({ cls: "sd-sched-info" });
    info.createDiv({ cls: "sd-sched-title", text: s.title });

    // 元信息行：日期 + 预设
    const meta = info.createDiv({ cls: "sd-sched-meta" });
    meta.createSpan({ cls: "sd-sched-date", text: this.formatDate(s.date) });
    if (s.preset === "checkin") {
      meta.createSpan({ cls: "sd-pill sd-good", text: "打卡练习" });
    }
    if (s.tags.length) {
      for (const tag of s.tags) {
        meta.createSpan({ cls: "sd-pill sd-pill-idle", text: `#${tag}` });
      }
    }
    if (s.note) {
      info.createDiv({ cls: "sd-sched-note", text: s.note });
    }

    const del = item.createEl("button", { cls: "sd-btn-del", text: "删除" });
    del.addEventListener("click", () => {
      this.plugin.data.schedules = this.plugin.data.schedules.filter(
        (x) => x.id !== s.id
      );
      this.plugin.persist();
      this.render(this.container);
    });

    return item;
  }

  private formatDate(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    const dateStr = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    const timeStr = `${p(d.getHours())}:${p(d.getMinutes())}`;

    const startOf = (x: Date) =>
      new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const dayDiff = Math.round(
      (startOf(d) - startOf(now)) / (24 * 60 * 60 * 1000)
    );
    let prefix = dateStr;
    if (dayDiff === 0) prefix = "今天";
    else if (dayDiff === 1) prefix = "明天";
    else if (dayDiff === -1) prefix = "昨天";

    return `${prefix} ${timeStr}`;
  }
}
