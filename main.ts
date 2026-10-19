import {
  Plugin,
  PluginSettingTab,
  Setting,
  App,
} from "obsidian";
import { StudyDeskData } from "./src/types";
import { loadPluginData, savePluginData } from "./src/store";
import { StudyDeskView, VIEW_TYPE_STUDY_DESK } from "./src/view/StudyDeskView";
import { HtmlFileView, VIEW_TYPE_HTML } from "./src/view/HtmlFileView";

export default class StudyDeskPlugin extends Plugin {
  data: StudyDeskData = {
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
      dailyNewCardLimit: 20,
    },
  };

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

    this.addRibbonIcon("music", "音乐学习台", () => {
      this.activateView();
    });

    this.addCommand({
      id: "open",
      name: "打开音乐学习台",
      callback: () => this.activateView(),
    });
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_STUDY_DESK)[0];
    if (!leaf) {
      // 在 Obsidian 主工作区（中栏）以标签页形式打开
      leaf = workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE_STUDY_DESK, active: true });
    }
    workspace.revealLeaf(leaf);
  }

  onunload() {}

  /** 保存数据（避免覆盖基类 saveData） */
  async persist() {
    await savePluginData(this, this.data);
  }
}

class StudyDeskSettingTab extends PluginSettingTab {
  plugin: StudyDeskPlugin;

  constructor(app: App, plugin: StudyDeskPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "音乐学习台 · 设置" });

    new Setting(containerEl)
      .setName("掌握度计算权重（闪卡）")
      .setDesc("掌握度 = 闪卡正确率 × 该权重 + 打卡均分 × (1 − 该权重)")
      .addText((text) =>
        text
          .setValue(
            String(Math.round(this.plugin.data.settings.weightFlashcard * 100))
          )
          .onChange(async (value) => {
            const n = Number(value);
            if (isNaN(n)) return;
            const w = Math.min(100, Math.max(0, n)) / 100;
            this.plugin.data.settings.weightFlashcard = w;
            this.plugin.data.settings.weightCheckin = 1 - w;
            await this.plugin.persist();
          })
      );

    new Setting(containerEl)
      .setName("视频文件目录")
      .setDesc("打卡视频保存到的 vault 内路径")
      .addText((text) =>
        text
          .setValue(this.plugin.data.settings.videoDir)
          .onChange(async (value) => {
            this.plugin.data.settings.videoDir = value;
            await this.plugin.persist();
          })
      );

    new Setting(containerEl)
      .setName("每日新卡上限")
      .setDesc("每天最多引入的新卡片数量")
      .addText((text) =>
        text
          .setValue(String(this.plugin.data.settings.dailyNewCardLimit))
          .onChange(async (value) => {
            const n = Number(value);
            if (isNaN(n) || n < 0) return;
            this.plugin.data.settings.dailyNewCardLimit = Math.floor(n);
            await this.plugin.persist();
          })
      );
  }
}
