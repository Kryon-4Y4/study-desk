import { StudyDeskData } from "../types";

/** 单个知识点的掌握度聚合结果 */
export interface Mastery {
  knowledgeId: string;
  /** 综合掌握度 0-100 */
  score: number;
  /** 闪卡正确率 0-100（无复习数据为 null） */
  flashcardRate: number | null;
  /** 打卡均分 0-100（无打卡数据为 null） */
  checkinAvg: number | null;
}

/** 计算所有知识点的掌握度 */
export function computeMastery(data: StudyDeskData): Mastery[] {
  const ids = new Set<string>();
  for (const n of data.knowledgeTree) ids.add(n.id);
  for (const f of data.flashcards) ids.add(f.knowledgeId);
  for (const c of data.checkins) c.knowledgeIds.forEach((id) => ids.add(id));

  const w = data.settings.weightFlashcard;
  return [...ids].map((id) => {
    const fr = flashcardRate(data, id);
    const ca = checkinAvg(data, id);
    return {
      knowledgeId: id,
      score: combine(fr, ca, w),
      flashcardRate: fr,
      checkinAvg: ca,
    };
  });
}

/** 闪卡正确率 = 答对次数 / 复习次数（跨该知识点所有卡片） */
function flashcardRate(
  data: StudyDeskData,
  knowledgeId: string
): number | null {
  const cards = data.flashcards.filter(
    (c) => c.knowledgeId === knowledgeId && c.reps > 0
  );
  if (cards.length === 0) return null;
  const totalReps = cards.reduce((s, c) => s + c.reps, 0);
  const totalCorrect = cards.reduce((s, c) => s + c.correctCount, 0);
  return totalReps > 0 ? Math.round((totalCorrect / totalReps) * 100) : null;
}

/** 打卡均分：每条记录取 (自评+老师分) 均值，再跨记录平均 */
function checkinAvg(data: StudyDeskData, knowledgeId: string): number | null {
  const related = data.checkins.filter((c) =>
    c.knowledgeIds.includes(knowledgeId)
  );
  const scores: number[] = [];
  for (const c of related) {
    const vals = [c.selfScore, c.teacherScore].filter(
      (v): v is number => v !== null
    );
    if (vals.length) {
      scores.push(vals.reduce((a, b) => a + b, 0) / vals.length);
    }
  }
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function combine(fr: number | null, ca: number | null, w: number): number {
  if (fr === null && ca === null) return 0;
  if (fr === null) return ca as number;
  if (ca === null) return fr;
  return Math.round(fr * w + ca * (1 - w));
}

/** 平均掌握度（所有知识点） */
export function averageMastery(mastery: Mastery[]): number {
  if (mastery.length === 0) return 0;
  return Math.round(
    mastery.reduce((s, m) => s + m.score, 0) / mastery.length
  );
}

/** 今日到期卡片数 */
export function dueCardsToday(data: StudyDeskData): number {
  const end = endOfToday();
  return data.flashcards.filter((f) => f.due <= end).length;
}

/** 本月打卡次数 */
export function checkinsThisMonth(data: StudyDeskData): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return data.checkins.filter((c) => c.date >= start).length;
}

function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
