"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnswerInput } from "@/components/AnswerInput";
import { ChatTranscript } from "@/components/ChatTranscript";
import { CodeEditor } from "@/components/CodeEditor";
import {
  VoiceControls,
  speakText,
  stopSpeaking,
} from "@/components/VoiceControls";
import {
  attachFeedback,
  loadSession,
  newMessageId,
  saveSession,
} from "@/lib/storage";
import type { ChatMessage, InterviewSession } from "@/lib/types";

function parseCodingMarker(text: string): string | null {
  const m = text.match(/\[CODING_ROUND\s+id=([^\]]+)\]/);
  return m?.[1]?.trim() || null;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function streamTurn(opts: {
  session: InterviewSession;
  messages: ChatMessage[];
  start?: boolean;
  endSignal?: boolean;
  onDelta: (full: string) => void;
}): Promise<string> {
  const res = await fetch("/api/interview/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      config: opts.session.config,
      pack: opts.session.pack,
      messages: opts.messages,
      start: opts.start,
      endSignal: opts.endSignal,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Turn failed (${res.status})`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as { content?: string; error?: string };
        if (json.error) throw new Error(json.error);
        if (json.content) {
          full += json.content;
          opts.onDelta(full);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  return full;
}

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [answer, setAnswer] = useState("");
  const [code, setCode] = useState("");
  const [codeExplanation, setCodeExplanation] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const startedRef = useRef(false);
  const endingRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = loadSession(sessionId);
    if (!s) {
      router.replace("/");
      return;
    }
    if (s.status === "complete" && s.feedback) {
      router.replace(`/feedback/${s.id}`);
      return;
    }
    setSession(s);
    const elapsed = Math.floor(
      (Date.now() - new Date(s.startedAt).getTime()) / 1000
    );
    setRemaining(Math.max(0, s.config.durationMinutes * 60 - elapsed));
  }, [sessionId, router]);

  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r === null) return r;
        return Math.max(0, r - 1);
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [session?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages, streaming]);

  const persist = useCallback((next: InterviewSession) => {
    setSession(next);
    saveSession(next);
  }, []);

  const runInterviewer = useCallback(
    async (
      current: InterviewSession,
      messages: ChatMessage[],
      opts?: { start?: boolean; endSignal?: boolean }
    ) => {
      setBusy(true);
      setStreaming("");
      setError(null);
      try {
        const full = await streamTurn({
          session: current,
          messages,
          start: opts?.start,
          endSignal: opts?.endSignal,
          onDelta: setStreaming,
        });

        const codingId = parseCodingMarker(full);
        const msg: ChatMessage = {
          id: newMessageId(),
          role: "interviewer",
          content: full,
          kind: "text",
          relatedQuestionId: codingId || undefined,
          createdAt: new Date().toISOString(),
        };

        const next: InterviewSession = {
          ...current,
          messages: [...messages, msg],
          codingActive: Boolean(codingId),
          activeCodingQuestionId: codingId,
        };

        if (codingId) {
          const q = current.pack.find((p) => p.id === codingId);
          setCode(q?.starterCode || `// ${q?.question || "Solve here"}\n\n`);
        }

        persist(next);
        setStreaming(null);

        if (current.config.voiceEnabled) {
          const speakable = full
            .replace(/^\[CODING_ROUND[^\]]*\]\s*/m, "")
            .trim();
          void speakText(speakable);
        }

        return next;
      } catch (err) {
        setStreaming(null);
        setError(err instanceof Error ? err.message : "Request failed");
        return current;
      } finally {
        setBusy(false);
      }
    },
    [persist]
  );

  useEffect(() => {
    if (!session || startedRef.current) return;
    if (session.messages.length > 0) {
      startedRef.current = true;
      return;
    }
    startedRef.current = true;
    void runInterviewer(session, [], { start: true });
  }, [session, runInterviewer]);

  const endInterview = useCallback(
    async (current: InterviewSession) => {
      if (endingRef.current) return;
      endingRef.current = true;
      stopSpeaking();
      setBusy(true);
      setError(null);

      try {
        const wrapped = await runInterviewer(current, current.messages, {
          endSignal: true,
        });

        const grading: InterviewSession = {
          ...wrapped,
          status: "grading",
        };
        persist(grading);
        setBusy(true);

        const res = await fetch("/api/interview/grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config: grading.config,
            pack: grading.pack,
            messages: grading.messages,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Grading failed");

        attachFeedback(grading.id, data.feedback);
        router.push(`/feedback/${grading.id}`);
      } catch (err) {
        endingRef.current = false;
        setError(err instanceof Error ? err.message : "Could not end interview");
        persist({ ...current, status: "active" });
        setBusy(false);
      }
    },
    [persist, router, runInterviewer]
  );

  // Auto-end when timer hits 0
  useEffect(() => {
    if (!session || remaining === null || remaining > 0 || session.status !== "active")
      return;
    if (endingRef.current) return;
    void endInterview(session);
  }, [remaining, session, endInterview]);

  async function sendTextAnswer(text: string) {
    if (!session || !text.trim() || busy) return;
    stopSpeaking();
    const candidate: ChatMessage = {
      id: newMessageId(),
      role: "candidate",
      content: text.trim(),
      kind: "text",
      createdAt: new Date().toISOString(),
    };
    const messages = [...session.messages, candidate];
    const next = { ...session, messages, codingActive: false };
    persist(next);
    setAnswer("");
    await runInterviewer(next, messages);
  }

  async function sendCodeAnswer() {
    if (!session || !code.trim() || busy) return;
    stopSpeaking();
    const content = [
      "```typescript",
      code.trim(),
      "```",
      codeExplanation ? `\nApproach: ${codeExplanation}` : "",
    ].join("\n");

    const candidate: ChatMessage = {
      id: newMessageId(),
      role: "candidate",
      content,
      kind: "code",
      codeLanguage: "typescript",
      relatedQuestionId: session.activeCodingQuestionId || undefined,
      createdAt: new Date().toISOString(),
    };
    const messages = [...session.messages, candidate];
    const next = {
      ...session,
      messages,
      codingActive: false,
      activeCodingQuestionId: null,
    };
    persist(next);
    setCodeExplanation("");
    await runInterviewer(next, messages);
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ color: "var(--muted)" }}>
        Loading session…
      </div>
    );
  }

  const approxQ = Math.min(
    session.pack.length,
    Math.max(
      1,
      session.messages.filter((m) => m.role === "interviewer").length
    )
  );

  return (
    <div className="flex h-screen flex-col">
      <header
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6"
        style={{
          borderBottom: "1px solid var(--line)",
          background: "rgba(12,18,34,0.85)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div>
          <div
            className="text-lg font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Mock Round
          </div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            Q ~{approxQ} of {session.pack.length} · {session.config.role} ·{" "}
            {session.config.seniority}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="rounded-lg px-3 py-1.5 font-mono text-sm"
            style={{
              background:
                remaining !== null && remaining < 60
                  ? "rgba(232,93,93,0.2)"
                  : "var(--bg-soft)",
              color:
                remaining !== null && remaining < 60
                  ? "var(--danger)"
                  : "var(--ink)",
            }}
          >
            {remaining === null ? "--:--" : formatTime(remaining)}
          </div>
          <button
            type="button"
            disabled={busy && session.status === "grading"}
            onClick={() => void endInterview(session)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium"
            style={{
              background: "var(--bg-soft)",
              border: "1px solid var(--line)",
            }}
          >
            {session.status === "grading" ? "Grading…" : "End interview"}
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden">
        <ChatTranscript
          messages={session.messages}
          streaming={streaming ?? undefined}
          voiceEnabled={session.config.voiceEnabled}
          onReplay={(text) => void speakText(text)}
        />
        <div ref={bottomRef} />

        <div
          className="space-y-3 px-4 py-4 md:px-6"
          style={{
            borderTop: "1px solid var(--line)",
            background: "var(--bg-elevated)",
          }}
        >
          {error && (
            <p className="text-sm" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}

          {session.codingActive ? (
            <CodeEditor
              value={code}
              onChange={setCode}
              explanation={codeExplanation}
              onExplanationChange={setCodeExplanation}
              onSubmit={() => void sendCodeAnswer()}
              disabled={busy}
            />
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <div className="flex-1">
                  <AnswerInput
                    value={answer}
                    onChange={setAnswer}
                    onSend={() => void sendTextAnswer(answer)}
                    disabled={busy || session.status !== "active"}
                  />
                </div>
                <VoiceControls
                  enabled={session.config.voiceEnabled}
                  disabled={busy || session.status !== "active"}
                  onTranscribed={(text) => {
                    setAnswer((prev) => (prev ? `${prev} ${text}` : text));
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
