// ============ 音乐学习台 · 数据结构定义 ============

/** 知识点树节点（B 方案：插件内独立树，知识点↔笔记多对多） */
export interface KnowledgeNode {
  /** 稳定唯一 id（crypto.randomUUID，绝不用文件路径） */
  id: string;
  /** 父节点 id，null 表示根节点 */
  parentId: string | null;
  title: string;
  /** 同级排序 */
  order: number;
  /** 关联的 vault 笔记路径（多对多） */
  notePaths: string[];
}

/** 闪卡复习状态（FSRS） */
export type CardState = "new" | "learning" | "review" | "relearning";

/** 闪卡 */
export interface Flashcard {
  id: string;
  /** 所属知识点 id */
  knowledgeId: string;
  front: string;
  back: string;
  tags: string[];
  notePath?: string;
  // FSRS 调度状态
  state: CardState;
  stability: number;
  difficulty: number;
  /** 下次复习时间戳（ms） */
  due: number;
  lastReview: number | null;
  reps: number;
  /** 答对次数（用于计算正确率 = correctCount / reps） */
  correctCount: number;
}

/** 打卡记录 */
export interface CheckinRecord {
  id: string;
  /** 本次练习覆盖的知识点（可多个） */
  knowledgeIds: string[];
  date: number;
  /** 练习视频（vault 内路径） */
  videoPath?: string;
  /** pending=待老师评分，graded=已评分 */
  status: "pending" | "graded";
  selfScore: number | null;
  teacherScore: number | null;
  teacherComment?: string;
  note?: string;
}

/** 曲目（曲目分析用，支持挂载 vault 笔记） */
export interface Track {
  id: string;
  title: string;
  notePaths: string[];
  createdAt: number;
}

/** 设置 */
export interface Settings {
  /** 掌握度中闪卡的权重（0~1） */
  weightFlashcard: number;
  /** 掌握度中打卡的权重（0~1），实际计算用 1 - weightFlashcard */
  weightCheckin: number;
  /** 视频文件保存目录（vault 内相对路径） */
  videoDir: string;
  /** 每日新卡上限 */
  dailyNewCardLimit: number;
}

/** 插件顶层数据（存 .obsidian/plugins/study-desk/data.json） */
export interface StudyDeskData {
  version: number;
  knowledgeTree: KnowledgeNode[];
  flashcards: Flashcard[];
  checkins: CheckinRecord[];
  tracks: Track[];
  settings: Settings;
}

export const DATA_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  weightFlashcard: 0.5,
  weightCheckin: 0.5,
  videoDir: "study-desk-assets/",
  dailyNewCardLimit: 20,
};

export const DEFAULT_DATA: StudyDeskData = {
  version: DATA_VERSION,
  knowledgeTree: [],
  flashcards: [],
  checkins: [],
  tracks: [],
  settings: DEFAULT_SETTINGS,
};
