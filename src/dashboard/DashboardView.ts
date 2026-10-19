import type StudyDeskPlugin from "../../main";
import { PageComponent } from "../view/PageComponent";
import {
  computeMastery,
  averageMastery,
  dueCardsToday,
  checkinsThisMonth,
  Mastery,
} from "./aggregation";
import {
  getRootNodes,
  collectSubtreeIds,
} from "../knowledge/tree";

export class DashboardPage extends PageComponent {
  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("study-desk-page");

    const mastery = computeMastery(this.plugin.data);
    const masteryMap = new Map(mastery.map((m) => [m.knowledgeId, m]));

    container.createEl("h2", { text: "Dashboard" });
    container.createEl("div", {
      cls: "sd-subtitle",
      text: "掌握度 = 闪卡正确率 + 打卡均分，按知识结构聚合",
    });

    this.renderKPIs(container, mastery);
    this.renderDomains(container, masteryMap);
    this.renderStatus(container, masteryMap);
    this.renderActivity(container);
  }

  // ===== KPI 卡 =====
  private renderKPIs(container: HTMLElement, mastery: Mastery[]): void {
    const grid = container.createDiv({ cls: "sd-kpis" });
    const data = this.plugin.data;

    this.kpi(
      grid,
      "总知识点",
      String(data.knowledgeTree.length),
      `${getRootNodes(data.knowledgeTree).length} 个领域`
    );
    this.kpi(
      grid,
      "平均掌握度",
      `${averageMastery(mastery)}%`,
      mastery.filter((m) => this.hasData(m)).length + " 个知识点有数据"
    );
    this.kpi(grid, "今日待复习", String(dueCardsToday(data)), "张卡片到期");
    this.kpi(grid, "本月打卡", String(checkinsThisMonth(data)), "次练习记录");
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

  // ===== 各领域掌握度（横向条形图） =====
  private renderDomains(
    container: HTMLElement,
    masteryMap: Map<string, Mastery>
  ): void {
    container.createEl("h3", { cls: "sd-section", text: "各领域掌握度" });

    const roots = getRootNodes(this.plugin.data.knowledgeTree);
    if (roots.length === 0) {
      container.createEl("div", {
        cls: "sd-empty",
        text: "尚未配置知识结构。请到「知识 Wiki」创建知识点。",
      });
      return;
    }

    const card = container.createDiv({ cls: "sd-card" });
    for (const root of roots) {
      const ids = [
        ...collectSubtreeIds(this.plugin.data.knowledgeTree, root.id),
      ];
      const scores = ids
        .map((id) => masteryMap.get(id))
        .filter((m): m is Mastery => !!m && this.hasData(m))
        .map((m) => m.score);
      const avg = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

      const row = card.createDiv({ cls: "sd-bar-row" });
      row.createSpan({ cls: "sd-bar-name", text: root.title });
      const track = row.createDiv({ cls: "sd-bar-track" });
      track.createDiv({
        cls: "sd-bar-fill " + this.scoreClass(avg),
        attr: { style: `width:${Math.min(100, avg)}%` },
      });
      row.createSpan({ cls: "sd-bar-val", text: `${avg}%` });
    }
  }

  // ===== 掌握状态分布（维度表） =====
  private renderStatus(
    container: HTMLElement,
    masteryMap: Map<string, Mastery>
  ): void {
    container.createEl("h3", { cls: "sd-section", text: "掌握状态分布" });

    const nodes = this.plugin.data.knowledgeTree;
    const buckets = [
      { label: "已掌握", cls: "sd-good", count: 0 },
      { label: "需巩固", cls: "sd-mid", count: 0 },
      { label: "待加强", cls: "sd-bad", count: 0 },
      { label: "待开始", cls: "sd-idle", count: 0 },
    ];
    for (const n of nodes) {
      const m = masteryMap.get(n.id);
      if (!m || !this.hasData(m)) {
        buckets[3].count++;
      } else if (m.score >= 70) {
        buckets[0].count++;
      } else if (m.score >= 40) {
        buckets[1].count++;
      } else {
        buckets[2].count++;
      }
    }
    const total = nodes.length || 1;

    const card = container.createDiv({ cls: "sd-card" });
    const table = card.createEl("table", { cls: "sd-table" });
    const thead = table.createEl("thead");
    const hr = thead.createEl("tr");
    ["状态", "数量", "占比", "分布"].forEach((t) => hr.createEl("th", { text: t }));
    const tbody = table.createEl("tbody");

    for (const b of buckets) {
      const pct = Math.round((b.count / total) * 100);
      const tr = tbody.createEl("tr");
      const statusTd = tr.createEl("td");
      statusTd.createSpan({
        cls: b.cls === "sd-idle" ? "sd-status-dot sd-idle" : "sd-status-dot " + b.cls,
        text: b.label,
      });
      tr.createEl("td", { text: String(b.count) });
      tr.createEl("td", { text: `${pct}%` });
      const barTd = tr.createEl("td", { cls: "sd-status-bar-cell" });
      const track = barTd.createDiv({ cls: "sd-bar-track" });
      track.createDiv({
        cls: "sd-bar-fill " + (b.cls === "sd-idle" ? "" : b.cls),
        attr: { style: `width:${pct}%` },
      });
    }
  }

  // ===== 学习活动概览（维度表） =====
  private renderActivity(container: HTMLElement): void {
    container.createEl("h3", { cls: "sd-section", text: "学习活动概览" });

    const data = this.plugin.data;
    const cards = data.flashcards;
    const totalReps = cards.reduce((s, c) => s + c.reps, 0);
    const totalCorrect = cards.reduce((s, c) => s + c.correctCount, 0);
    const rate = totalReps
      ? Math.round((totalCorrect / totalReps) * 100) + "%"
      : "—";

    const checkins = data.checkins;
    const pending = checkins.filter((c) => c.status === "pending").length;
    const graded = checkins.filter((c) => c.status === "graded").length;

    const rows: [string, string][] = [
      ["闪卡 · 卡片总数", String(cards.length)],
      ["闪卡 · 今日待复习", String(dueCardsToday(data))],
      ["闪卡 · 平均正确率", rate],
      ["打卡 · 记录总数", String(checkins.length)],
      ["打卡 · 待评分", String(pending)],
      ["打卡 · 已评分", String(graded)],
    ];

    const card = container.createDiv({ cls: "sd-card" });
    const table = card.createEl("table", { cls: "sd-table" });
    const thead = table.createEl("thead");
    const hr = thead.createEl("tr");
    ["维度", "数值"].forEach((t) => hr.createEl("th", { text: t }));
    const tbody = table.createEl("tbody");
    for (const [dim, val] of rows) {
      const tr = tbody.createEl("tr");
      tr.createEl("td", { text: dim });
      tr.createEl("td", { text: val });
    }
  }

  private hasData(m: Mastery): boolean {
    return m.flashcardRate !== null || m.checkinAvg !== null;
  }

  private scoreClass(score: number): string {
    if (score >= 70) return "sd-good";
    if (score >= 40) return "sd-mid";
    return "sd-bad";
  }

  private statusText(score: number): string {
    if (score >= 70) return "已掌握";
    if (score >= 40) return "需巩固";
    return "待加强";
  }
}
