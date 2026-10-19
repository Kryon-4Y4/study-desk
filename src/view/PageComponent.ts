import type StudyDeskPlugin from "../../main";

/** 页面组件基类：每个功能页渲染到一个容器，由主视图切换 */
export abstract class PageComponent {
  plugin: StudyDeskPlugin;
  protected container: HTMLElement;

  constructor(plugin: StudyDeskPlugin) {
    this.plugin = plugin;
  }

  abstract render(container: HTMLElement): void;
}
