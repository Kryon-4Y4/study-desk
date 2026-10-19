import { ItemView, WorkspaceLeaf, ViewStateResult } from "obsidian";

export const VIEW_TYPE_HTML = "study-desk-html";

/** 在 Obsidian 标签页中承载 HTML 文件的内置预览视图 */
export class HtmlFileView extends ItemView {
  path: string | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_HTML;
  }

  getDisplayText(): string {
    return this.path ? this.path.split("/").pop()! : "网页预览";
  }

  getIcon(): string {
    return "globe";
  }

  async setState(
    state: { path?: string },
    result: ViewStateResult
  ): Promise<void> {
    if (state?.path) this.path = state.path;
    await super.setState(state, result);
    this.render();
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
    container.addClass("sd-html-view");

    if (!this.path) {
      container.createEl("div", { cls: "sd-empty", text: "未指定文件" });
      return;
    }

    const url = this.app.vault.adapter.getResourcePath(this.path);
    container.createEl("iframe", {
      cls: "sd-html-frame-full",
      attr: { src: url },
    });
  }
}
