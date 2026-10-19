import type StudyDeskPlugin from "../../main";
import { PageComponent } from "../view/PageComponent";
import {
  computeMastery,
  averageMastery,
  dueCardsToday,
  checkinsThisMonth,
  Mastery,
} from "./aggregation";
import { getRootNodes, collectSubtreeIds } from "../knowledge/tree";

export class DashboardPage extends PageComponent {
  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("study-desk-page");

    const mastery = computeMastery(this.plugin.data);
    const masteryMap = new Map(mastery.map((m) => [m.knowledgeId, m]));

    container.createEl("h2", { text: "记分仪表盘" });
    container.createEl("div", {
      cls: "sd-subtitle",
      text: "掌握度 = 闪卡正确率 + 打卡均分，按知识结构聚合",
    });

    this.renderKPIs(container, mastery);
    this.renderDomains(container, masteryMap);
    this.renderTable(container, masteryMap);
  }

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

  private renderDomains(
    container: HTMLElement,
    masteryMap: Map<string, Mastery>
  ): void {
    container.createEl("h3", { cls: "sd-section", text: "各领域掌握度" });

    const roots = getRootNodes(this.plugin.data.knowledgeTree);
    if (roots.length === 0) {
      container.createEl("div", {
        cls: "sd-empty",
        text: "尚未配置知识结构。请点击左侧「知识 Wiki」创建知识点。",
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

  private renderTable(
    container: HTMLElement,
    masteryMap: Map<string, Mastery>
  ): void {
    container.createEl("h3", { cls: "sd-section", text: "知识点明细" });

    const nodes = this.plugin.data.knowledgeTree;
    if (nodes.length === 0) {
      container.createEl("div", { cls: "sd-empty", text: "暂无知识点" });
      return;
    }

    const table = container.createEl("table", { cls: "sd-table" });
    const thead = table.createEl("thead");
    const hr = thead.createEl("tr");
    ["知识点", "掌握度", "闪卡正确率", "打卡均分", "状态"].forEach((t) =>
      hr.createEl("th", { text: t })
    );
    const tbody = table.createEl("tbody");

    const flatten: { node: { id: string; title: string }; depth: number }[] =
      [];
    const walk = (parentId: string | null, depth: number) => {
      const children = nodes
        .filter((n) => n.parentId === parentId)
        .sort((a, b) => a.order - b.order);
      for (const c of children) {
        flatten.push({ node: c, depth });
        walk(c.id, depth + 1);
      }
    };
    walk(null, 0);

    for (const { node, depth } of flatten) {
      const m = masteryMap.get(node.id);
      const tr = tbody.createEl("tr");
      tr.createEl("td", {
        cls: "sd-td-name",
        attr: { style: `padding-left:${12 + depth * 18}px` },
        text: node.title,
      });

      const score = m ? m.score : 0;
      const hasData = m && this.hasData(m);
      tr.createEl("td", { text: hasData ? `${score}%` : "—" });
      tr.createEl("td", {
        text: m?.flashcardRate != null ? `${m.flashcardRate}%` : "—",
      });
      tr.createEl("td", {
        text: m?.checkinAvg != null ? String(m.checkinAvg) : "—",
      });

      const statusTd = tr.createEl("td");
      statusTd.createSpan({
        cls: "sd-pill " + (hasData ? this.scoreClass(score) : "sd-pill-idle"),
        text: hasData ? this.statusText(score) : "待开始",
      });
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
