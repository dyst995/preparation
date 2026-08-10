"use client";

import type { ChatMessage } from "@/lib/types";

function displayContent(content: string) {
  return content.replace(/^\[CODING_ROUND[^\]]*\]\s*/m, "").trim();
}

export function ChatTranscript({
  messages,
  streaming,
  onReplay,
  voiceEnabled,
}: {
  messages: ChatMessage[];
  streaming?: string;
  onReplay?: (text: string) => void;
  voiceEnabled?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 md:px-6">
      {messages.map((m) => {
        const isInterviewer = m.role === "interviewer";
        const text = displayContent(m.content);
        return (
          <div
            key={m.id}
            className={`flex ${isInterviewer ? "justify-start" : "justify-end"}`}
          >
            <div
              className="max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed"
              style={{
                background: isInterviewer
                  ? "var(--bg-soft)"
                  : "var(--candidate-soft)",
                border: `1px solid ${
                  isInterviewer ? "var(--line)" : "rgba(42,157,122,0.25)"
                }`,
                whiteSpace: "pre-wrap",
                fontFamily:
                  m.kind === "code"
                    ? "var(--font-mono)"
                    : "var(--font-body)",
                fontSize: m.kind === "code" ? "13px" : undefined,
              }}
            >
              <div
                className="mb-1 text-[11px] font-semibold tracking-wider uppercase"
                style={{
                  color: isInterviewer ? "var(--accent)" : "var(--candidate)",
                }}
              >
                {isInterviewer ? "Interviewer" : "You"}
                {m.kind === "code" ? " · code" : ""}
              </div>
              {text}
              {isInterviewer && voiceEnabled && onReplay && (
                <button
                  type="button"
                  onClick={() => onReplay(text)}
                  className="mt-2 block text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  Replay audio
                </button>
              )}
            </div>
          </div>
        );
      })}

      {streaming !== undefined && streaming !== null && (
        <div className="flex justify-start">
          <div
            className="max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed"
            style={{
              background: "var(--bg-soft)",
              border: "1px solid var(--line)",
              whiteSpace: "pre-wrap",
            }}
          >
            <div
              className="mb-1 text-[11px] font-semibold tracking-wider uppercase"
              style={{ color: "var(--accent)" }}
            >
              Interviewer
            </div>
            {displayContent(streaming) || (
              <span style={{ color: "var(--muted)" }}>Thinking…</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
