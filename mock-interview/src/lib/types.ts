export type QuestionType = "conceptual" | "coding" | "behavioral";
export type Difficulty = "mid" | "senior";
export type RoleFocus =
  | "react-native"
  | "fullstack"
  | "frontend"
  | "backend";
export type InterviewMode = "conceptual" | "mixed";
export type DurationMinutes = 15 | 30 | 45;

export interface QuestionItem {
  id: string;
  track: string;
  trackLabel: string;
  chapter: string;
  chapterLabel: string;
  file: string;
  topic: string;
  question: string;
  modelAnswer: string;
  type: QuestionType;
  difficulty: Difficulty | string;
  starterCode: string | null;
}

export interface TrackMeta {
  id: string;
  label: string;
  count: number;
  conceptual: number;
  coding: number;
  behavioral: number;
  chapters: {
    id: string;
    label: string;
    file: string;
    count: number;
  }[];
}

export interface QuestionBank {
  generatedAt: string;
  totalQuestions: number;
  byType: Record<QuestionType, number>;
  tracks: TrackMeta[];
  questions: QuestionItem[];
}

export interface SessionConfig {
  tracks: string[];
  role: RoleFocus;
  durationMinutes: DurationMinutes;
  mode: InterviewMode;
  seniority: "mid" | "senior";
  voiceEnabled: boolean;
}

export interface ChatMessage {
  id: string;
  role: "interviewer" | "candidate";
  content: string;
  kind?: "text" | "code";
  codeLanguage?: string;
  relatedQuestionId?: string;
  createdAt: string;
}

export interface SessionPackQuestion {
  id: string;
  track: string;
  trackLabel: string;
  chapter: string;
  chapterLabel: string;
  file: string;
  topic: string;
  question: string;
  modelAnswer: string;
  type: QuestionType;
  difficulty: string;
  starterCode: string | null;
}

export interface InterviewSession {
  id: string;
  config: SessionConfig;
  pack: SessionPackQuestion[];
  messages: ChatMessage[];
  startedAt: string;
  endedAt?: string;
  codingActive?: boolean;
  activeCodingQuestionId?: string | null;
  status: "active" | "grading" | "complete";
  feedback?: FeedbackReport;
}

export interface FeedbackReport {
  overallScore: number;
  hireSignal: string;
  summary: string;
  strengths: string[];
  gaps: string[];
  missedFollowUps: string[];
  perTopic: {
    track: string;
    trackLabel: string;
    score: number;
    notes: string;
  }[];
  studyNext: {
    file: string;
    chapterLabel: string;
    reason: string;
  }[];
  perAnswer?: {
    questionSnippet: string;
    score: number;
    notes: string;
  }[];
}
