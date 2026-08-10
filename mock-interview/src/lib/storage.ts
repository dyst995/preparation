import type { FeedbackReport, InterviewSession, SessionConfig } from "./types";
import { createSessionId, sampleQuestionPack } from "./session";

const STORAGE_KEY = "mock-interview-sessions";

export function createLocalSession(config: SessionConfig): InterviewSession {
  const session: InterviewSession = {
    id: createSessionId(),
    config,
    pack: sampleQuestionPack(config),
    messages: [],
    startedAt: new Date().toISOString(),
    codingActive: false,
    activeCodingQuestionId: null,
    status: "active",
  };
  saveSession(session);
  return session;
}

export function loadSession(id: string): InterviewSession | null {
  if (typeof window === "undefined") return null;
  const all = loadAllSessions();
  return all.find((s) => s.id === id) ?? null;
}

export function saveSession(session: InterviewSession): void {
  if (typeof window === "undefined") return;
  const all = loadAllSessions().filter((s) => s.id !== session.id);
  all.unshift(session);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 30)));
}

export function loadAllSessions(): InterviewSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as InterviewSession[];
  } catch {
    return [];
  }
}

export function attachFeedback(
  sessionId: string,
  feedback: FeedbackReport
): InterviewSession | null {
  const session = loadSession(sessionId);
  if (!session) return null;
  session.feedback = feedback;
  session.status = "complete";
  session.endedAt = new Date().toISOString();
  saveSession(session);
  return session;
}

export function newMessageId(): string {
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
