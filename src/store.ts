import { Plugin } from "obsidian";
import {
  StudyDeskData,
  DEFAULT_DATA,
  DEFAULT_SETTINGS,
  DATA_VERSION,
} from "./types";

/** 深拷贝，避免共享引用导致意外修改 */
function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

/** 从 data.json 加载并迁移，缺字段用默认值补齐 */
export async function loadPluginData(plugin: Plugin): Promise<StudyDeskData> {
  const raw = await plugin.loadData();
  if (!raw) return clone(DEFAULT_DATA);
  return migrate(raw);
}

export async function savePluginData(
  plugin: Plugin,
  data: StudyDeskData
): Promise<void> {
  await plugin.saveData(data);
}

/** 版本迁移钩子：老版本数据在此补齐新字段 */
function migrate(raw: any): StudyDeskData {
  const data = clone(DEFAULT_DATA);
  data.version = raw.version ?? DATA_VERSION;
  data.knowledgeTree = Array.isArray(raw.knowledgeTree) ? raw.knowledgeTree : [];
  data.flashcards = Array.isArray(raw.flashcards) ? raw.flashcards : [];
  data.checkins = Array.isArray(raw.checkins) ? raw.checkins : [];
  data.tracks = Array.isArray(raw.tracks) ? raw.tracks : [];
  data.settings = { ...DEFAULT_SETTINGS, ...(raw.settings || {}) };
  // 未来版本升级在此追加：if (data.version < 2) { ... }
  return data;
}
