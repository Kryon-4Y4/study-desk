import { ItemView, WorkspaceLeaf, setIcon, Notice } from "obsidian";
import type StudyDeskPlugin from "../../main";
import { PageComponent } from "./PageComponent";
import { DashboardPage } from "../dashboard/DashboardView";
import { WikiPage } from "../knowledge/KnowledgeWikiView";
import { FlashcardPage } from "../flashcard/FlashcardView";
import { CheckinPage } from "../checkin/CheckinView";
import { TrackPage } from "../track/TrackPage";
import { DrivePage } from "../drive/DrivePage";
import { dueCardsToday } from "../dashboard/aggregation";

export const VIEW_TYPE_STUDY_DESK = "study-desk-main";

interface NavItem {
  id: string;
  title: string;
  icon: string;
  /** 有 comp 的是功能页，点击切换页面 */
  comp?: PageComponent;
  /** 无 comp 时可给一个点击动作（如打开设置） */
  action?: () => void;
  /** 置灰（未实现） */
  dim?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export class StudyDeskView extends ItemView {
  plugin: StudyDeskPlugin;
  private activeId = "dashboard";
  private groups: NavGroup[];

  constructor(leaf: WorkspaceLeaf, plugin: StudyDeskPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.groups = [
      {
        label: "工具",
        items: [
          { id: "dashboard", title: "Dashboard", icon: "gauge", comp: new DashboardPage(plugin) },
          { id: "drive", title: "关联网盘", icon: "hard-drive", comp: new DrivePage(plugin) },
          { id: "calendar", title: "日程管理", icon: "calendar", dim: true },
          { id: "experts", title: "专家团", icon: "users", dim: true },
        ],
      },
      {
        label: "学习",
        items: [
          { id: "wiki", title: "知识 Wiki", icon: "network", comp: new WikiPage(plugin) },
          { id: "checkin", title: "打卡练习", icon: "check-circle", comp: new CheckinPage(plugin) },
          { id: "flashcard", title: "闪卡复习", icon: "layers", comp: new FlashcardPage(plugin) },
        ],
      },
      {
        label: "项目",
        items: [
          { id: "track", title: "曲式分析", icon: "music-2", comp: new TrackPage(plugin) },
        ],
      },
      {
        label: "设置",
        items: [
          { id: "settings", title: "设置", icon: "settings", action: () => this.openSettings() },
        ],
      },
    ];
  }

  getViewType(): string {
    return VIEW_TYPE_STUDY_DESK;
  }

  getDisplayText(): string {
    return "音乐学习台";
  }

  getIcon(): string {
    return "music";
  }

  async onOpen(): Promise<void> {
    this.render();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  private render(): void {
    const container = this.contentEl;
    container.empty();
    container.addClass("study-desk-app");

    const sidebar = container.createDiv({ cls: "sd-nav" });
    const main = container.createDiv({ cls: "sd-main" });

    // 品牌
    const brand = sidebar.createDiv({ cls: "sd-nav-brand" });
    const mark = brand.createSpan({ cls: "sd-nav-mark" });
    setIcon(mark, "music");
    brand.createSpan({ cls: "sd-nav-name", text: "音乐学习台" });
    brand.createSpan({ cls: "sd-nav-ver", text: "v0.3" });

    // 分组导航
    for (const group of this.groups) {
      sidebar.createDiv({ cls: "sd-nav-label", text: group.label });
      for (const item of group.items) {
        const isActive = item.id === this.activeId && !item.dim;
        const el = sidebar.createDiv({
          cls:
            "sd-nav-item" +
            (isActive ? " is-active" : "") +
            (item.dim ? " is-dim" : ""),
        });
        const icon = el.createSpan({ cls: "sd-nav-icon" });
        setIcon(icon, item.icon);
        el.createSpan({ cls: "sd-nav-label-text", text: item.title });

        if (item.id === "flashcard") {
          const due = dueCardsToday(this.plugin.data);
          if (due > 0) {
            el.createSpan({ cls: "sd-nav-badge", text: String(due) });
          }
        }

        el.addEventListener("click", () => {
          if (item.dim) {
            new Notice(`${item.title}将在后续版本推出`);
            return;
          }
          if (item.action) {
            item.action();
            return;
          }
          if (this.activeId === item.id) return;
          this.activeId = item.id;
          this.render();
        });
      }
    }

    // 主区渲染当前页
    const active = this.findPage(this.activeId);
    if (active) active.render(main);
  }

  private findPage(id: string): PageComponent | undefined {
    for (const g of this.groups) {
      for (const it of g.items) {
        if (it.id === id) return it.comp;
      }
    }
    return undefined;
  }

  private openSettings(): void {
    // 打开 Obsidian 设置并定位到本插件标签（setting 为运行时属性，未在类型声明中暴露）
    const app = this.plugin.app as unknown as {
      setting: { open(): void; openTabById(id: string): void };
    };
    app.setting.open();
    app.setting.openTabById("study-desk");
  }
}
