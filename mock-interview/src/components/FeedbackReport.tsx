"use client";

import type { FeedbackReport as Feedback } from "@/lib/types";
import Link from "next/link";

function scoreColor(score: number) {
  if (score >= 8) return "var(--candidate)";
  if (score >= 6) return "var(--accent)";
  if (score >= 4) return "var(--warning)";
  return "var(--danger)";
}

export function FeedbackReportView({
  feedback,
  durationLabel,
}: {
  feedback: Feedback;
  durationLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <header>
        <p
          className="mb-2 text-sm tracking-[0.2em] uppercase"
          style={{ color: "var(--muted)" }}
        >
          Session feedback
          {durationLabel ? ` · ${durationLabel}` : ""}
        </p>
        <h1
          className="mb-2 text-4xl md:text-5xl"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
        >
          {feedback.hireSignal}
        </h1>
        <div className="flex items-baseline gap-3">
          <span
            className="text-5xl font-semibold"
            style={{ color: scoreColor(feedback.overallScore) }}
          >
            {feedback.overallScore}
          </span>
          <span style={{ color: "var(--muted)" }}>/ 10</span>
        </div>
        <p className="mt-4 text-lg leading-relaxed" style={{ color: "var(--muted)" }}>
          {feedback.summary}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <section
          className="rounded-2xl p-5"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--line)" }}
        >
          <h2 className="mb-3 font-semibold" style={{ color: "var(--candidate)" }}>
            Strengths
          </h2>
          <ul className="space-y-2 text-sm leading-relaxed">
            {feedback.strengths.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </section>
        <section
          className="rounded-2xl p-5"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--line)" }}
        >
          <h2 className="mb-3 font-semibold" style={{ color: "var(--warning)" }}>
            Gaps
          </h2>
          <ul className="space-y-2 text-sm leading-relaxed">
            {feedback.gaps.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </section>
      </div>

      {feedback.missedFollowUps?.length > 0 && (
        <section
          className="rounded-2xl p-5"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--line)" }}
        >
          <h2 className="mb-3 font-semibold">Missed follow-ups</h2>
          <ul className="space-y-2 text-sm" style={{ color: "var(--muted)" }}>
            {feedback.missedFollowUps.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </section>
      )}

      {feedback.perTopic?.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">By topic</h2>
          <div className="space-y-2">
            {feedback.perTopic.map((t, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-4 rounded-xl px-4 py-3"
                style={{ background: "var(--bg-soft)" }}
              >
                <div>
                  <div className="font-medium">{t.trackLabel || t.track}</div>
                  <div className="text-sm" style={{ color: "var(--muted)" }}>
                    {t.notes}
                  </div>
                </div>
                <span
                  className="text-xl font-semibold"
                  style={{ color: scoreColor(t.score) }}
                >
                  {t.score}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {feedback.studyNext?.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Study next</h2>
          <div className="space-y-2">
            {feedback.studyNext.map((s, i) => (
              <div
                key={i}
                className="rounded-xl px-4 py-3"
                style={{
                  background: "var(--accent-soft)",
                  border: "1px solid rgba(61,156,240,0.25)",
                }}
              >
                <div className="font-medium">{s.chapterLabel}</div>
                <code
                  className="text-xs"
                  style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}
                >
                  {s.file}
                </code>
                <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                  {s.reason}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {feedback.perAnswer && feedback.perAnswer.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Per answer</h2>
          <div className="space-y-2">
            {feedback.perAnswer.map((a, i) => (
              <div
                key={i}
                className="rounded-xl px-4 py-3"
                style={{ background: "var(--bg-soft)" }}
              >
                <div className="flex justify-between gap-3">
                  <div className="text-sm font-medium">{a.questionSnippet}</div>
                  <span style={{ color: scoreColor(a.score) }}>{a.score}/10</span>
                </div>
                <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                  {a.notes}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex gap-3 pt-4">
        <Link
          href="/"
          className="rounded-xl px-5 py-3 font-semibold"
          style={{ background: "var(--accent)", color: "#041018" }}
        >
          New interview
        </Link>
      </div>
    </div>
  );
}
