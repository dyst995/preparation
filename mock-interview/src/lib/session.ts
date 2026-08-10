import type {
  InterviewMode,
  QuestionBank,
  QuestionItem,
  SessionConfig,
  SessionPackQuestion,
} from "./types";
import bankJson from "@/data/question-bank.json";

const bank = bankJson as QuestionBank;

export function getQuestionBank(): QuestionBank {
  return bank;
}

export function getTracks() {
  return bank.tracks;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function packSizeForDuration(minutes: number): number {
  if (minutes <= 15) return 5;
  if (minutes <= 30) return 8;
  return 12;
}

function toPackItem(q: QuestionItem): SessionPackQuestion {
  return {
    id: q.id,
    track: q.track,
    trackLabel: q.trackLabel,
    chapter: q.chapter,
    chapterLabel: q.chapterLabel,
    file: q.file,
    topic: q.topic,
    question: q.question,
    modelAnswer: q.modelAnswer.slice(0, 1200),
    type: q.type,
    difficulty: q.difficulty,
    starterCode: q.starterCode,
  };
}

function filterBySeniority(
  items: QuestionItem[],
  seniority: SessionConfig["seniority"]
): QuestionItem[] {
  if (seniority === "senior") {
    const senior = items.filter(
      (i) =>
        i.difficulty === "senior" ||
        /senior|staff|harder/i.test(i.topic) ||
        /senior|staff|harder/i.test(i.question)
    );
    // Prefer senior but backfill with mid
    if (senior.length >= 3) {
      return [...senior, ...items.filter((i) => !senior.includes(i))];
    }
  }
  return items;
}

/**
 * Sample a session question pack from selected tracks.
 * Mixed mode includes ~25–35% coding items when available.
 */
export function sampleQuestionPack(
  config: SessionConfig
): SessionPackQuestion[] {
  const size = packSizeForDuration(config.durationMinutes);
  const selected = new Set(config.tracks);

  let pool = bank.questions.filter((q) => selected.has(q.track));
  if (!pool.length) {
    pool = bank.questions.filter((q) => q.track !== "dsa");
  }

  pool = filterBySeniority(pool, config.seniority);

  const conceptual = shuffle(
    pool.filter((q) => q.type === "conceptual" || q.type === "behavioral")
  );
  const coding = shuffle(pool.filter((q) => q.type === "coding"));

  // If mixed and DSA selected or coding available, include coding
  const wantCoding =
    config.mode === "mixed" ||
    config.tracks.includes("dsa");

  const codingCount = wantCoding
    ? Math.max(1, Math.min(coding.length, Math.round(size * 0.3)))
    : 0;

  const picked: QuestionItem[] = [];
  picked.push(...coding.slice(0, codingCount));
  picked.push(...conceptual.slice(0, size - picked.length));

  // Backfill if short
  if (picked.length < size) {
    const remaining = shuffle(
      pool.filter((q) => !picked.some((p) => p.id === q.id))
    );
    picked.push(...remaining.slice(0, size - picked.length));
  }

  return shuffle(picked).slice(0, size).map(toPackItem);
}

export function defaultConfig(): SessionConfig {
  return {
    tracks: ["react-native", "typescript-javascript"],
    role: "react-native",
    durationMinutes: 30,
    mode: "mixed" as InterviewMode,
    seniority: "mid",
    voiceEnabled: false,
  };
}

export function createSessionId(): string {
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
