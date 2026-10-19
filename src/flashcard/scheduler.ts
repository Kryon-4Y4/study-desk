import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  Card,
  State,
  FSRS,
  Grade,
} from "ts-fsrs";
import { Flashcard, CardState } from "../types";
import { genId } from "../utils/id";

let _f: FSRS | null = null;

function getFSRS(): FSRS {
  if (!_f) {
    _f = fsrs(generatorParameters());
  }
  return _f;
}

function toFsrsCard(fc: Flashcard): Card {
  return {
    due: new Date(fc.due),
    stability: fc.stability,
    difficulty: fc.difficulty,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: fc.reps,
    lapses: 0,
    state: mapState(fc.state),
    last_review: fc.lastReview ? new Date(fc.lastReview) : undefined,
  };
}

function mapState(state: CardState): State {
  switch (state) {
    case "new":
      return State.New;
    case "learning":
      return State.Learning;
    case "review":
      return State.Review;
    case "relearning":
      return State.Relearning;
  }
}

function unmapState(state: State): CardState {
  switch (state) {
    case State.New:
      return "new";
    case State.Learning:
      return "learning";
    case State.Review:
      return "review";
    case State.Relearning:
      return "relearning";
  }
}

/** 创建一张新卡（FSRS 初始状态） */
export function createNewCard(
  knowledgeId: string,
  front: string,
  back: string,
  tags: string[] = []
): Flashcard {
  const empty = createEmptyCard();
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
    correctCount: 0,
  };
}

/** 对卡片评分，返回更新后的卡片 + 是否答对 */
export function grade(
  fc: Flashcard,
  rating: Grade,
  now: Date = new Date()
): { card: Flashcard; correct: boolean } {
  const f = getFSRS();
  const recordLog = f.repeat(toFsrsCard(fc), now);
  const item = recordLog[rating];
  const updated = item.card;

  const correct = rating === 3 /* Good */ || rating === 4 /* Easy */;

  return {
    card: {
      ...fc,
      state: unmapState(updated.state),
      stability: updated.stability,
      difficulty: updated.difficulty,
      due: updated.due.getTime(),
      lastReview: now.getTime(),
      reps: updated.reps,
      correctCount: fc.correctCount + (correct ? 1 : 0),
    },
    correct,
  };
}
