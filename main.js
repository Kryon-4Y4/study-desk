/*
音乐学习台 study-desk — Obsidian 插件
构建产物，请勿手动编辑。
*/
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => StudyDeskPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian10 = require("obsidian");

// src/types.ts
var DATA_VERSION = 1;
var DEFAULT_SETTINGS = {
  weightFlashcard: 0.5,
  weightCheckin: 0.5,
  videoDir: "study-desk-assets/",
  dailyNewCardLimit: 20
};
var DEFAULT_DATA = {
  version: DATA_VERSION,
  knowledgeTree: [],
  flashcards: [],
  checkins: [],
  tracks: [],
  schedules: [],
  settings: DEFAULT_SETTINGS
};

// src/store.ts
function clone(v2) {
  return JSON.parse(JSON.stringify(v2));
}
async function loadPluginData(plugin) {
  const raw = await plugin.loadData();
  if (!raw)
    return clone(DEFAULT_DATA);
  return migrate(raw);
}
async function savePluginData(plugin, data) {
  await plugin.saveData(data);
}
function migrate(raw) {
  var _a;
  const data = clone(DEFAULT_DATA);
  data.version = (_a = raw.version) != null ? _a : DATA_VERSION;
  data.knowledgeTree = Array.isArray(raw.knowledgeTree) ? raw.knowledgeTree : [];
  data.flashcards = Array.isArray(raw.flashcards) ? raw.flashcards : [];
  data.checkins = Array.isArray(raw.checkins) ? raw.checkins : [];
  data.tracks = Array.isArray(raw.tracks) ? raw.tracks : [];
  data.schedules = Array.isArray(raw.schedules) ? raw.schedules : [];
  data.settings = { ...DEFAULT_SETTINGS, ...raw.settings || {} };
  return data;
}

// src/view/StudyDeskView.ts
var import_obsidian9 = require("obsidian");

// src/view/PageComponent.ts
var PageComponent = class {
  constructor(plugin) {
    this.plugin = plugin;
  }
};

// src/dashboard/aggregation.ts
function computeMastery(data) {
  const ids = /* @__PURE__ */ new Set();
  for (const n of data.knowledgeTree)
    ids.add(n.id);
  for (const f of data.flashcards)
    ids.add(f.knowledgeId);
  for (const c2 of data.checkins)
    c2.knowledgeIds.forEach((id) => ids.add(id));
  const w = data.settings.weightFlashcard;
  return [...ids].map((id) => {
    const fr = flashcardRate(data, id);
    const ca = checkinAvg(data, id);
    return {
      knowledgeId: id,
      score: combine(fr, ca, w),
      flashcardRate: fr,
      checkinAvg: ca
    };
  });
}
function flashcardRate(data, knowledgeId) {
  const cards = data.flashcards.filter(
    (c2) => c2.knowledgeId === knowledgeId && c2.reps > 0
  );
  if (cards.length === 0)
    return null;
  const totalReps = cards.reduce((s, c2) => s + c2.reps, 0);
  const totalCorrect = cards.reduce((s, c2) => s + c2.correctCount, 0);
  return totalReps > 0 ? Math.round(totalCorrect / totalReps * 100) : null;
}
function checkinAvg(data, knowledgeId) {
  const related = data.checkins.filter(
    (c2) => c2.knowledgeIds.includes(knowledgeId)
  );
  const scores = [];
  for (const c2 of related) {
    const vals = [c2.selfScore, c2.teacherScore].filter(
      (v2) => v2 !== null
    );
    if (vals.length) {
      scores.push(vals.reduce((a, b2) => a + b2, 0) / vals.length);
    }
  }
  if (scores.length === 0)
    return null;
  return Math.round(scores.reduce((a, b2) => a + b2, 0) / scores.length);
}
function combine(fr, ca, w) {
  if (fr === null && ca === null)
    return 0;
  if (fr === null)
    return ca;
  if (ca === null)
    return fr;
  return Math.round(fr * w + ca * (1 - w));
}
function averageMastery(mastery) {
  if (mastery.length === 0)
    return 0;
  return Math.round(
    mastery.reduce((s, m2) => s + m2.score, 0) / mastery.length
  );
}
function dueCardsToday(data) {
  const end = endOfToday();
  return data.flashcards.filter((f) => f.due <= end).length;
}
function checkinsThisMonth(data) {
  const now = /* @__PURE__ */ new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return data.checkins.filter((c2) => c2.date >= start).length;
}
function endOfToday() {
  const d = /* @__PURE__ */ new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// src/utils/id.ts
function genId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// src/knowledge/tree.ts
function sortByOrder(nodes) {
  return [...nodes].sort((a, b2) => a.order - b2.order);
}
function getRootNodes(nodes) {
  return sortByOrder(nodes.filter((n) => n.parentId === null));
}
function getChildren(nodes, parentId) {
  return sortByOrder(nodes.filter((n) => n.parentId === parentId));
}
function getNode(nodes, id) {
  return nodes.find((n) => n.id === id);
}
function collectSubtreeIds(nodes, id) {
  const result = /* @__PURE__ */ new Set([id]);
  const walk = (pid) => {
    for (const n of nodes) {
      if (n.parentId === pid) {
        result.add(n.id);
        walk(n.id);
      }
    }
  };
  walk(id);
  return result;
}
function addNode(nodes, parentId, title) {
  const siblings = nodes.filter((n) => n.parentId === parentId);
  const maxOrder = siblings.length ? Math.max(...siblings.map((n) => n.order)) : -1;
  const node = {
    id: genId(),
    parentId,
    title,
    order: maxOrder + 1,
    notePaths: []
  };
  return [...nodes, node];
}
function removeNode(nodes, id) {
  const ids = collectSubtreeIds(nodes, id);
  return nodes.filter((n) => !ids.has(n.id));
}
function renameNode(nodes, id, title) {
  return nodes.map((n) => n.id === id ? { ...n, title } : n);
}
function moveNode(nodes, id, newParentId) {
  if (newParentId && collectSubtreeIds(nodes, id).has(newParentId)) {
    return nodes;
  }
  const siblings = nodes.filter(
    (n) => n.parentId === newParentId && n.id !== id
  );
  const maxOrder = siblings.length ? Math.max(...siblings.map((n) => n.order)) : -1;
  return nodes.map(
    (n) => n.id === id ? { ...n, parentId: newParentId, order: maxOrder + 1 } : n
  );
}
function reorderNode(nodes, id, delta) {
  const node = getNode(nodes, id);
  if (!node)
    return nodes;
  const siblings = getChildren(nodes, node.parentId);
  const idx = siblings.findIndex((n) => n.id === id);
  const target = idx + delta;
  if (target < 0 || target >= siblings.length)
    return nodes;
  const a = siblings[idx];
  const b2 = siblings[target];
  return nodes.map(
    (n) => n.id === a.id ? { ...n, order: b2.order } : n.id === b2.id ? { ...n, order: a.order } : n
  );
}
function setNodeNotes(nodes, id, notePaths) {
  return nodes.map((n) => n.id === id ? { ...n, notePaths } : n);
}
function markdownToNodes(md) {
  var _a;
  const nodes = [];
  const stack = [];
  const orderMap = /* @__PURE__ */ new Map();
  for (const raw of md.split(/\r?\n/)) {
    const m2 = raw.match(/^(#{1,6})\s+(.+)$/);
    if (!m2)
      continue;
    const level = m2[1].length;
    const title = m2[2].replace(/\s+#+\s*$/, "").trim();
    if (!title)
      continue;
    while (stack.length && stack[stack.length - 1].level >= level) {
      stack.pop();
    }
    const parentId = stack.length ? stack[stack.length - 1].id : null;
    const parentKey = parentId != null ? parentId : "__root__";
    const order = (_a = orderMap.get(parentKey)) != null ? _a : 0;
    orderMap.set(parentKey, order + 1);
    const node = {
      id: genId(),
      parentId,
      title,
      order,
      notePaths: []
    };
    nodes.push(node);
    stack.push({ id: node.id, level });
  }
  return nodes;
}

// src/dashboard/DashboardView.ts
var DashboardPage = class extends PageComponent {
  render(container) {
    this.container = container;
    container.empty();
    container.addClass("study-desk-page");
    const mastery = computeMastery(this.plugin.data);
    const masteryMap = new Map(mastery.map((m2) => [m2.knowledgeId, m2]));
    container.createEl("h2", { text: "Dashboard" });
    container.createEl("div", {
      cls: "sd-subtitle",
      text: "\u638C\u63E1\u5EA6 = \u95EA\u5361\u6B63\u786E\u7387 + \u6253\u5361\u5747\u5206\uFF0C\u6309\u77E5\u8BC6\u7ED3\u6784\u805A\u5408"
    });
    this.renderKPIs(container, mastery);
    this.renderDomains(container, masteryMap);
    this.renderStatus(container, masteryMap);
    this.renderActivity(container);
  }
  // ===== KPI 卡 =====
  renderKPIs(container, mastery) {
    const grid = container.createDiv({ cls: "sd-kpis" });
    const data = this.plugin.data;
    this.kpi(
      grid,
      "\u603B\u77E5\u8BC6\u70B9",
      String(data.knowledgeTree.length),
      `${getRootNodes(data.knowledgeTree).length} \u4E2A\u9886\u57DF`
    );
    this.kpi(
      grid,
      "\u5E73\u5747\u638C\u63E1\u5EA6",
      `${averageMastery(mastery)}%`,
      mastery.filter((m2) => this.hasData(m2)).length + " \u4E2A\u77E5\u8BC6\u70B9\u6709\u6570\u636E"
    );
    this.kpi(grid, "\u4ECA\u65E5\u5F85\u590D\u4E60", String(dueCardsToday(data)), "\u5F20\u5361\u7247\u5230\u671F");
    this.kpi(grid, "\u672C\u6708\u6253\u5361", String(checkinsThisMonth(data)), "\u6B21\u7EC3\u4E60\u8BB0\u5F55");
  }
  kpi(grid, label, value, sub) {
    const card = grid.createDiv({ cls: "sd-kpi" });
    card.createDiv({ cls: "sd-kpi-label", text: label });
    card.createDiv({ cls: "sd-kpi-value", text: value });
    card.createDiv({ cls: "sd-kpi-sub", text: sub });
  }
  // ===== 各领域掌握度（横向条形图） =====
  renderDomains(container, masteryMap) {
    container.createEl("h3", { cls: "sd-section", text: "\u5404\u9886\u57DF\u638C\u63E1\u5EA6" });
    const roots = getRootNodes(this.plugin.data.knowledgeTree);
    if (roots.length === 0) {
      container.createEl("div", {
        cls: "sd-empty",
        text: "\u5C1A\u672A\u914D\u7F6E\u77E5\u8BC6\u7ED3\u6784\u3002\u8BF7\u5230\u300C\u77E5\u8BC6 Wiki\u300D\u521B\u5EFA\u77E5\u8BC6\u70B9\u3002"
      });
      return;
    }
    const card = container.createDiv({ cls: "sd-card" });
    for (const root of roots) {
      const ids = [
        ...collectSubtreeIds(this.plugin.data.knowledgeTree, root.id)
      ];
      const scores = ids.map((id) => masteryMap.get(id)).filter((m2) => !!m2 && this.hasData(m2)).map((m2) => m2.score);
      const avg = scores.length ? Math.round(scores.reduce((a, b2) => a + b2, 0) / scores.length) : 0;
      const row = card.createDiv({ cls: "sd-bar-row" });
      row.createSpan({ cls: "sd-bar-name", text: root.title });
      const track = row.createDiv({ cls: "sd-bar-track" });
      track.createDiv({
        cls: "sd-bar-fill " + this.scoreClass(avg),
        attr: { style: `width:${Math.min(100, avg)}%` }
      });
      row.createSpan({ cls: "sd-bar-val", text: `${avg}%` });
    }
  }
  // ===== 掌握状态分布（维度表） =====
  renderStatus(container, masteryMap) {
    container.createEl("h3", { cls: "sd-section", text: "\u638C\u63E1\u72B6\u6001\u5206\u5E03" });
    const nodes = this.plugin.data.knowledgeTree;
    const buckets = [
      { label: "\u5DF2\u638C\u63E1", cls: "sd-good", count: 0 },
      { label: "\u9700\u5DE9\u56FA", cls: "sd-mid", count: 0 },
      { label: "\u5F85\u52A0\u5F3A", cls: "sd-bad", count: 0 },
      { label: "\u5F85\u5F00\u59CB", cls: "sd-idle", count: 0 }
    ];
    for (const n of nodes) {
      const m2 = masteryMap.get(n.id);
      if (!m2 || !this.hasData(m2)) {
        buckets[3].count++;
      } else if (m2.score >= 70) {
        buckets[0].count++;
      } else if (m2.score >= 40) {
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
    ["\u72B6\u6001", "\u6570\u91CF", "\u5360\u6BD4", "\u5206\u5E03"].forEach((t) => hr.createEl("th", { text: t }));
    const tbody = table.createEl("tbody");
    for (const b2 of buckets) {
      const pct = Math.round(b2.count / total * 100);
      const tr = tbody.createEl("tr");
      const statusTd = tr.createEl("td");
      statusTd.createSpan({
        cls: b2.cls === "sd-idle" ? "sd-status-dot sd-idle" : "sd-status-dot " + b2.cls,
        text: b2.label
      });
      tr.createEl("td", { text: String(b2.count) });
      tr.createEl("td", { text: `${pct}%` });
      const barTd = tr.createEl("td", { cls: "sd-status-bar-cell" });
      const track = barTd.createDiv({ cls: "sd-bar-track" });
      track.createDiv({
        cls: "sd-bar-fill " + (b2.cls === "sd-idle" ? "" : b2.cls),
        attr: { style: `width:${pct}%` }
      });
    }
  }
  // ===== 学习活动概览（维度表） =====
  renderActivity(container) {
    container.createEl("h3", { cls: "sd-section", text: "\u5B66\u4E60\u6D3B\u52A8\u6982\u89C8" });
    const data = this.plugin.data;
    const cards = data.flashcards;
    const totalReps = cards.reduce((s, c2) => s + c2.reps, 0);
    const totalCorrect = cards.reduce((s, c2) => s + c2.correctCount, 0);
    const rate = totalReps ? Math.round(totalCorrect / totalReps * 100) + "%" : "\u2014";
    const checkins = data.checkins;
    const pending = checkins.filter((c2) => c2.status === "pending").length;
    const graded = checkins.filter((c2) => c2.status === "graded").length;
    const rows = [
      ["\u95EA\u5361 \xB7 \u5361\u7247\u603B\u6570", String(cards.length)],
      ["\u95EA\u5361 \xB7 \u4ECA\u65E5\u5F85\u590D\u4E60", String(dueCardsToday(data))],
      ["\u95EA\u5361 \xB7 \u5E73\u5747\u6B63\u786E\u7387", rate],
      ["\u6253\u5361 \xB7 \u8BB0\u5F55\u603B\u6570", String(checkins.length)],
      ["\u6253\u5361 \xB7 \u5F85\u8BC4\u5206", String(pending)],
      ["\u6253\u5361 \xB7 \u5DF2\u8BC4\u5206", String(graded)]
    ];
    const card = container.createDiv({ cls: "sd-card" });
    const table = card.createEl("table", { cls: "sd-table" });
    const thead = table.createEl("thead");
    const hr = thead.createEl("tr");
    ["\u7EF4\u5EA6", "\u6570\u503C"].forEach((t) => hr.createEl("th", { text: t }));
    const tbody = table.createEl("tbody");
    for (const [dim, val] of rows) {
      const tr = tbody.createEl("tr");
      tr.createEl("td", { text: dim });
      tr.createEl("td", { text: val });
    }
  }
  hasData(m2) {
    return m2.flashcardRate !== null || m2.checkinAvg !== null;
  }
  scoreClass(score) {
    if (score >= 70)
      return "sd-good";
    if (score >= 40)
      return "sd-mid";
    return "sd-bad";
  }
  statusText(score) {
    if (score >= 70)
      return "\u5DF2\u638C\u63E1";
    if (score >= 40)
      return "\u9700\u5DE9\u56FA";
    return "\u5F85\u52A0\u5F3A";
  }
};

// src/knowledge/KnowledgeWikiView.ts
var import_obsidian = require("obsidian");
var WikiPage = class extends PageComponent {
  constructor() {
    super(...arguments);
    this.selectedId = null;
    this.collapsed = /* @__PURE__ */ new Set();
  }
  render(container) {
    this.container = container;
    container.empty();
    container.addClass("study-desk-page");
    container.createEl("h2", { text: "\u77E5\u8BC6 Wiki" });
    container.createEl("div", {
      cls: "sd-subtitle",
      text: "\u914D\u7F6E\u77E5\u8BC6\u7ED3\u6784\u6811\uFF0C\u8282\u70B9\u5173\u8054 vault \u5185\u7684\u7B14\u8BB0"
    });
    const toolbar = container.createDiv({ cls: "sd-toolbar" });
    const btnRoot = toolbar.createEl("button", {
      cls: "mod-cta",
      text: "\u65B0\u5EFA\u77E5\u8BC6\u70B9"
    });
    btnRoot.addEventListener("click", () => this.addRoot());
    const btnChild = toolbar.createEl("button", { text: "\u65B0\u5EFA\u5B50\u8282\u70B9" });
    btnChild.addEventListener("click", () => {
      if (!this.selectedId) {
        new import_obsidian.Notice("\u8BF7\u5148\u5728\u5DE6\u4FA7\u9009\u4E2D\u4E00\u4E2A\u8282\u70B9");
        return;
      }
      this.addChildNode(this.selectedId);
    });
    const btnImport = toolbar.createEl("button", { text: "\u5BFC\u5165\u5BFC\u56FE" });
    btnImport.addEventListener("click", () => this.importIndex());
    const grid = container.createDiv({ cls: "sd-wiki-grid" });
    const treePane = grid.createDiv({ cls: "sd-wiki-tree" });
    const editPane = grid.createDiv({ cls: "sd-wiki-edit" });
    this.renderTree(treePane);
    this.renderEdit(editPane);
  }
  renderTree(pane) {
    pane.empty();
    const nodes = this.plugin.data.knowledgeTree;
    const roots = getRootNodes(nodes);
    if (roots.length === 0) {
      pane.createEl("div", {
        cls: "sd-empty",
        text: "\u8FD8\u6CA1\u6709\u77E5\u8BC6\u70B9\uFF0C\u70B9\u51FB\u300C\u65B0\u5EFA\u77E5\u8BC6\u70B9\u300D\u5F00\u59CB"
      });
      return;
    }
    const ul = pane.createEl("ul", { cls: "sd-tree" });
    this.renderLevel(ul, null);
  }
  renderLevel(ul, parentId) {
    const nodes = this.plugin.data.knowledgeTree;
    const children = getChildren(nodes, parentId);
    for (const node of children) {
      const hasChildren = getChildren(nodes, node.id).length > 0;
      const li = ul.createEl("li");
      const row = li.createDiv({
        cls: "sd-tnode" + (node.id === this.selectedId ? " is-selected" : "")
      });
      const tw = row.createSpan({ cls: "sd-tw" });
      if (hasChildren) {
        tw.textContent = this.collapsed.has(node.id) ? "\u25B8" : "\u25BE";
        tw.addEventListener("click", (e) => {
          e.stopPropagation();
          this.toggleCollapse(node.id);
          this.renderTree(this.container.querySelector(".sd-wiki-tree"));
        });
      } else {
        tw.textContent = "";
      }
      const icon = row.createSpan({ cls: "sd-ticon" });
      (0, import_obsidian.setIcon)(icon, hasChildren ? "folder" : "file-text");
      const title = row.createSpan({ cls: "sd-title", text: node.title });
      const count = row.createSpan({
        cls: "sd-count",
        text: String(this.countDescendants(node.id))
      });
      row.addEventListener("click", () => {
        this.selectedId = node.id;
        this.renderTree(this.container.querySelector(".sd-wiki-tree"));
        this.renderEdit(this.container.querySelector(".sd-wiki-edit"));
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
  countDescendants(id) {
    return collectSubtreeIds(this.plugin.data.knowledgeTree, id).size;
  }
  toggleCollapse(id) {
    if (this.collapsed.has(id))
      this.collapsed.delete(id);
    else
      this.collapsed.add(id);
  }
  renderEdit(pane) {
    pane.empty();
    const node = this.selectedId ? getNode(this.plugin.data.knowledgeTree, this.selectedId) : void 0;
    if (!node) {
      pane.createEl("div", {
        cls: "sd-empty",
        text: "\u9009\u4E2D\u5DE6\u4FA7\u8282\u70B9\u4EE5\u67E5\u770B/\u7F16\u8F91\u8BE6\u60C5"
      });
      return;
    }
    pane.createEl("h3", { text: "\u8282\u70B9\u8BE6\u60C5" });
    const titleWrap = pane.createDiv({ cls: "sd-field" });
    titleWrap.createEl("label", { text: "\u6807\u9898" });
    const titleInput = titleWrap.createEl("input", {
      attr: { type: "text", value: node.title }
    });
    const parentWrap = pane.createDiv({ cls: "sd-field" });
    parentWrap.createEl("label", { text: "\u7236\u8282\u70B9" });
    const parentSelect = parentWrap.createEl("select");
    const rootOpt = parentSelect.createEl("option", {
      text: "\uFF08\u6839\u8282\u70B9\uFF09",
      value: ""
    });
    if (node.parentId === null)
      rootOpt.selected = true;
    for (const n of this.plugin.data.knowledgeTree) {
      if (n.id === node.id)
        continue;
      const opt = parentSelect.createEl("option", {
        text: n.title,
        value: n.id
      });
      if (n.id === node.parentId)
        opt.selected = true;
    }
    const notesWrap = pane.createDiv({ cls: "sd-field" });
    notesWrap.createEl("label", { text: "\u5173\u8054\u7B14\u8BB0" });
    const notesList = notesWrap.createDiv({ cls: "sd-notes" });
    this.renderNotes(notesList, node);
    const btnNote = notesWrap.createEl("button", {
      cls: "sd-btn-add",
      text: "\u6302\u8F7D\u7B14\u8BB0"
    });
    btnNote.addEventListener("click", () => this.pickNote(node.id));
    const orderWrap = pane.createDiv({ cls: "sd-field" });
    orderWrap.createEl("label", { text: "\u540C\u7EA7\u6392\u5E8F" });
    const orderInput = orderWrap.createEl("input", {
      attr: { type: "number", value: String(node.order) }
    });
    const actions = pane.createDiv({ cls: "sd-actions" });
    const btnSave = actions.createEl("button", {
      cls: "mod-cta",
      text: "\u4FDD\u5B58"
    });
    btnSave.addEventListener("click", () => this.saveNode(node.id, {
      title: titleInput.value.trim() || node.title,
      parentId: parentSelect.value || null,
      order: Number(orderInput.value) || 0
    }));
    const btnDelete = actions.createEl("button", {
      cls: "sd-btn-danger",
      text: "\u5220\u9664\u8282\u70B9"
    });
    btnDelete.addEventListener("click", () => this.deleteNode(node.id));
  }
  renderNotes(container, node) {
    container.empty();
    if (node.notePaths.length === 0) {
      container.createEl("div", {
        cls: "sd-empty-sm",
        text: "\u6682\u65E0\u5173\u8054\u7B14\u8BB0"
      });
      return;
    }
    for (const p2 of node.notePaths) {
      const item = container.createDiv({ cls: "sd-note-item" });
      const link = item.createSpan({ cls: "sd-note-path", text: p2 });
      link.setAttribute("title", "\u70B9\u51FB\u6253\u5F00\u7B14\u8BB0");
      link.addEventListener("click", () => this.openNote(p2));
      const rm = item.createSpan({ cls: "sd-note-rm", text: "\u2715" });
      rm.addEventListener("click", async () => {
        const next = node.notePaths.filter((x2) => x2 !== p2);
        this.plugin.data.knowledgeTree = setNodeNotes(
          this.plugin.data.knowledgeTree,
          node.id,
          next
        );
        await this.plugin.persist();
        this.renderNotes(container, getNode(this.plugin.data.knowledgeTree, node.id));
      });
    }
  }
  /** 跳转到挂载的 Obsidian 笔记 */
  openNote(path) {
    const file = this.plugin.app.vault.getAbstractFileByPath(path);
    if (file instanceof import_obsidian.TFile) {
      this.plugin.app.workspace.getLeaf(true).openFile(file);
    } else {
      new import_obsidian.Notice("\u7B14\u8BB0\u4E0D\u5B58\u5728\uFF0C\u53EF\u80FD\u5DF2\u88AB\u79FB\u52A8\u6216\u5220\u9664");
    }
  }
  addRoot() {
    const title = "\u65B0\u77E5\u8BC6\u70B9";
    this.plugin.data.knowledgeTree = addNode(
      this.plugin.data.knowledgeTree,
      null,
      title
    );
    const added = this.plugin.data.knowledgeTree[this.plugin.data.knowledgeTree.length - 1];
    this.selectedId = added.id;
    this.persistAndRender();
  }
  addChildNode(parentId) {
    this.plugin.data.knowledgeTree = addNode(
      this.plugin.data.knowledgeTree,
      parentId,
      "\u65B0\u8282\u70B9"
    );
    const added = this.plugin.data.knowledgeTree[this.plugin.data.knowledgeTree.length - 1];
    this.selectedId = added.id;
    this.collapsed.delete(parentId);
    this.persistAndRender();
  }
  deleteNode(id) {
    this.plugin.data.knowledgeTree = removeNode(
      this.plugin.data.knowledgeTree,
      id
    );
    if (this.selectedId === id)
      this.selectedId = null;
    this.persistAndRender();
  }
  saveNode(id, p2) {
    let nodes = this.plugin.data.knowledgeTree;
    nodes = renameNode(nodes, id, p2.title);
    const cur = getNode(nodes, id);
    if (cur.parentId !== p2.parentId) {
      nodes = moveNode(nodes, id, p2.parentId);
    }
    nodes = nodes.map((n) => n.id === id ? { ...n, order: p2.order } : n);
    this.plugin.data.knowledgeTree = nodes;
    this.persistAndRender();
  }
  showNodeMenu(e, node) {
    const menu = new import_obsidian.Menu();
    menu.addItem(
      (item) => item.setTitle("\u65B0\u5EFA\u5B50\u8282\u70B9").setIcon("plus").onClick(() => this.addChildNode(node.id))
    );
    menu.addItem(
      (item) => item.setTitle("\u4E0A\u79FB").setIcon("arrow-up").onClick(() => {
        this.plugin.data.knowledgeTree = reorderNode(
          this.plugin.data.knowledgeTree,
          node.id,
          -1
        );
        this.persistAndRender();
      })
    );
    menu.addItem(
      (item) => item.setTitle("\u4E0B\u79FB").setIcon("arrow-down").onClick(() => {
        this.plugin.data.knowledgeTree = reorderNode(
          this.plugin.data.knowledgeTree,
          node.id,
          1
        );
        this.persistAndRender();
      })
    );
    menu.addSeparator();
    menu.addItem(
      (item) => item.setTitle("\u5220\u9664\u8282\u70B9\uFF08\u542B\u5B50\u6811\uFF09").setIcon("trash").onClick(() => this.deleteNode(node.id))
    );
    menu.showAtMouseEvent(e);
  }
  pickNote(knowledgeId) {
    new NotePickerModal(this.plugin.app, (file) => {
      const node = getNode(this.plugin.data.knowledgeTree, knowledgeId);
      if (!node)
        return;
      if (!node.notePaths.includes(file.path)) {
        this.plugin.data.knowledgeTree = setNodeNotes(
          this.plugin.data.knowledgeTree,
          knowledgeId,
          [...node.notePaths, file.path]
        );
        this.persistAndRender();
      }
    }).open();
  }
  persistAndRender() {
    this.plugin.persist();
    this.render(this.container);
  }
  /** 导入预设知识点导图（md 标题层级 → 知识树） */
  importIndex() {
    new ImportFileModal(this.plugin.app, async (file) => {
      const md = await this.plugin.app.vault.adapter.read(file.path);
      const nodes = markdownToNodes(md);
      if (nodes.length === 0) {
        new import_obsidian.Notice("\u8BE5\u6587\u4EF6\u672A\u89E3\u6790\u5230\u6807\u9898\u5C42\u7EA7\uFF08# \u6807\u9898\uFF09");
        return;
      }
      new ImportPreviewModal(this.plugin.app, file.name, nodes, (mode) => {
        if (mode === "merge") {
          this.plugin.data.knowledgeTree = [
            ...this.plugin.data.knowledgeTree,
            ...nodes
          ];
        } else {
          this.plugin.data.knowledgeTree = nodes;
        }
        this.selectedId = null;
        this.plugin.persist();
        new import_obsidian.Notice(`\u5DF2\u5BFC\u5165 ${nodes.length} \u4E2A\u77E5\u8BC6\u70B9`);
        this.render(this.container);
      }).open();
    }).open();
  }
};
var NotePickerModal = class extends import_obsidian.FuzzySuggestModal {
  constructor(app, onChoose) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder("\u641C\u7D22\u7B14\u8BB0\u2026");
  }
  getItems() {
    return this.app.vault.getMarkdownFiles();
  }
  getItemText(file) {
    return file.path;
  }
  onChooseItem(file) {
    this.onChoose(file);
  }
};
var ImportFileModal = class extends import_obsidian.FuzzySuggestModal {
  constructor(app, onChoose) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder("\u9009\u62E9\u9884\u8BBE\u77E5\u8BC6\u70B9\u5BFC\u56FE\uFF08\u5982 index.md\uFF09\u2026");
  }
  getItems() {
    return this.app.vault.getMarkdownFiles();
  }
  getItemText(file) {
    return file.path;
  }
  onChooseItem(file) {
    this.onChoose(file);
  }
};
var ImportPreviewModal = class extends import_obsidian.Modal {
  constructor(app, fileName, nodes, onConfirm) {
    super(app);
    this.fileName = fileName;
    this.nodes = nodes;
    this.onConfirm = onConfirm;
  }
  onOpen() {
    this.modalEl.addClass("sd-import-modal");
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "\u5BFC\u5165\u77E5\u8BC6\u70B9\u5BFC\u56FE" });
    contentEl.createEl("div", {
      cls: "sd-subtitle",
      text: `${this.fileName} \xB7 \u89E3\u6790\u51FA ${this.nodes.length} \u4E2A\u77E5\u8BC6\u70B9`
    });
    const preview = contentEl.createDiv({ cls: "sd-import-preview" });
    this.renderPreview(preview);
    contentEl.createEl("p", {
      cls: "sd-confirm-text",
      text: "\u5408\u5E76\u5BFC\u5165\uFF1A\u8FFD\u52A0\u4E3A\u65B0\u7684\u6839\u8282\u70B9\uFF1B\u8986\u76D6\u5BFC\u5165\uFF1A\u6E05\u7A7A\u73B0\u6709\u77E5\u8BC6\u6811\u540E\u5BFC\u5165\u3002"
    });
    const actions = contentEl.createDiv({ cls: "sd-actions" });
    const btnMerge = actions.createEl("button", {
      cls: "mod-cta",
      text: "\u5408\u5E76\u5BFC\u5165"
    });
    btnMerge.addEventListener("click", () => {
      this.onConfirm("merge");
      this.close();
    });
    const btnReplace = actions.createEl("button", { text: "\u8986\u76D6\u5BFC\u5165" });
    btnReplace.addEventListener("click", () => {
      this.onConfirm("replace");
      this.close();
    });
    actions.createEl("button", { text: "\u53D6\u6D88" }).addEventListener("click", () => this.close());
  }
  renderPreview(preview) {
    const byParent = /* @__PURE__ */ new Map();
    for (const n of this.nodes) {
      const key = n.parentId;
      if (!byParent.has(key))
        byParent.set(key, []);
      byParent.get(key).push(n);
    }
    for (const arr of byParent.values())
      arr.sort((a, b2) => a.order - b2.order);
    const walk = (parentId, depth) => {
      const children = byParent.get(parentId) || [];
      for (const c2 of children) {
        const row = preview.createDiv({ cls: "sd-import-row" });
        row.style.paddingLeft = `${depth * 16}px`;
        row.createSpan({ text: c2.title });
        walk(c2.id, depth + 1);
      }
    };
    walk(null, 0);
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/flashcard/FlashcardView.ts
var import_obsidian2 = require("obsidian");

// node_modules/ts-fsrs/dist/index.mjs
var c = ((s) => (s[s.New = 0] = "New", s[s.Learning = 1] = "Learning", s[s.Review = 2] = "Review", s[s.Relearning = 3] = "Relearning", s))(c || {});
var l = ((s) => (s[s.Manual = 0] = "Manual", s[s.Again = 1] = "Again", s[s.Hard = 2] = "Hard", s[s.Good = 3] = "Good", s[s.Easy = 4] = "Easy", s))(l || {});
var h = class _h {
  static card(t) {
    return { ...t, state: _h.state(t.state), due: _h.time(t.due), last_review: t.last_review ? _h.time(t.last_review) : void 0 };
  }
  static rating(t) {
    if (typeof t == "string") {
      const e = t.charAt(0).toUpperCase(), i = t.slice(1).toLowerCase(), r = l[`${e}${i}`];
      if (r === void 0)
        throw new Error(`Invalid rating:[${t}]`);
      return r;
    } else if (typeof t == "number")
      return t;
    throw new Error(`Invalid rating:[${t}]`);
  }
  static state(t) {
    if (typeof t == "string") {
      const e = t.charAt(0).toUpperCase(), i = t.slice(1).toLowerCase(), r = c[`${e}${i}`];
      if (r === void 0)
        throw new Error(`Invalid state:[${t}]`);
      return r;
    } else if (typeof t == "number")
      return t;
    throw new Error(`Invalid state:[${t}]`);
  }
  static time(t) {
    if (typeof t == "object" && t instanceof Date)
      return t;
    if (typeof t == "string") {
      const e = Date.parse(t);
      if (isNaN(e))
        throw new Error(`Invalid date:[${t}]`);
      return new Date(e);
    } else if (typeof t == "number")
      return new Date(t);
    throw new Error(`Invalid date:[${t}]`);
  }
  static review_log(t) {
    return { ...t, due: _h.time(t.due), rating: _h.rating(t.rating), state: _h.state(t.state), review: _h.time(t.review) };
  }
};
var X = "4.7.1";
Date.prototype.scheduler = function(s, t) {
  return F(this, s, t);
}, Date.prototype.diff = function(s, t) {
  return L(this, s, t);
}, Date.prototype.format = function() {
  return O(this);
}, Date.prototype.dueFormat = function(s, t, e) {
  return j(this, s, t, e);
};
function F(s, t, e) {
  return new Date(e ? h.time(s).getTime() + t * 24 * 60 * 60 * 1e3 : h.time(s).getTime() + t * 60 * 1e3);
}
function L(s, t, e) {
  if (!s || !t)
    throw new Error("Invalid date");
  const i = h.time(s).getTime() - h.time(t).getTime();
  let r = 0;
  switch (e) {
    case "days":
      r = Math.floor(i / (24 * 60 * 60 * 1e3));
      break;
    case "minutes":
      r = Math.floor(i / (60 * 1e3));
      break;
  }
  return r;
}
function O(s) {
  const t = h.time(s), e = t.getFullYear(), i = t.getMonth() + 1, r = t.getDate(), a = t.getHours(), n = t.getMinutes(), d = t.getSeconds();
  return `${e}-${p(i)}-${p(r)} ${p(a)}:${p(n)}:${p(d)}`;
}
function p(s) {
  return s < 10 ? `0${s}` : `${s}`;
}
var S = [60, 60, 24, 31, 12];
var E = ["second", "min", "hour", "day", "month", "year"];
function j(s, t, e, i = E) {
  s = h.time(s), t = h.time(t), i.length !== E.length && (i = E);
  let r = s.getTime() - t.getTime(), a;
  for (r /= 1e3, a = 0; a < S.length && !(r < S[a]); a++)
    r /= S[a];
  return `${Math.floor(r)}${e ? i[a] : ""}`;
}
var I = Object.freeze([l.Again, l.Hard, l.Good, l.Easy]);
var Z = [{ start: 2.5, end: 7, factor: 0.15 }, { start: 7, end: 20, factor: 0.1 }, { start: 20, end: 1 / 0, factor: 0.05 }];
function G(s, t, e) {
  let i = 1;
  for (const n of Z)
    i += n.factor * Math.max(Math.min(s, n.end) - n.start, 0);
  s = Math.min(s, e);
  let r = Math.max(2, Math.round(s - i));
  const a = Math.min(Math.round(s + i), e);
  return s > t && (r = Math.max(r, t + 1)), r = Math.min(r, a), { min_ivl: r, max_ivl: a };
}
function m(s, t, e) {
  return Math.min(Math.max(s, t), e);
}
function N(s, t) {
  const e = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()), i = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
  return Math.floor((i - e) / 864e5);
}
var k = 0.9;
var C = 36500;
var T = Object.freeze([0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 46e-4, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621]);
var U = false;
var q = true;
var tt = `v${X} using FSRS-5.0`;
var _ = 0.01;
var b = 100;
var R = Object.freeze([Object.freeze([_, b]), Object.freeze([_, b]), Object.freeze([_, b]), Object.freeze([_, b]), Object.freeze([1, 10]), Object.freeze([1e-3, 4]), Object.freeze([1e-3, 4]), Object.freeze([1e-3, 0.75]), Object.freeze([0, 4.5]), Object.freeze([0, 0.8]), Object.freeze([1e-3, 3.5]), Object.freeze([1e-3, 5]), Object.freeze([1e-3, 0.25]), Object.freeze([1e-3, 0.9]), Object.freeze([0, 4]), Object.freeze([0, 1]), Object.freeze([1, 6]), Object.freeze([0, 2]), Object.freeze([0, 2])]);
var z = (s) => {
  var _a, _b;
  let t = [...T];
  return (s == null ? void 0 : s.w) && (s.w.length === 19 ? t = [...s.w] : s.w.length === 17 && (t = s == null ? void 0 : s.w.concat([0, 0]), t[4] = +(t[5] * 2 + t[4]).toFixed(8), t[5] = +(Math.log(t[5] * 3 + 1) / 3).toFixed(8), t[6] = +(t[6] + 0.5).toFixed(8), console.debug("[FSRS V5]auto fill w to 19 length"))), t = t.map((e, i) => m(e, R[i][0], R[i][1])), { request_retention: (s == null ? void 0 : s.request_retention) || k, maximum_interval: (s == null ? void 0 : s.maximum_interval) || C, w: t, enable_fuzz: (_a = s == null ? void 0 : s.enable_fuzz) != null ? _a : U, enable_short_term: (_b = s == null ? void 0 : s.enable_short_term) != null ? _b : q };
};
function v(s, t) {
  const e = { due: s ? h.time(s) : /* @__PURE__ */ new Date(), stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, reps: 0, lapses: 0, state: c.New, last_review: void 0 };
  return t && typeof t == "function" ? t(e) : e;
}
var et = class {
  constructor(t) {
    __publicField(this, "c");
    __publicField(this, "s0");
    __publicField(this, "s1");
    __publicField(this, "s2");
    const e = it();
    this.c = 1, this.s0 = e(" "), this.s1 = e(" "), this.s2 = e(" "), t == null && (t = +/* @__PURE__ */ new Date()), this.s0 -= e(t), this.s0 < 0 && (this.s0 += 1), this.s1 -= e(t), this.s1 < 0 && (this.s1 += 1), this.s2 -= e(t), this.s2 < 0 && (this.s2 += 1);
  }
  next() {
    const t = 2091639 * this.s0 + this.c * 23283064365386963e-26;
    return this.s0 = this.s1, this.s1 = this.s2, this.s2 = t - (this.c = t | 0), this.s2;
  }
  set state(t) {
    this.c = t.c, this.s0 = t.s0, this.s1 = t.s1, this.s2 = t.s2;
  }
  get state() {
    return { c: this.c, s0: this.s0, s1: this.s1, s2: this.s2 };
  }
};
function it() {
  let s = 4022871197;
  return function(t) {
    t = String(t);
    for (let e = 0; e < t.length; e++) {
      s += t.charCodeAt(e);
      let i = 0.02519603282416938 * s;
      s = i >>> 0, i -= s, i *= s, s = i >>> 0, i -= s, s += i * 4294967296;
    }
    return (s >>> 0) * 23283064365386963e-26;
  };
}
function rt(s) {
  const t = new et(s), e = () => t.next();
  return e.int32 = () => t.next() * 4294967296 | 0, e.double = () => e() + (e() * 2097152 | 0) * 11102230246251565e-32, e.state = () => t.state, e.importState = (i) => (t.state = i, e), e;
}
var $ = -0.5;
var D = 19 / 81;
function P(s, t) {
  return +Math.pow(1 + D * s / t, $).toFixed(8);
}
var Y = class {
  constructor(t) {
    __publicField(this, "param");
    __publicField(this, "intervalModifier");
    __publicField(this, "_seed");
    __publicField(this, "forgetting_curve", P);
    this.param = new Proxy(z(t), this.params_handler_proxy()), this.intervalModifier = this.calculate_interval_modifier(this.param.request_retention);
  }
  get interval_modifier() {
    return this.intervalModifier;
  }
  set seed(t) {
    this._seed = t;
  }
  calculate_interval_modifier(t) {
    if (t <= 0 || t > 1)
      throw new Error("Requested retention rate should be in the range (0,1]");
    return +((Math.pow(t, 1 / $) - 1) / D).toFixed(8);
  }
  get parameters() {
    return this.param;
  }
  set parameters(t) {
    this.update_parameters(t);
  }
  params_handler_proxy() {
    const t = this;
    return { set: function(e, i, r) {
      return i === "request_retention" && Number.isFinite(r) && (t.intervalModifier = t.calculate_interval_modifier(Number(r))), Reflect.set(e, i, r), true;
    } };
  }
  update_parameters(t) {
    const e = z(t);
    for (const i in e)
      if (i in this.param) {
        const r = i;
        this.param[r] = e[r];
      }
  }
  init_stability(t) {
    return Math.max(this.param.w[t - 1], 0.1);
  }
  init_difficulty(t) {
    return this.constrain_difficulty(this.param.w[4] - Math.exp((t - 1) * this.param.w[5]) + 1);
  }
  apply_fuzz(t, e) {
    if (!this.param.enable_fuzz || t < 2.5)
      return Math.round(t);
    const i = rt(this._seed)(), { min_ivl: r, max_ivl: a } = G(t, e, this.param.maximum_interval);
    return Math.floor(i * (a - r + 1) + r);
  }
  next_interval(t, e) {
    const i = Math.min(Math.max(1, Math.round(t * this.intervalModifier)), this.param.maximum_interval);
    return this.apply_fuzz(i, e);
  }
  linear_damping(t, e) {
    return +(t * (10 - e) / 9).toFixed(8);
  }
  next_difficulty(t, e) {
    const i = -this.param.w[6] * (e - 3), r = t + this.linear_damping(i, t);
    return this.constrain_difficulty(this.mean_reversion(this.init_difficulty(l.Easy), r));
  }
  constrain_difficulty(t) {
    return Math.min(Math.max(+t.toFixed(8), 1), 10);
  }
  mean_reversion(t, e) {
    return +(this.param.w[7] * t + (1 - this.param.w[7]) * e).toFixed(8);
  }
  next_recall_stability(t, e, i, r) {
    const a = l.Hard === r ? this.param.w[15] : 1, n = l.Easy === r ? this.param.w[16] : 1;
    return +m(e * (1 + Math.exp(this.param.w[8]) * (11 - t) * Math.pow(e, -this.param.w[9]) * (Math.exp((1 - i) * this.param.w[10]) - 1) * a * n), _, 36500).toFixed(8);
  }
  next_forget_stability(t, e, i) {
    return +m(this.param.w[11] * Math.pow(t, -this.param.w[12]) * (Math.pow(e + 1, this.param.w[13]) - 1) * Math.exp((1 - i) * this.param.w[14]), _, 36500).toFixed(8);
  }
  next_short_term_stability(t, e) {
    return +m(t * Math.exp(this.param.w[17] * (e - 3 + this.param.w[18])), _, 36500).toFixed(8);
  }
  next_state(t, e, i) {
    const { difficulty: r, stability: a } = t != null ? t : { difficulty: 0, stability: 0 };
    if (e < 0)
      throw new Error(`Invalid delta_t "${e}"`);
    if (i < 0 || i > 4)
      throw new Error(`Invalid grade "${i}"`);
    if (r === 0 && a === 0)
      return { difficulty: this.init_difficulty(i), stability: this.init_stability(i) };
    if (i === 0)
      return { difficulty: r, stability: a };
    if (r < 1 || a < _)
      throw new Error(`Invalid memory state { difficulty: ${r}, stability: ${a} }`);
    const n = this.forgetting_curve(e, a), d = this.next_recall_stability(r, a, n, i), u = this.next_forget_stability(r, a, n), o = this.next_short_term_stability(a, i);
    let f = d;
    if (i === 1) {
      let [y, w] = [0, 0];
      this.param.enable_short_term && (y = this.param.w[17], w = this.param.w[18]);
      const g = a / Math.exp(y * w);
      f = m(+g.toFixed(8), _, u);
    }
    return e === 0 && this.param.enable_short_term && (f = o), { difficulty: this.next_difficulty(r, i), stability: f };
  }
};
function H() {
  const s = this.review_time.getTime(), t = this.current.reps, e = this.current.difficulty * this.current.stability;
  return `${s}_${t}_${e}`;
}
var x = ((s) => (s.SCHEDULER = "Scheduler", s.SEED = "Seed", s))(x || {});
var A = class {
  constructor(t, e, i, r = { seed: H }) {
    __publicField(this, "last");
    __publicField(this, "current");
    __publicField(this, "review_time");
    __publicField(this, "next", /* @__PURE__ */ new Map());
    __publicField(this, "algorithm");
    __publicField(this, "initSeedStrategy");
    this.algorithm = i, this.initSeedStrategy = r.seed.bind(this), this.last = h.card(t), this.current = h.card(t), this.review_time = h.time(e), this.init();
  }
  init() {
    const { state: t, last_review: e } = this.current;
    let i = 0;
    t !== c.New && e && (i = N(e, this.review_time)), this.current.last_review = this.review_time, this.current.elapsed_days = i, this.current.reps += 1, this.algorithm.seed = this.initSeedStrategy();
  }
  preview() {
    return { [l.Again]: this.review(l.Again), [l.Hard]: this.review(l.Hard), [l.Good]: this.review(l.Good), [l.Easy]: this.review(l.Easy), [Symbol.iterator]: this.previewIterator.bind(this) };
  }
  *previewIterator() {
    for (const t of I)
      yield this.review(t);
  }
  review(t) {
    const { state: e } = this.last;
    let i;
    switch (e) {
      case c.New:
        i = this.newState(t);
        break;
      case c.Learning:
      case c.Relearning:
        i = this.learningState(t);
        break;
      case c.Review:
        i = this.reviewState(t);
        break;
    }
    if (i)
      return i;
    throw new Error("Invalid grade");
  }
  buildLog(t) {
    const { last_review: e, due: i, elapsed_days: r } = this.last;
    return { rating: t, state: this.current.state, due: e || i, stability: this.current.stability, difficulty: this.current.difficulty, elapsed_days: this.current.elapsed_days, last_elapsed_days: r, scheduled_days: this.current.scheduled_days, review: this.review_time };
  }
};
var V = class extends A {
  newState(t) {
    const e = this.next.get(t);
    if (e)
      return e;
    const i = h.card(this.current);
    switch (i.difficulty = this.algorithm.init_difficulty(t), i.stability = this.algorithm.init_stability(t), t) {
      case l.Again:
        i.scheduled_days = 0, i.due = this.review_time.scheduler(1), i.state = c.Learning;
        break;
      case l.Hard:
        i.scheduled_days = 0, i.due = this.review_time.scheduler(5), i.state = c.Learning;
        break;
      case l.Good:
        i.scheduled_days = 0, i.due = this.review_time.scheduler(10), i.state = c.Learning;
        break;
      case l.Easy: {
        const a = this.algorithm.next_interval(i.stability, this.current.elapsed_days);
        i.scheduled_days = a, i.due = this.review_time.scheduler(a, true), i.state = c.Review;
        break;
      }
      default:
        throw new Error("Invalid grade");
    }
    const r = { card: i, log: this.buildLog(t) };
    return this.next.set(t, r), r;
  }
  learningState(t) {
    const e = this.next.get(t);
    if (e)
      return e;
    const { state: i, difficulty: r, stability: a } = this.last, n = h.card(this.current), d = this.current.elapsed_days;
    switch (n.difficulty = this.algorithm.next_difficulty(r, t), n.stability = this.algorithm.next_short_term_stability(a, t), t) {
      case l.Again: {
        n.scheduled_days = 0, n.due = this.review_time.scheduler(5, false), n.state = i;
        break;
      }
      case l.Hard: {
        n.scheduled_days = 0, n.due = this.review_time.scheduler(10), n.state = i;
        break;
      }
      case l.Good: {
        const o = this.algorithm.next_interval(n.stability, d);
        n.scheduled_days = o, n.due = this.review_time.scheduler(o, true), n.state = c.Review;
        break;
      }
      case l.Easy: {
        const o = this.algorithm.next_short_term_stability(a, l.Good), f = this.algorithm.next_interval(o, d), y = Math.max(this.algorithm.next_interval(n.stability, d), f + 1);
        n.scheduled_days = y, n.due = this.review_time.scheduler(y, true), n.state = c.Review;
        break;
      }
      default:
        throw new Error("Invalid grade");
    }
    const u = { card: n, log: this.buildLog(t) };
    return this.next.set(t, u), u;
  }
  reviewState(t) {
    const e = this.next.get(t);
    if (e)
      return e;
    const i = this.current.elapsed_days, { difficulty: r, stability: a } = this.last, n = this.algorithm.forgetting_curve(i, a), d = h.card(this.current), u = h.card(this.current), o = h.card(this.current), f = h.card(this.current);
    this.next_ds(d, u, o, f, r, a, n), this.next_interval(d, u, o, f, i), this.next_state(d, u, o, f), d.lapses += 1;
    const y = { card: d, log: this.buildLog(l.Again) }, w = { card: u, log: super.buildLog(l.Hard) }, g = { card: o, log: super.buildLog(l.Good) }, M = { card: f, log: super.buildLog(l.Easy) };
    return this.next.set(l.Again, y), this.next.set(l.Hard, w), this.next.set(l.Good, g), this.next.set(l.Easy, M), this.next.get(t);
  }
  next_ds(t, e, i, r, a, n, d) {
    t.difficulty = this.algorithm.next_difficulty(a, l.Again);
    const u = n / Math.exp(this.algorithm.parameters.w[17] * this.algorithm.parameters.w[18]), o = this.algorithm.next_forget_stability(a, n, d);
    t.stability = m(+u.toFixed(8), _, o), e.difficulty = this.algorithm.next_difficulty(a, l.Hard), e.stability = this.algorithm.next_recall_stability(a, n, d, l.Hard), i.difficulty = this.algorithm.next_difficulty(a, l.Good), i.stability = this.algorithm.next_recall_stability(a, n, d, l.Good), r.difficulty = this.algorithm.next_difficulty(a, l.Easy), r.stability = this.algorithm.next_recall_stability(a, n, d, l.Easy);
  }
  next_interval(t, e, i, r, a) {
    let n, d;
    n = this.algorithm.next_interval(e.stability, a), d = this.algorithm.next_interval(i.stability, a), n = Math.min(n, d), d = Math.max(d, n + 1);
    const u = Math.max(this.algorithm.next_interval(r.stability, a), d + 1);
    t.scheduled_days = 0, t.due = this.review_time.scheduler(5), e.scheduled_days = n, e.due = this.review_time.scheduler(n, true), i.scheduled_days = d, i.due = this.review_time.scheduler(d, true), r.scheduled_days = u, r.due = this.review_time.scheduler(u, true);
  }
  next_state(t, e, i, r) {
    t.state = c.Relearning, e.state = c.Review, i.state = c.Review, r.state = c.Review;
  }
};
var B = class extends A {
  newState(t) {
    const e = this.next.get(t);
    if (e)
      return e;
    this.current.scheduled_days = 0, this.current.elapsed_days = 0;
    const i = h.card(this.current), r = h.card(this.current), a = h.card(this.current), n = h.card(this.current);
    return this.init_ds(i, r, a, n), this.next_interval(i, r, a, n, 0), this.next_state(i, r, a, n), this.update_next(i, r, a, n), this.next.get(t);
  }
  init_ds(t, e, i, r) {
    t.difficulty = this.algorithm.init_difficulty(l.Again), t.stability = this.algorithm.init_stability(l.Again), e.difficulty = this.algorithm.init_difficulty(l.Hard), e.stability = this.algorithm.init_stability(l.Hard), i.difficulty = this.algorithm.init_difficulty(l.Good), i.stability = this.algorithm.init_stability(l.Good), r.difficulty = this.algorithm.init_difficulty(l.Easy), r.stability = this.algorithm.init_stability(l.Easy);
  }
  learningState(t) {
    return this.reviewState(t);
  }
  reviewState(t) {
    const e = this.next.get(t);
    if (e)
      return e;
    const i = this.current.elapsed_days, { difficulty: r, stability: a } = this.last, n = this.algorithm.forgetting_curve(i, a), d = h.card(this.current), u = h.card(this.current), o = h.card(this.current), f = h.card(this.current);
    return this.next_ds(d, u, o, f, r, a, n), this.next_interval(d, u, o, f, i), this.next_state(d, u, o, f), d.lapses += 1, this.update_next(d, u, o, f), this.next.get(t);
  }
  next_ds(t, e, i, r, a, n, d) {
    t.difficulty = this.algorithm.next_difficulty(a, l.Again);
    const u = this.algorithm.next_forget_stability(a, n, d);
    t.stability = m(n, _, u), e.difficulty = this.algorithm.next_difficulty(a, l.Hard), e.stability = this.algorithm.next_recall_stability(a, n, d, l.Hard), i.difficulty = this.algorithm.next_difficulty(a, l.Good), i.stability = this.algorithm.next_recall_stability(a, n, d, l.Good), r.difficulty = this.algorithm.next_difficulty(a, l.Easy), r.stability = this.algorithm.next_recall_stability(a, n, d, l.Easy);
  }
  next_interval(t, e, i, r, a) {
    let n, d, u, o;
    n = this.algorithm.next_interval(t.stability, a), d = this.algorithm.next_interval(e.stability, a), u = this.algorithm.next_interval(i.stability, a), o = this.algorithm.next_interval(r.stability, a), n = Math.min(n, d), d = Math.max(d, n + 1), u = Math.max(u, d + 1), o = Math.max(o, u + 1), t.scheduled_days = n, t.due = this.review_time.scheduler(n, true), e.scheduled_days = d, e.due = this.review_time.scheduler(d, true), i.scheduled_days = u, i.due = this.review_time.scheduler(u, true), r.scheduled_days = o, r.due = this.review_time.scheduler(o, true);
  }
  next_state(t, e, i, r) {
    t.state = c.Review, e.state = c.Review, i.state = c.Review, r.state = c.Review;
  }
  update_next(t, e, i, r) {
    const a = { card: t, log: this.buildLog(l.Again) }, n = { card: e, log: super.buildLog(l.Hard) }, d = { card: i, log: super.buildLog(l.Good) }, u = { card: r, log: super.buildLog(l.Easy) };
    this.next.set(l.Again, a), this.next.set(l.Hard, n), this.next.set(l.Good, d), this.next.set(l.Easy, u);
  }
};
var st = class {
  constructor(t) {
    __publicField(this, "fsrs");
    this.fsrs = t;
  }
  replay(t, e, i) {
    return this.fsrs.next(t, e, i);
  }
  handleManualRating(t, e, i, r, a, n, d) {
    if (typeof e > "u")
      throw new Error("reschedule: state is required for manual rating");
    let u, o;
    if (e === c.New)
      u = { rating: l.Manual, state: e, due: d != null ? d : i, stability: t.stability, difficulty: t.difficulty, elapsed_days: r, last_elapsed_days: t.elapsed_days, scheduled_days: t.scheduled_days, review: i }, o = v(i), o.last_review = i;
    else {
      if (typeof d > "u")
        throw new Error("reschedule: due is required for manual rating");
      const f = d.diff(i, "days");
      u = { rating: l.Manual, state: t.state, due: t.last_review || t.due, stability: t.stability, difficulty: t.difficulty, elapsed_days: r, last_elapsed_days: t.elapsed_days, scheduled_days: t.scheduled_days, review: i }, o = { ...t, state: e, due: d, last_review: i, stability: a || t.stability, difficulty: n || t.difficulty, elapsed_days: r, scheduled_days: f, reps: t.reps + 1 };
    }
    return { card: o, log: u };
  }
  reschedule(t, e) {
    const i = [];
    let r = v(t.due);
    for (const a of e) {
      let n;
      if (a.review = h.time(a.review), a.rating === l.Manual) {
        let d = 0;
        r.state !== c.New && r.last_review && (d = a.review.diff(r.last_review, "days")), n = this.handleManualRating(r, a.state, a.review, d, a.stability, a.difficulty, a.due ? h.time(a.due) : void 0);
      } else
        n = this.replay(r, a.review, a.rating);
      i.push(n), r = n.card;
    }
    return i;
  }
  calculateManualRecord(t, e, i, r) {
    if (!i)
      return null;
    const { card: a, log: n } = i, d = h.card(t);
    return d.due.getTime() === a.due.getTime() ? null : (d.scheduled_days = a.due.diff(d.due, "days"), this.handleManualRating(d, a.state, h.time(e), n.elapsed_days, r ? a.stability : void 0, r ? a.difficulty : void 0, a.due));
  }
};
var W = class extends Y {
  constructor(t) {
    super(t);
    __publicField(this, "strategyHandler", /* @__PURE__ */ new Map());
    __publicField(this, "Scheduler");
    const { enable_short_term: e } = this.parameters;
    this.Scheduler = e ? V : B;
  }
  params_handler_proxy() {
    const t = this;
    return { set: function(e, i, r) {
      return i === "request_retention" && Number.isFinite(r) ? t.intervalModifier = t.calculate_interval_modifier(Number(r)) : i === "enable_short_term" && (t.Scheduler = r === true ? V : B), Reflect.set(e, i, r), true;
    } };
  }
  useStrategy(t, e) {
    return this.strategyHandler.set(t, e), this;
  }
  clearStrategy(t) {
    return t ? this.strategyHandler.delete(t) : this.strategyHandler.clear(), this;
  }
  getScheduler(t, e) {
    const i = this.strategyHandler.get(x.SEED), r = this.strategyHandler.get(x.SCHEDULER) || this.Scheduler, a = i || H;
    return new r(t, e, this, { seed: a });
  }
  repeat(t, e, i) {
    const r = this.getScheduler(t, e).preview();
    return i && typeof i == "function" ? i(r) : r;
  }
  next(t, e, i, r) {
    const a = this.getScheduler(t, e), n = h.rating(i);
    if (n === l.Manual)
      throw new Error("Cannot review a manual rating");
    const d = a.review(n);
    return r && typeof r == "function" ? r(d) : d;
  }
  get_retrievability(t, e, i = true) {
    const r = h.card(t);
    e = e ? h.time(e) : /* @__PURE__ */ new Date();
    const a = r.state !== c.New ? Math.max(e.diff(r.last_review, "days"), 0) : 0, n = r.state !== c.New ? this.forgetting_curve(a, +r.stability.toFixed(8)) : 0;
    return i ? `${(n * 100).toFixed(2)}%` : n;
  }
  rollback(t, e, i) {
    const r = h.card(t), a = h.review_log(e);
    if (a.rating === l.Manual)
      throw new Error("Cannot rollback a manual rating");
    let n, d, u;
    switch (a.state) {
      case c.New:
        n = a.due, d = void 0, u = 0;
        break;
      case c.Learning:
      case c.Relearning:
      case c.Review:
        n = a.review, d = a.due, u = r.lapses - (a.rating === l.Again && a.state === c.Review ? 1 : 0);
        break;
    }
    const o = { ...r, due: n, stability: a.stability, difficulty: a.difficulty, elapsed_days: a.last_elapsed_days, scheduled_days: a.scheduled_days, reps: Math.max(0, r.reps - 1), lapses: Math.max(0, u), state: a.state, last_review: d };
    return i && typeof i == "function" ? i(o) : o;
  }
  forget(t, e, i = false, r) {
    const a = h.card(t);
    e = h.time(e);
    const n = a.state === c.New ? 0 : e.diff(a.last_review, "days"), d = { rating: l.Manual, state: a.state, due: a.due, stability: a.stability, difficulty: a.difficulty, elapsed_days: 0, last_elapsed_days: a.elapsed_days, scheduled_days: n, review: e }, u = { card: { ...a, due: e, stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0, reps: i ? 0 : a.reps, lapses: i ? 0 : a.lapses, state: c.New, last_review: a.last_review }, log: d };
    return r && typeof r == "function" ? r(u) : u;
  }
  reschedule(t, e = [], i = {}) {
    const { recordLogHandler: r, reviewsOrderBy: a, skipManual: n = true, now: d = /* @__PURE__ */ new Date(), update_memory_state: u = false } = i;
    a && typeof a == "function" && e.sort(a), n && (e = e.filter((M) => M.rating !== l.Manual));
    const o = new st(this), f = o.reschedule(i.first_card || v(), e), y = f.length, w = h.card(t), g = o.calculateManualRecord(w, d, y ? f[y - 1] : void 0, u);
    return r && typeof r == "function" ? { collections: f.map(r), reschedule_item: g ? r(g) : null } : { collections: f, reschedule_item: g };
  }
};
var nt = (s) => new W(s || {});

// src/flashcard/scheduler.ts
var _f = null;
function getFSRS() {
  if (!_f) {
    _f = nt(z());
  }
  return _f;
}
function toFsrsCard(fc) {
  return {
    due: new Date(fc.due),
    stability: fc.stability,
    difficulty: fc.difficulty,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: fc.reps,
    lapses: 0,
    state: mapState(fc.state),
    last_review: fc.lastReview ? new Date(fc.lastReview) : void 0
  };
}
function mapState(state) {
  switch (state) {
    case "new":
      return c.New;
    case "learning":
      return c.Learning;
    case "review":
      return c.Review;
    case "relearning":
      return c.Relearning;
  }
}
function unmapState(state) {
  switch (state) {
    case c.New:
      return "new";
    case c.Learning:
      return "learning";
    case c.Review:
      return "review";
    case c.Relearning:
      return "relearning";
  }
}
function createNewCard(knowledgeId, front, back, tags = []) {
  const empty = v();
  return {
    id: genId(),
    knowledgeId,
    front,
    back,
    tags,
    state: "new",
    stability: empty.stability,
    difficulty: empty.difficulty,
    due: empty.due.getTime(),
    lastReview: null,
    reps: 0,
    correctCount: 0
  };
}
function grade(fc, rating, now = /* @__PURE__ */ new Date()) {
  const f = getFSRS();
  const recordLog = f.repeat(toFsrsCard(fc), now);
  const item = recordLog[rating];
  const updated = item.card;
  const correct = rating === 3 || rating === 4;
  return {
    card: {
      ...fc,
      state: unmapState(updated.state),
      stability: updated.stability,
      difficulty: updated.difficulty,
      due: updated.due.getTime(),
      lastReview: now.getTime(),
      reps: updated.reps,
      correctCount: fc.correctCount + (correct ? 1 : 0)
    },
    correct
  };
}

// src/flashcard/FlashcardView.ts
var FlashcardPage = class extends PageComponent {
  constructor() {
    super(...arguments);
    this.revealed = false;
    this.queue = [];
  }
  getDueCards() {
    const now = Date.now();
    return this.plugin.data.flashcards.filter((f) => f.due <= now).sort((a, b2) => a.due - b2.due);
  }
  render(container) {
    this.container = container;
    container.empty();
    container.addClass("study-desk-page");
    this.queue = this.getDueCards();
    container.createEl("h2", { text: "\u95EA\u5361\u590D\u4E60" });
    container.createEl("div", {
      cls: "sd-subtitle",
      text: "\u57FA\u4E8E FSRS \u95F4\u9694\u91CD\u590D\u7B97\u6CD5"
    });
    this.renderKPIs(container);
    const grid = container.createDiv({ cls: "sd-flash-grid" });
    this.renderReview(grid.createDiv({ cls: "sd-flash-review" }));
    this.renderManage(grid.createDiv({ cls: "sd-flash-manage" }));
  }
  renderKPIs(container) {
    const data = this.plugin.data;
    const grid = container.createDiv({ cls: "sd-kpis sd-kpis-3" });
    this.kpi(grid, "\u4ECA\u65E5\u5F85\u590D\u4E60", String(this.queue.length), "\u5F20\u5361\u7247");
    this.kpi(
      grid,
      "\u65B0\u5361",
      String(data.flashcards.filter((f) => f.state === "new").length),
      "\u5C1A\u672A\u5B66\u4E60"
    );
    this.kpi(grid, "\u7D2F\u8BA1\u5361\u7247", String(data.flashcards.length), "\u5F20");
  }
  kpi(grid, label, value, sub) {
    const card = grid.createDiv({ cls: "sd-kpi" });
    card.createDiv({ cls: "sd-kpi-label", text: label });
    card.createDiv({ cls: "sd-kpi-value", text: value });
    card.createDiv({ cls: "sd-kpi-sub", text: sub });
  }
  // ===== 复习区 =====
  renderReview(pane) {
    pane.empty();
    const current = this.queue[0];
    if (!current) {
      pane.createEl("div", {
        cls: "sd-empty",
        text: "\u4ECA\u65E5\u590D\u4E60\u5B8C\u6210 \u{1F389}\n\u6682\u65E0\u5230\u671F\u5361\u7247"
      });
      return;
    }
    const node = getNode(this.plugin.data.knowledgeTree, current.knowledgeId);
    const cardEl = pane.createDiv({ cls: "sd-flashcard" });
    const tag = cardEl.createDiv({ cls: "sd-flash-tag" });
    tag.setText(node ? node.title : "\u672A\u5173\u8054\u77E5\u8BC6\u70B9");
    const body = cardEl.createDiv({ cls: "sd-flash-body" });
    body.setText(this.revealed ? current.back : current.front);
    const hint = cardEl.createDiv({
      cls: "sd-flash-hint",
      text: this.revealed ? "" : "\u70B9\u51FB\u7FFB\u9762"
    });
    cardEl.addEventListener("click", () => {
      this.revealed = !this.revealed;
      this.renderReview(pane);
    });
    const rateRow = pane.createDiv({ cls: "sd-rate-row" });
    const opts = [
      { label: "Again", key: "\u91CD\u6765", rating: l.Again, cls: "sd-ra" },
      { label: "Hard", key: "\u56F0\u96BE", rating: l.Hard, cls: "sd-rh" },
      { label: "Good", key: "\u826F\u597D", rating: l.Good, cls: "sd-rg" },
      { label: "Easy", key: "\u7B80\u5355", rating: l.Easy, cls: "sd-re" }
    ];
    for (const o of opts) {
      const btn = rateRow.createEl("button", { cls: "sd-rate-btn " + o.cls });
      btn.createDiv({ cls: "sd-rate-label", text: o.label });
      btn.createDiv({ cls: "sd-rate-key", text: o.key });
      btn.addEventListener("click", () => this.rate(o.rating));
    }
    const prog = pane.createDiv({ cls: "sd-flash-prog" });
    prog.setText(`\u961F\u5217 ${this.queue.length} \u5F20 \xB7 \u5F53\u524D\u7B2C 1 \u5F20`);
  }
  rate(rating) {
    const current = this.queue[0];
    if (!current)
      return;
    const result = grade(current, rating);
    this.plugin.data.flashcards = this.plugin.data.flashcards.map(
      (f) => f.id === current.id ? result.card : f
    );
    this.plugin.persist();
    this.revealed = false;
    this.render(this.container);
  }
  // ===== 卡片管理 =====
  renderManage(pane) {
    pane.empty();
    const head = pane.createDiv({ cls: "sd-list-head" });
    head.createEl("h3", { text: "\u5361\u7247\u7BA1\u7406" });
    const btnNew = head.createEl("button", { cls: "mod-cta", text: "\u65B0\u5EFA\u5361\u7247" });
    btnNew.addEventListener("click", () => this.newCard());
    const list = pane.createDiv({ cls: "sd-card-list" });
    const cards = this.plugin.data.flashcards;
    if (cards.length === 0) {
      list.createEl("div", { cls: "sd-empty", text: "\u8FD8\u6CA1\u6709\u5361\u7247" });
      return;
    }
    for (const c2 of cards) {
      const item = list.createDiv({ cls: "sd-card-item" });
      const node = getNode(this.plugin.data.knowledgeTree, c2.knowledgeId);
      item.createDiv({ cls: "sd-card-front", text: c2.front });
      item.createDiv({
        cls: "sd-card-meta",
        text: `${node ? node.title : "\u672A\u5173\u8054"} \xB7 ${this.stateLabel(c2.state)} \xB7 \u590D\u4E60 ${c2.reps} \u6B21`
      });
      const del = item.createSpan({ cls: "sd-card-del", text: "\u2715" });
      del.addEventListener("click", () => {
        this.plugin.data.flashcards = this.plugin.data.flashcards.filter(
          (f) => f.id !== c2.id
        );
        this.plugin.persist();
        this.render(this.container);
      });
    }
  }
  stateLabel(state) {
    const map = {
      new: "\u65B0\u5361",
      learning: "\u5B66\u4E60\u4E2D",
      review: "\u590D\u4E60\u4E2D",
      relearning: "\u91CD\u5B66\u4E2D"
    };
    return map[state] || state;
  }
  newCard() {
    if (this.plugin.data.knowledgeTree.length === 0) {
      new import_obsidian2.Notice("\u8BF7\u5148\u5728\u300C\u77E5\u8BC6 Wiki\u300D\u521B\u5EFA\u77E5\u8BC6\u70B9");
      return;
    }
    new CardEditModal(this.plugin.app, this.plugin, (fc) => {
      this.plugin.data.flashcards.push(fc);
      this.plugin.persist();
      this.render(this.container);
    }).open();
  }
};
var CardEditModal = class extends import_obsidian2.Modal {
  constructor(app, plugin, onSave) {
    super(app);
    this.plugin = plugin;
    this.onSave = onSave;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "\u65B0\u5EFA\u5361\u7247" });
    const f1 = contentEl.createDiv({ cls: "sd-field" });
    f1.createEl("label", { text: "\u77E5\u8BC6\u70B9" });
    const select = f1.createEl("select");
    this.fillKnowledgeOptions(select, null, 0);
    const f2 = contentEl.createDiv({ cls: "sd-field" });
    f2.createEl("label", { text: "\u6B63\u9762\uFF08\u95EE\u9898\uFF09" });
    const frontInput = f2.createEl("textarea", {
      attr: { rows: "2", placeholder: "\u5982\uFF1AC \u5927\u8C03\u7684\u8C03\u53F7\u662F\u4EC0\u4E48\uFF1F" }
    });
    const f3 = contentEl.createDiv({ cls: "sd-field" });
    f3.createEl("label", { text: "\u80CC\u9762\uFF08\u7B54\u6848\uFF09" });
    const backInput = f3.createEl("textarea", {
      attr: { rows: "2", placeholder: "\u5982\uFF1A\u65E0\u5347\u964D\u53F7" }
    });
    const f4 = contentEl.createDiv({ cls: "sd-field" });
    f4.createEl("label", { text: "\u6807\u7B7E\uFF08\u9017\u53F7\u5206\u9694\uFF0C\u53EF\u9009\uFF09" });
    const tagsInput = f4.createEl("input", {
      attr: { type: "text", placeholder: "\u5982\uFF1A\u4E50\u7406,\u8C03\u53F7" }
    });
    const actions = contentEl.createDiv({ cls: "sd-actions" });
    const ok = actions.createEl("button", { cls: "mod-cta", text: "\u4FDD\u5B58" });
    ok.addEventListener("click", () => {
      const front = frontInput.value.trim();
      const back = backInput.value.trim();
      if (!front || !back) {
        new import_obsidian2.Notice("\u8BF7\u586B\u5199\u6B63\u9762\u548C\u80CC\u9762");
        return;
      }
      const tags = tagsInput.value.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
      const fc = createNewCard(select.value, front, back, tags);
      this.onSave(fc);
      this.close();
    });
    actions.createEl("button", { text: "\u53D6\u6D88" }).addEventListener("click", () => this.close());
  }
  fillKnowledgeOptions(select, parentId, depth) {
    const nodes = this.plugin.data.knowledgeTree.filter((n) => n.parentId === parentId).sort((a, b2) => a.order - b2.order);
    for (const n of nodes) {
      select.createEl("option", {
        text: "\u3000".repeat(depth) + n.title,
        value: n.id
      });
      this.fillKnowledgeOptions(select, n.id, depth + 1);
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/checkin/CheckinView.ts
var import_obsidian3 = require("obsidian");
var VIDEO_EXT = ["mp4", "webm", "mov", "m4v", "mkv"];
var CheckinPage = class extends PageComponent {
  constructor() {
    super(...arguments);
    // 表单临时状态
    this.selectedKnowledgeIds = [];
    this.videoPath = null;
    this.selfScore = "";
    this.note = "";
  }
  render(container) {
    this.container = container;
    container.empty();
    container.addClass("study-desk-page");
    container.createEl("h2", { text: "\u7EC3\u4E60\u6253\u5361" });
    container.createEl("div", {
      cls: "sd-subtitle",
      text: "\u8BB0\u5F55\u7EC3\u4E60 \xB7 \u53EF\u9644\u89C6\u9891 \xB7 \u81EA\u8BC4 / \u56DE\u586B\u8001\u5E08\u8BC4\u5206"
    });
    const grid = container.createDiv({ cls: "sd-checkin-grid" });
    this.renderForm(grid.createDiv({ cls: "sd-checkin-form" }));
    this.renderList(grid.createDiv({ cls: "sd-checkin-list" }));
  }
  // ===== 左侧：新建表单 =====
  renderForm(pane) {
    pane.empty();
    pane.createEl("h3", { text: "\u65B0\u5EFA\u6253\u5361" });
    const kField = pane.createDiv({ cls: "sd-field" });
    kField.createEl("label", { text: "\u5173\u8054\u77E5\u8BC6\u70B9\uFF08\u53EF\u591A\u9009\uFF09" });
    const kBox = kField.createDiv({ cls: "sd-pills" });
    this.renderPills(kBox);
    const btnPick = kField.createEl("button", {
      text: this.selectedKnowledgeIds.length ? "\u8C03\u6574\u9009\u62E9" : "\u9009\u62E9\u77E5\u8BC6\u70B9"
    });
    btnPick.addEventListener("click", () => this.pickKnowledge());
    const vField = pane.createDiv({ cls: "sd-field" });
    vField.createEl("label", { text: "\u7EC3\u4E60\u89C6\u9891\uFF08\u53EF\u9009\uFF09" });
    const vBox = vField.createDiv({ cls: "sd-video-box" });
    const btnVideo = vBox.createEl("button", { text: "\u9009\u62E9\u89C6\u9891" });
    btnVideo.addEventListener("click", () => this.pickVideo());
    const vInfo = vBox.createSpan({
      cls: "sd-video-info",
      text: this.videoPath || "\u672A\u9009\u62E9\u6587\u4EF6"
    });
    if (this.videoPath) {
      const btnClear = vBox.createEl("button", { text: "\u6E05\u9664" });
      btnClear.addEventListener("click", () => {
        this.videoPath = null;
        this.renderForm(pane);
      });
    }
    const sField = pane.createDiv({ cls: "sd-field" });
    sField.createEl("label", { text: "\u81EA\u8BC4\u5206\u6570\uFF080-100\uFF0C\u53EF\u7559\u7A7A\uFF09" });
    const sInput = sField.createEl("input", {
      attr: { type: "number", min: "0", max: "100", placeholder: "\u5982 85" }
    });
    sInput.value = this.selfScore;
    sInput.addEventListener("input", () => {
      this.selfScore = sInput.value;
    });
    const nField = pane.createDiv({ cls: "sd-field" });
    nField.createEl("label", { text: "\u5907\u6CE8" });
    const nArea = nField.createEl("textarea", {
      attr: { placeholder: "\u4ECA\u5929\u7684\u7EC3\u4E60\u611F\u53D7\u3001\u9047\u5230\u96BE\u70B9\u2026" }
    });
    nArea.value = this.note;
    nArea.addEventListener("input", () => {
      this.note = nArea.value;
    });
    const btnSubmit = pane.createEl("button", {
      cls: "mod-cta",
      text: "\u63D0\u4EA4\u6253\u5361"
    });
    btnSubmit.addEventListener("click", () => this.submit());
  }
  renderPills(container) {
    container.empty();
    if (this.selectedKnowledgeIds.length === 0) {
      container.createEl("div", {
        cls: "sd-empty-sm",
        text: "\u672A\u9009\u62E9\u77E5\u8BC6\u70B9"
      });
      return;
    }
    for (const id of this.selectedKnowledgeIds) {
      const node = getNode(this.plugin.data.knowledgeTree, id);
      const pill = container.createSpan({
        cls: "sd-pill",
        text: (node ? node.title : "\u5DF2\u5220\u9664") + " \u2715"
      });
      pill.addEventListener("click", () => {
        this.selectedKnowledgeIds = this.selectedKnowledgeIds.filter(
          (x2) => x2 !== id
        );
        this.renderForm(this.container.querySelector(".sd-checkin-form"));
      });
    }
  }
  submit() {
    if (this.selectedKnowledgeIds.length === 0) {
      new import_obsidian3.Notice("\u8BF7\u81F3\u5C11\u9009\u62E9\u4E00\u4E2A\u77E5\u8BC6\u70B9");
      return;
    }
    const record = {
      id: genId(),
      knowledgeIds: [...this.selectedKnowledgeIds],
      date: Date.now(),
      videoPath: this.videoPath || void 0,
      status: "pending",
      selfScore: this.selfScore === "" ? null : Number(this.selfScore),
      teacherScore: null,
      note: this.note || void 0
    };
    this.plugin.data.checkins.unshift(record);
    this.selectedKnowledgeIds = [];
    this.videoPath = null;
    this.selfScore = "";
    this.note = "";
    this.plugin.persist();
    new import_obsidian3.Notice("\u6253\u5361\u5DF2\u63D0\u4EA4");
    this.render(this.container);
  }
  // ===== 右侧：记录列表 =====
  renderList(pane) {
    pane.empty();
    const head = pane.createDiv({ cls: "sd-list-head" });
    head.createEl("h3", { text: "\u6253\u5361\u8BB0\u5F55" });
    head.createEl("span", {
      cls: "sd-count",
      text: `\u5171 ${this.plugin.data.checkins.length} \u6761`
    });
    const list = pane.createDiv({ cls: "sd-ck-list" });
    if (this.plugin.data.checkins.length === 0) {
      list.createEl("div", {
        cls: "sd-empty",
        text: "\u8FD8\u6CA1\u6709\u6253\u5361\u8BB0\u5F55"
      });
      return;
    }
    for (const rec of this.plugin.data.checkins) {
      list.appendChild(this.renderRecord(rec));
    }
  }
  renderRecord(rec) {
    const item = document.createElement("div");
    item.className = "sd-ck-item";
    const info = item.createDiv({ cls: "sd-ck-info" });
    info.createDiv({
      cls: "sd-ck-title",
      text: this.knowledgeLabel(rec.knowledgeIds)
    });
    info.createDiv({
      cls: "sd-ck-meta",
      text: this.formatDate(rec.date) + (rec.videoPath ? " \xB7 \u{1F3A5} \u89C6\u9891" : "")
    });
    const right = item.createDiv({ cls: "sd-ck-right" });
    if (rec.status === "pending") {
      if (rec.selfScore !== null) {
        right.createSpan({
          cls: "sd-score",
          text: `\u81EA\u8BC4 ${rec.selfScore}`
        });
      }
      const btnGrade = right.createEl("button", {
        cls: "sd-btn-grade",
        text: "\u56DE\u586B\u8001\u5E08\u5206"
      });
      btnGrade.addEventListener("click", () => this.gradeModal(rec));
      right.createSpan({ cls: "sd-pill-warn", text: "\u5F85\u8BC4\u5206" });
    } else {
      right.createSpan({
        cls: "sd-score",
        text: `\u8001\u5E08 ${rec.teacherScore}`
      });
      right.createSpan({ cls: "sd-pill-ok", text: "\u5DF2\u8BC4\u5206" });
    }
    const btnDel = right.createEl("button", {
      cls: "sd-btn-del",
      text: "\u5220\u9664"
    });
    btnDel.addEventListener("click", () => {
      this.plugin.data.checkins = this.plugin.data.checkins.filter(
        (x2) => x2.id !== rec.id
      );
      this.plugin.persist();
      this.render(this.container);
    });
    return item;
  }
  knowledgeLabel(ids) {
    const names = ids.map((id) => {
      var _a;
      return (_a = getNode(this.plugin.data.knowledgeTree, id)) == null ? void 0 : _a.title;
    }).filter(Boolean);
    return names.length ? names.join("\u3001") : "\u672A\u5173\u8054\u77E5\u8BC6\u70B9";
  }
  formatDate(ts) {
    const d = new Date(ts);
    const p2 = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  }
  // ===== 弹窗 =====
  pickKnowledge() {
    new KnowledgePickerModal(this.plugin.app, this.plugin.data.knowledgeTree, this.selectedKnowledgeIds, (ids) => {
      this.selectedKnowledgeIds = ids;
      this.renderForm(this.container.querySelector(".sd-checkin-form"));
    }).open();
  }
  pickVideo() {
    new VideoPickerModal(this.plugin.app, (file) => {
      this.videoPath = file.path;
      this.renderForm(this.container.querySelector(".sd-checkin-form"));
    }).open();
  }
  gradeModal(rec) {
    new GradeModal(this.plugin.app, rec, (score, comment) => {
      rec.teacherScore = score;
      rec.teacherComment = comment || void 0;
      rec.status = "graded";
      this.plugin.persist();
      this.render(this.container);
    }).open();
  }
};
var KnowledgePickerModal = class extends import_obsidian3.Modal {
  constructor(app, tree, selected, onDone) {
    super(app);
    this.tree = tree;
    this.selected = selected;
    this.onDone = onDone;
    this.picked = new Set(selected);
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "\u9009\u62E9\u77E5\u8BC6\u70B9" });
    const box = contentEl.createDiv({ cls: "sd-picker" });
    this.renderLevel(box, null, 0);
    const actions = contentEl.createDiv({ cls: "sd-actions" });
    const ok = actions.createEl("button", { cls: "mod-cta", text: "\u786E\u5B9A" });
    ok.addEventListener("click", () => {
      this.onDone([...this.picked]);
      this.close();
    });
    actions.createEl("button", { text: "\u53D6\u6D88" }).addEventListener("click", () => this.close());
  }
  renderLevel(box, parentId, depth) {
    const children = getChildren(this.tree, parentId);
    for (const node of children) {
      const row = box.createDiv({ cls: "sd-picker-row" });
      row.style.paddingLeft = `${depth * 16}px`;
      const cb = row.createEl("input", { attr: { type: "checkbox" } });
      cb.checked = this.picked.has(node.id);
      cb.addEventListener("change", () => {
        if (cb.checked)
          this.picked.add(node.id);
        else
          this.picked.delete(node.id);
      });
      row.createSpan({ text: node.title });
      this.renderLevel(box, node.id, depth + 1);
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};
var VideoPickerModal = class extends import_obsidian3.FuzzySuggestModal {
  constructor(app, onChoose) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder("\u641C\u7D22\u89C6\u9891\u6587\u4EF6\u2026");
  }
  getItems() {
    return this.app.vault.getFiles().filter((f) => VIDEO_EXT.includes(f.extension.toLowerCase()));
  }
  getItemText(file) {
    return file.path;
  }
  onChooseItem(file) {
    this.onChoose(file);
  }
};
var GradeModal = class extends import_obsidian3.Modal {
  constructor(app, rec, onDone) {
    super(app);
    this.rec = rec;
    this.onDone = onDone;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "\u56DE\u586B\u8001\u5E08\u8BC4\u5206" });
    contentEl.createEl("div", {
      cls: "sd-subtitle",
      text: `\u77E5\u8BC6\u70B9\uFF1A${this.rec.knowledgeIds.join(", ")}`
    });
    const f1 = contentEl.createDiv({ cls: "sd-field" });
    f1.createEl("label", { text: "\u8001\u5E08\u8BC4\u5206\uFF080-100\uFF09" });
    const scoreInput = f1.createEl("input", {
      attr: { type: "number", min: "0", max: "100", placeholder: "\u5982 90" }
    });
    const f2 = contentEl.createDiv({ cls: "sd-field" });
    f2.createEl("label", { text: "\u8BC4\u8BED\uFF08\u53EF\u9009\uFF09" });
    const commentInput = f2.createEl("textarea", { attr: { rows: "3" } });
    const actions = contentEl.createDiv({ cls: "sd-actions" });
    const ok = actions.createEl("button", { cls: "mod-cta", text: "\u4FDD\u5B58" });
    ok.addEventListener("click", () => {
      const n = Number(scoreInput.value);
      if (isNaN(n) || n < 0 || n > 100) {
        new import_obsidian3.Notice("\u8BF7\u8F93\u5165 0-100 \u7684\u5206\u6570");
        return;
      }
      this.onDone(n, commentInput.value.trim());
      this.close();
    });
    actions.createEl("button", { text: "\u53D6\u6D88" }).addEventListener("click", () => this.close());
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/track/TrackPage.ts
var import_obsidian7 = require("obsidian");

// src/utils/vaultFiles.ts
var import_obsidian5 = require("obsidian");

// src/view/HtmlFileView.ts
var import_obsidian4 = require("obsidian");
var VIEW_TYPE_HTML = "study-desk-html";
var HtmlFileView = class extends import_obsidian4.ItemView {
  constructor(leaf) {
    super(leaf);
    this.path = null;
  }
  getViewType() {
    return VIEW_TYPE_HTML;
  }
  getDisplayText() {
    return this.path ? this.path.split("/").pop() : "\u7F51\u9875\u9884\u89C8";
  }
  getIcon() {
    return "globe";
  }
  async setState(state, result) {
    if (state == null ? void 0 : state.path)
      this.path = state.path;
    await super.setState(state, result);
    this.render();
  }
  async onOpen() {
    this.render();
  }
  async onClose() {
    this.contentEl.empty();
  }
  render() {
    const container = this.contentEl;
    container.empty();
    container.addClass("sd-html-view");
    if (!this.path) {
      container.createEl("div", { cls: "sd-empty", text: "\u672A\u6307\u5B9A\u6587\u4EF6" });
      return;
    }
    const url = this.app.vault.adapter.getResourcePath(this.path);
    container.createEl("iframe", {
      cls: "sd-html-frame-full",
      attr: { src: url }
    });
  }
};

// src/utils/vaultFiles.ts
function openVaultFile(app, path) {
  var _a;
  const ext = (_a = path.split(".").pop()) == null ? void 0 : _a.toLowerCase();
  if (ext === "html" || ext === "htm") {
    app.workspace.getLeaf(true).setViewState({
      type: VIEW_TYPE_HTML,
      active: true,
      state: { path }
    });
    return;
  }
  const file = app.vault.getAbstractFileByPath(path);
  if (file instanceof import_obsidian5.TFile) {
    app.workspace.getLeaf(true).openFile(file);
  } else {
    new import_obsidian5.Notice("\u8BE5\u6587\u4EF6\u7C7B\u578B\u6682\u4E0D\u652F\u6301\u5728 Obsidian \u5185\u6253\u5F00");
  }
}
async function ensureDir(app, dir) {
  const adapter = app.vault.adapter;
  const norm = dir.endsWith("/") ? dir : dir + "/";
  if (!await adapter.exists(norm)) {
    await adapter.mkdir(norm);
  }
}
async function uniqueName(app, dir, name) {
  const adapter = app.vault.adapter;
  const norm = dir.endsWith("/") ? dir : dir + "/";
  if (!await adapter.exists(norm + name))
    return name;
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let i = 1;
  while (await adapter.exists(`${norm}${base} (${i})${ext}`))
    i++;
  return `${base} (${i})${ext}`;
}
function isHidden(name) {
  return name.startsWith(".");
}

// src/drive/FileBrowserModal.ts
var import_obsidian6 = require("obsidian");
var FileBrowserModal = class extends import_obsidian6.Modal {
  constructor(app, onChoose, startDir) {
    super(app);
    this.currentDir = "/";
    this.onChoose = onChoose;
    if (startDir)
      this.currentDir = startDir;
  }
  onOpen() {
    this.modalEl.addClass("sd-browser-modal");
    this.titleEl.setText("\u9009\u62E9\u6587\u4EF6");
    const { contentEl } = this;
    contentEl.empty();
    this.crumbEl = contentEl.createDiv({ cls: "sd-breadcrumb" });
    this.listEl = contentEl.createDiv({ cls: "sd-browser-list" });
    this.renderCrumb();
    this.refresh();
  }
  renderCrumb() {
    const crumb = this.crumbEl;
    crumb.empty();
    const root = crumb.createSpan({ cls: "sd-crumb", text: "\u6839\u76EE\u5F55" });
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
  async refresh() {
    const el = this.listEl;
    el.empty();
    let folders = [];
    let files = [];
    try {
      const listing = await this.app.vault.adapter.list(this.currentDir);
      folders = listing.folders;
      files = listing.files;
    } catch (e) {
      el.createEl("div", { cls: "sd-empty", text: "\u76EE\u5F55\u65E0\u6CD5\u8BFB\u53D6" });
      return;
    }
    const rows = [];
    for (const f of folders) {
      const name = f.split("/").pop() || f;
      if (isHidden(name))
        continue;
      rows.push({ name, path: f, isFolder: true });
    }
    for (const f of files) {
      const name = f.split("/").pop() || f;
      if (isHidden(name))
        continue;
      rows.push({ name, path: f, isFolder: false });
    }
    rows.sort(
      (a, b2) => a.isFolder === b2.isFolder ? a.name.localeCompare(b2.name, "zh-Hans-CN") : a.isFolder ? -1 : 1
    );
    if (rows.length === 0) {
      el.createEl("div", { cls: "sd-empty-sm", text: "\u7A7A\u76EE\u5F55" });
      return;
    }
    for (const r of rows) {
      const row = el.createDiv({ cls: "sd-browser-row" });
      const icon = row.createSpan({ cls: "sd-ticon" });
      (0, import_obsidian6.setIcon)(icon, r.isFolder ? "folder" : "file");
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
  onClose() {
    this.contentEl.empty();
  }
};

// src/track/TrackPage.ts
var UPLOAD_DIR = "study-desk-assets/";
var TrackPage = class extends PageComponent {
  constructor() {
    super(...arguments);
    this.selectedId = null;
  }
  render(container) {
    this.container = container;
    container.empty();
    container.addClass("study-desk-page");
    container.createEl("h2", { text: "\u66F2\u5F0F\u5206\u6790" });
    container.createEl("div", {
      cls: "sd-subtitle",
      text: "\u5BF9\u6BCF\u9996\u66F2\u76EE\u6302\u8F7D\u7B14\u8BB0\uFF0C\u6216\u4E0A\u4F20 PDF / HTML \u5206\u6790\u6587\u6863"
    });
    const toolbar = container.createDiv({ cls: "sd-toolbar" });
    const btnAdd = toolbar.createEl("button", {
      cls: "mod-cta",
      text: "\u65B0\u5EFA\u66F2\u76EE"
    });
    btnAdd.addEventListener("click", () => this.addTrack());
    const grid = container.createDiv({ cls: "sd-wiki-grid" });
    const listPane = grid.createDiv({ cls: "sd-wiki-tree" });
    const editPane = grid.createDiv({ cls: "sd-wiki-edit" });
    this.renderList(listPane);
    this.renderEdit(editPane);
  }
  getTracks() {
    return [...this.plugin.data.tracks].sort((a, b2) => a.createdAt - b2.createdAt);
  }
  renderList(pane) {
    pane.empty();
    const tracks = this.getTracks();
    if (tracks.length === 0) {
      pane.createEl("div", {
        cls: "sd-empty",
        text: "\u8FD8\u6CA1\u6709\u66F2\u76EE\uFF0C\u70B9\u51FB\u300C\u65B0\u5EFA\u66F2\u76EE\u300D\u5F00\u59CB"
      });
      return;
    }
    for (const track of tracks) {
      const row = pane.createDiv({
        cls: "sd-tnode" + (track.id === this.selectedId ? " is-selected" : "")
      });
      const icon = row.createSpan({ cls: "sd-ticon" });
      (0, import_obsidian7.setIcon)(icon, "music-2");
      row.createSpan({ cls: "sd-title", text: track.title });
      row.createSpan({
        cls: "sd-count",
        text: track.notePaths.length ? `${track.notePaths.length} \u7BC7` : ""
      });
      row.addEventListener("click", () => {
        this.selectedId = track.id;
        this.renderList(this.container.querySelector(".sd-wiki-tree"));
        this.renderEdit(this.container.querySelector(".sd-wiki-edit"));
      });
    }
  }
  renderEdit(pane) {
    pane.empty();
    const track = this.selectedId ? this.plugin.data.tracks.find((t) => t.id === this.selectedId) : void 0;
    if (!track) {
      pane.createEl("div", {
        cls: "sd-empty",
        text: "\u9009\u4E2D\u5DE6\u4FA7\u66F2\u76EE\u4EE5\u67E5\u770B / \u6302\u8F7D\u7B14\u8BB0"
      });
      return;
    }
    pane.createEl("h3", { text: "\u66F2\u76EE\u8BE6\u60C5" });
    const titleWrap = pane.createDiv({ cls: "sd-field" });
    titleWrap.createEl("label", { text: "\u66F2\u76EE\u540D\u79F0" });
    const titleInput = titleWrap.createEl("input", {
      attr: { type: "text", value: track.title }
    });
    const notesWrap = pane.createDiv({ cls: "sd-field" });
    notesWrap.createEl("label", { text: "\u6302\u8F7D\u6587\u4EF6 / \u4E0A\u4F20" });
    const notesList = notesWrap.createDiv({ cls: "sd-notes" });
    this.renderNotes(notesList, track);
    const btnRow = notesWrap.createDiv({ cls: "sd-btn-row" });
    const btnNote = btnRow.createEl("button", {
      cls: "sd-btn-add",
      text: "\u6302\u8F7D\u6587\u4EF6"
    });
    btnNote.addEventListener("click", () => this.pickNote(track.id));
    const btnUpload = btnRow.createEl("button", {
      cls: "sd-btn-add",
      text: "\u4E0A\u4F20 PDF / HTML"
    });
    btnUpload.addEventListener("click", () => this.uploadFile(track.id));
    const actions = pane.createDiv({ cls: "sd-actions" });
    const btnSave = actions.createEl("button", {
      cls: "mod-cta",
      text: "\u4FDD\u5B58"
    });
    btnSave.addEventListener("click", () => {
      const title = titleInput.value.trim() || track.title;
      this.plugin.data.tracks = this.plugin.data.tracks.map(
        (t) => t.id === track.id ? { ...t, title } : t
      );
      this.plugin.persist();
      this.renderList(this.container.querySelector(".sd-wiki-tree"));
      new import_obsidian7.Notice("\u5DF2\u4FDD\u5B58");
    });
    const btnDelete = actions.createEl("button", {
      cls: "sd-btn-danger",
      text: "\u5220\u9664\u66F2\u76EE"
    });
    btnDelete.addEventListener("click", () => this.deleteTrack(track.id));
  }
  renderNotes(container, track) {
    container.empty();
    if (track.notePaths.length === 0) {
      container.createEl("div", {
        cls: "sd-empty-sm",
        text: "\u6682\u65E0\u6302\u8F7D\u6587\u4EF6"
      });
      return;
    }
    for (const p2 of track.notePaths) {
      const item = container.createDiv({ cls: "sd-note-item" });
      const link = item.createSpan({ cls: "sd-note-path", text: p2 });
      link.setAttribute("title", "\u70B9\u51FB\u6253\u5F00");
      link.addEventListener("click", () => openVaultFile(this.plugin.app, p2));
      const rm = item.createSpan({ cls: "sd-note-rm", text: "\u2715" });
      rm.addEventListener("click", () => {
        this.plugin.data.tracks = this.plugin.data.tracks.map(
          (t) => t.id === track.id ? { ...t, notePaths: t.notePaths.filter((x2) => x2 !== p2) } : t
        );
        this.plugin.persist();
        const updated = this.plugin.data.tracks.find((t) => t.id === track.id);
        this.renderNotes(container, updated);
        this.renderList(this.container.querySelector(".sd-wiki-tree"));
      });
    }
  }
  addTrack() {
    const track = {
      id: genId(),
      title: "\u65B0\u66F2\u76EE",
      notePaths: [],
      createdAt: Date.now()
    };
    this.plugin.data.tracks.push(track);
    this.selectedId = track.id;
    this.plugin.persist();
    this.render(this.container);
  }
  deleteTrack(id) {
    this.plugin.data.tracks = this.plugin.data.tracks.filter((t) => t.id !== id);
    if (this.selectedId === id)
      this.selectedId = null;
    this.plugin.persist();
    this.render(this.container);
  }
  /** 从网盘（vault 文件浏览器）选择文件挂载 */
  pickNote(trackId) {
    new FileBrowserModal(
      this.plugin.app,
      (p2) => {
        const track = this.plugin.data.tracks.find((t) => t.id === trackId);
        if (!track)
          return;
        if (!track.notePaths.includes(p2)) {
          this.plugin.data.tracks = this.plugin.data.tracks.map(
            (t) => t.id === trackId ? { ...t, notePaths: [...t.notePaths, p2] } : t
          );
          this.plugin.persist();
          this.render(this.container);
        }
      },
      UPLOAD_DIR
    ).open();
  }
  // ===== 上传 PDF / HTML =====
  uploadFile(trackId) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.html,.htm";
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener("change", async () => {
      var _a;
      const file = (_a = input.files) == null ? void 0 : _a[0];
      input.remove();
      if (!file)
        return;
      await this.importFile(trackId, file);
    });
    window.setTimeout(() => input.remove(), 6e4);
    input.click();
  }
  async importFile(trackId, file) {
    try {
      const buffer = await file.arrayBuffer();
      await ensureDir(this.plugin.app, UPLOAD_DIR);
      const name = await uniqueName(this.plugin.app, UPLOAD_DIR, file.name);
      const targetPath = UPLOAD_DIR + name;
      await this.plugin.app.vault.createBinary(targetPath, buffer);
      this.plugin.data.tracks = this.plugin.data.tracks.map(
        (t) => t.id === trackId ? { ...t, notePaths: [...t.notePaths, targetPath] } : t
      );
      await this.plugin.persist();
      new import_obsidian7.Notice(`\u5DF2\u4E0A\u4F20\uFF1A${name}`);
      this.render(this.container);
    } catch (e) {
      new import_obsidian7.Notice("\u4E0A\u4F20\u5931\u8D25\uFF1A" + ((e == null ? void 0 : e.message) || String(e)));
    }
  }
};

// src/drive/DrivePage.ts
var import_obsidian8 = require("obsidian");
var DrivePage = class extends PageComponent {
  constructor() {
    super(...arguments);
    this.currentDir = "/";
  }
  render(container) {
    this.container = container;
    container.empty();
    container.addClass("study-desk-page");
    container.createEl("h2", { text: "\u5173\u8054\u7F51\u76D8" });
    container.createEl("div", {
      cls: "sd-subtitle",
      text: "\u672C\u5730\u6587\u4EF6\u4ED3\u5E93 \xB7 \u7BA1\u7406 vault \u5185\u7684\u5B66\u4E60\u7D20\u6750\uFF08PDF / \u97F3\u89C6\u9891 / \u4E50\u8C31\u7B49\uFF09"
    });
    const toolbar = container.createDiv({ cls: "sd-toolbar" });
    const btnUp = toolbar.createEl("button", { cls: "mod-cta", text: "\u4E0A\u4F20\u6587\u4EF6" });
    btnUp.addEventListener("click", () => this.uploadFiles());
    const btnDir = toolbar.createEl("button", { text: "\u65B0\u5EFA\u6587\u4EF6\u5939" });
    btnDir.addEventListener("click", () => this.newFolder());
    const btnRoot = toolbar.createEl("button", { text: "\u8FD4\u56DE\u6839\u76EE\u5F55" });
    btnRoot.addEventListener("click", () => {
      this.currentDir = "/";
      this.render(this.container);
    });
    const crumb = container.createDiv({ cls: "sd-breadcrumb" });
    this.renderCrumb(crumb);
    const list = container.createDiv({ cls: "sd-drive-list" });
    this.renderList(list);
  }
  renderCrumb(crumb) {
    crumb.empty();
    const root = crumb.createSpan({ cls: "sd-crumb", text: "\u6839\u76EE\u5F55" });
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
  async renderList(list) {
    var _a, _b;
    list.empty();
    const adapter = this.plugin.app.vault.adapter;
    let folders = [];
    let files = [];
    try {
      const listing = await adapter.list(this.currentDir);
      folders = listing.folders;
      files = listing.files;
    } catch (e) {
      list.createEl("div", { cls: "sd-empty", text: "\u76EE\u5F55\u4E0D\u5B58\u5728\u6216\u65E0\u6CD5\u8BFB\u53D6" });
      return;
    }
    const entries = [];
    for (const f of folders) {
      const name = f.split("/").pop() || f;
      if (isHidden(name))
        continue;
      entries.push({ name, path: f, isFolder: true });
    }
    for (const f of files) {
      const name = f.split("/").pop() || f;
      if (isHidden(name))
        continue;
      const ext = (_b = (_a = name.split(".").pop()) == null ? void 0 : _a.toLowerCase()) != null ? _b : "";
      if (ext === "md" || ext === "markdown")
        continue;
      entries.push({ name, path: f, isFolder: false });
    }
    entries.sort(
      (a, b2) => a.isFolder === b2.isFolder ? a.name.localeCompare(b2.name, "zh-Hans-CN") : a.isFolder ? -1 : 1
    );
    await Promise.all(
      entries.map(async (e) => {
        if (e.isFolder)
          return;
        try {
          const st2 = await adapter.stat(e.path);
          if (st2) {
            e.size = st2.size;
            e.mtime = st2.mtime;
          }
        } catch (e2) {
        }
      })
    );
    if (entries.length === 0) {
      list.createEl("div", { cls: "sd-empty", text: "\u7A7A\u76EE\u5F55" });
      return;
    }
    for (const e of entries) {
      const row = list.createDiv({ cls: "sd-drive-row" });
      const icon = row.createSpan({ cls: "sd-drive-icon" });
      (0, import_obsidian8.setIcon)(icon, e.isFolder ? "folder" : this.fileIcon(e.name));
      row.createSpan({ cls: "sd-drive-name", text: e.name });
      const metaText = e.isFolder ? "\u6587\u4EF6\u5939" : this.fmtSize(e.size) + (e.mtime ? " \xB7 " + this.fmtDate(e.mtime) : "");
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
          text: "\u2715",
          attr: { title: "\u5220\u9664" }
        });
        del.addEventListener("click", (ev) => {
          ev.stopPropagation();
          this.deleteFile(e);
        });
      }
    }
  }
  // ===== 上传 =====
  uploadFiles() {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener("change", async () => {
      const files = Array.from(input.files || []);
      input.remove();
      if (files.length === 0)
        return;
      await this.importFiles(files);
    });
    window.setTimeout(() => input.remove(), 12e4);
    input.click();
  }
  async importFiles(files) {
    const adapter = this.plugin.app.vault.adapter;
    const dir = this.currentDir.endsWith("/") ? this.currentDir : this.currentDir + "/";
    let ok = 0;
    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const name = await uniqueName(this.plugin.app, dir, file.name);
        await adapter.writeBinary(dir + name, buffer);
        ok++;
      } catch (e) {
        new import_obsidian8.Notice("\u4E0A\u4F20\u5931\u8D25\uFF1A" + file.name);
      }
    }
    if (ok)
      new import_obsidian8.Notice(`\u5DF2\u4E0A\u4F20 ${ok} \u4E2A\u6587\u4EF6`);
    this.render(this.container);
  }
  // ===== 新建文件夹 =====
  async newFolder() {
    const name = window.prompt("\u6587\u4EF6\u5939\u540D\u79F0");
    if (!name || !name.trim())
      return;
    const dir = this.currentDir.endsWith("/") ? this.currentDir : this.currentDir + "/";
    const target = dir + name.trim();
    const adapter = this.plugin.app.vault.adapter;
    if (await adapter.exists(target)) {
      new import_obsidian8.Notice("\u5DF2\u5B58\u5728\u540C\u540D\u6587\u4EF6\u5939");
      return;
    }
    await adapter.mkdir(target);
    this.render(this.container);
  }
  // ===== 删除 =====
  deleteFile(e) {
    const file = this.plugin.app.vault.getAbstractFileByPath(e.path);
    if (file) {
      new ConfirmModal(
        this.plugin.app,
        `\u5220\u9664\u300C${e.name}\u300D\uFF1F\u5C06\u79FB\u5230\u56DE\u6536\u7AD9\uFF0C\u53EF\u6062\u590D\u3002`,
        async () => {
          await this.plugin.app.vault.trash(file, true);
          this.render(this.container);
        }
      ).open();
    } else {
      new ConfirmModal(
        this.plugin.app,
        `\u300C${e.name}\u300D\u672A\u88AB Obsidian \u7D22\u5F15\uFF0C\u5220\u9664\u540E\u5C06\u6C38\u4E45\u5220\u9664\u3001\u65E0\u6CD5\u6062\u590D\u3002\u786E\u8BA4\uFF1F`,
        async () => {
          await this.plugin.app.vault.adapter.remove(e.path);
          this.render(this.container);
        }
      ).open();
    }
  }
  // ===== 工具 =====
  fileIcon(name) {
    var _a, _b;
    const ext = (_b = (_a = name.split(".").pop()) == null ? void 0 : _a.toLowerCase()) != null ? _b : "";
    if (["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"].includes(ext))
      return "image";
    if (["mp3", "wav", "flac", "m4a", "ogg", "aac"].includes(ext))
      return "audio-lines";
    if (["mp4", "webm", "mov", "m4v", "mkv"].includes(ext))
      return "video";
    if (ext === "pdf")
      return "file-text";
    if (ext === "md" || ext === "markdown")
      return "file-text";
    if (ext === "html" || ext === "htm")
      return "globe";
    return "file";
  }
  fmtSize(size) {
    if (size == null)
      return "";
    if (size < 1024)
      return `${size} B`;
    if (size < 1024 * 1024)
      return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  fmtDate(ts) {
    const d = new Date(ts);
    const p2 = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  }
};
var ConfirmModal = class extends import_obsidian8.Modal {
  constructor(app, message, onConfirm) {
    super(app);
    this.message = message;
    this.onConfirm = onConfirm;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("p", { cls: "sd-confirm-text", text: this.message });
    const actions = contentEl.createDiv({ cls: "sd-actions" });
    const ok = actions.createEl("button", { cls: "mod-cta", text: "\u5220\u9664" });
    ok.addEventListener("click", () => {
      this.onConfirm();
      this.close();
    });
    actions.createEl("button", { text: "\u53D6\u6D88" }).addEventListener("click", () => this.close());
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/view/StudyDeskView.ts
var VIEW_TYPE_STUDY_DESK = "study-desk-main";
var StudyDeskView = class extends import_obsidian9.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.activeId = "dashboard";
    this.plugin = plugin;
    this.groups = [
      {
        label: "\u5DE5\u5177",
        items: [
          { id: "dashboard", title: "Dashboard", icon: "gauge", comp: new DashboardPage(plugin) },
          { id: "drive", title: "\u5173\u8054\u7F51\u76D8", icon: "hard-drive", comp: new DrivePage(plugin) },
          { id: "calendar", title: "\u65E5\u7A0B\u7BA1\u7406", icon: "calendar", dim: true },
          { id: "experts", title: "\u4E13\u5BB6\u56E2", icon: "users", dim: true }
        ]
      },
      {
        label: "\u5B66\u4E60",
        items: [
          { id: "wiki", title: "\u77E5\u8BC6 Wiki", icon: "network", comp: new WikiPage(plugin) },
          { id: "checkin", title: "\u6253\u5361\u7EC3\u4E60", icon: "check-circle", comp: new CheckinPage(plugin) },
          { id: "flashcard", title: "\u95EA\u5361\u590D\u4E60", icon: "layers", comp: new FlashcardPage(plugin) }
        ]
      },
      {
        label: "\u9879\u76EE",
        items: [
          { id: "track", title: "\u66F2\u5F0F\u5206\u6790", icon: "music-2", comp: new TrackPage(plugin) }
        ]
      },
      {
        label: "\u8BBE\u7F6E",
        items: [
          { id: "settings", title: "\u8BBE\u7F6E", icon: "settings", action: () => this.openSettings() }
        ]
      }
    ];
  }
  getViewType() {
    return VIEW_TYPE_STUDY_DESK;
  }
  getDisplayText() {
    return "\u97F3\u4E50\u5B66\u4E60\u53F0";
  }
  getIcon() {
    return "music";
  }
  async onOpen() {
    this.render();
  }
  async onClose() {
    this.contentEl.empty();
  }
  render() {
    const container = this.contentEl;
    container.empty();
    container.addClass("study-desk-app");
    const sidebar = container.createDiv({ cls: "sd-nav" });
    const main = container.createDiv({ cls: "sd-main" });
    const brand = sidebar.createDiv({ cls: "sd-nav-brand" });
    const mark = brand.createSpan({ cls: "sd-nav-mark" });
    (0, import_obsidian9.setIcon)(mark, "music");
    brand.createSpan({ cls: "sd-nav-name", text: "\u97F3\u4E50\u5B66\u4E60\u53F0" });
    brand.createSpan({ cls: "sd-nav-ver", text: "v0.3" });
    for (const group of this.groups) {
      sidebar.createDiv({ cls: "sd-nav-label", text: group.label });
      for (const item of group.items) {
        const isActive = item.id === this.activeId && !item.dim;
        const el = sidebar.createDiv({
          cls: "sd-nav-item" + (isActive ? " is-active" : "") + (item.dim ? " is-dim" : "")
        });
        const icon = el.createSpan({ cls: "sd-nav-icon" });
        (0, import_obsidian9.setIcon)(icon, item.icon);
        el.createSpan({ cls: "sd-nav-label-text", text: item.title });
        if (item.id === "flashcard") {
          const due = dueCardsToday(this.plugin.data);
          if (due > 0) {
            el.createSpan({ cls: "sd-nav-badge", text: String(due) });
          }
        }
        el.addEventListener("click", () => {
          if (item.dim) {
            new import_obsidian9.Notice(`${item.title}\u5C06\u5728\u540E\u7EED\u7248\u672C\u63A8\u51FA`);
            return;
          }
          if (item.action) {
            item.action();
            return;
          }
          if (this.activeId === item.id)
            return;
          this.activeId = item.id;
          this.render();
        });
      }
    }
    const active = this.findPage(this.activeId);
    if (active)
      active.render(main);
  }
  findPage(id) {
    for (const g of this.groups) {
      for (const it2 of g.items) {
        if (it2.id === id)
          return it2.comp;
      }
    }
    return void 0;
  }
  openSettings() {
    const app = this.plugin.app;
    app.setting.open();
    app.setting.openTabById("study-desk");
  }
};

// main.ts
var StudyDeskPlugin = class extends import_obsidian10.Plugin {
  constructor() {
    super(...arguments);
    this.data = {
      version: 1,
      knowledgeTree: [],
      flashcards: [],
      checkins: [],
      tracks: [],
      schedules: [],
      settings: {
        weightFlashcard: 0.5,
        weightCheckin: 0.5,
        videoDir: "study-desk-assets/",
        dailyNewCardLimit: 20
      }
    };
  }
  async onload() {
    this.data = await loadPluginData(this);
    this.registerView(
      VIEW_TYPE_STUDY_DESK,
      (leaf) => new StudyDeskView(leaf, this)
    );
    this.registerView(
      VIEW_TYPE_HTML,
      (leaf) => new HtmlFileView(leaf)
    );
    this.addSettingTab(new StudyDeskSettingTab(this.app, this));
    this.addRibbonIcon("music", "\u97F3\u4E50\u5B66\u4E60\u53F0", () => {
      this.activateView();
    });
    this.addCommand({
      id: "open",
      name: "\u6253\u5F00\u97F3\u4E50\u5B66\u4E60\u53F0",
      callback: () => this.activateView()
    });
  }
  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_STUDY_DESK)[0];
    if (!leaf) {
      leaf = workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE_STUDY_DESK, active: true });
    }
    workspace.revealLeaf(leaf);
  }
  onunload() {
  }
  /** 保存数据（避免覆盖基类 saveData） */
  async persist() {
    await savePluginData(this, this.data);
  }
};
var StudyDeskSettingTab = class extends import_obsidian10.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "\u97F3\u4E50\u5B66\u4E60\u53F0 \xB7 \u8BBE\u7F6E" });
    new import_obsidian10.Setting(containerEl).setName("\u638C\u63E1\u5EA6\u8BA1\u7B97\u6743\u91CD\uFF08\u95EA\u5361\uFF09").setDesc("\u638C\u63E1\u5EA6 = \u95EA\u5361\u6B63\u786E\u7387 \xD7 \u8BE5\u6743\u91CD + \u6253\u5361\u5747\u5206 \xD7 (1 \u2212 \u8BE5\u6743\u91CD)").addText(
      (text) => text.setValue(
        String(Math.round(this.plugin.data.settings.weightFlashcard * 100))
      ).onChange(async (value) => {
        const n = Number(value);
        if (isNaN(n))
          return;
        const w = Math.min(100, Math.max(0, n)) / 100;
        this.plugin.data.settings.weightFlashcard = w;
        this.plugin.data.settings.weightCheckin = 1 - w;
        await this.plugin.persist();
      })
    );
    new import_obsidian10.Setting(containerEl).setName("\u89C6\u9891\u6587\u4EF6\u76EE\u5F55").setDesc("\u6253\u5361\u89C6\u9891\u4FDD\u5B58\u5230\u7684 vault \u5185\u8DEF\u5F84").addText(
      (text) => text.setValue(this.plugin.data.settings.videoDir).onChange(async (value) => {
        this.plugin.data.settings.videoDir = value;
        await this.plugin.persist();
      })
    );
    new import_obsidian10.Setting(containerEl).setName("\u6BCF\u65E5\u65B0\u5361\u4E0A\u9650").setDesc("\u6BCF\u5929\u6700\u591A\u5F15\u5165\u7684\u65B0\u5361\u7247\u6570\u91CF").addText(
      (text) => text.setValue(String(this.plugin.data.settings.dailyNewCardLimit)).onChange(async (value) => {
        const n = Number(value);
        if (isNaN(n) || n < 0)
          return;
        this.plugin.data.settings.dailyNewCardLimit = Math.floor(n);
        await this.plugin.persist();
      })
    );
  }
};
