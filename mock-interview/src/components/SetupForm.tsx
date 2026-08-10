"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getTracks } from "@/lib/session";
import { createLocalSession } from "@/lib/storage";
import type {
  DurationMinutes,
  InterviewMode,
  RoleFocus,
  SessionConfig,
} from "@/lib/types";

const ROLES: { id: RoleFocus; label: string; hint: string }[] = [
  {
    id: "react-native",
    label: "React Native",
    hint: "Mobile, bridge, native modules",
  },
  {
    id: "fullstack",
    label: "Full-stack",
    hint: "RN/React + NestJS + SQL",
  },
  {
    id: "frontend",
    label: "Frontend",
    hint: "React, Next.js, TS",
  },
  {
    id: "backend",
    label: "Backend",
    hint: "NestJS, Node, databases",
  },
];

export function SetupForm() {
  const router = useRouter();
  const tracks = useMemo(() => getTracks(), []);
  const [selectedTracks, setSelectedTracks] = useState<string[]>([
    "react-native",
    "typescript-javascript",
  ]);
  const [role, setRole] = useState<RoleFocus>("react-native");
  const [duration, setDuration] = useState<DurationMinutes>(30);
  const [mode, setMode] = useState<InterviewMode>("mixed");
  const [seniority, setSeniority] = useState<"mid" | "senior">("mid");
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  function toggleTrack(id: string) {
    setSelectedTracks((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function start() {
    if (!selectedTracks.length) {
      alert("Pick at least one track.");
      return;
    }
    const config: SessionConfig = {
      tracks: selectedTracks,
      role,
      durationMinutes: duration,
      mode,
      seniority,
      voiceEnabled,
    };
    const session = createLocalSession(config);
    router.push(`/interview/${session.id}`);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <header className="mb-12">
        <p
          className="mb-3 text-sm tracking-[0.2em] uppercase"
          style={{ color: "var(--muted)" }}
        >
          Personal practice
        </p>
        <h1
          className="mb-4 text-5xl leading-tight md:text-6xl"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
        >
          Mock Round
        </h1>
        <p className="max-w-xl text-lg" style={{ color: "var(--muted)" }}>
          An AI interviewer grounded in your prep notes. Answer out loud or in
          text, write code when asked, get a scored report when you&apos;re done.
        </p>
      </header>

      <section
        className="space-y-8 rounded-2xl p-6 md:p-8"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--line)",
        }}
      >
        <fieldset>
          <legend className="mb-3 text-sm font-semibold tracking-wide uppercase">
            Tracks
          </legend>
          <div className="flex flex-wrap gap-2">
            {tracks.map((t) => {
              const on = selectedTracks.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTrack(t.id)}
                  className="rounded-lg px-3 py-2 text-sm transition"
                  style={{
                    background: on ? "var(--accent-soft)" : "var(--bg-soft)",
                    color: on ? "var(--accent)" : "var(--ink)",
                    border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                  }}
                >
                  {t.label}
                  <span className="ml-2 opacity-60">{t.count}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-semibold tracking-wide uppercase">
            Role focus
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {ROLES.map((r) => {
              const on = role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className="rounded-xl px-4 py-3 text-left transition"
                  style={{
                    background: on ? "var(--accent-soft)" : "var(--bg-soft)",
                    border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                  }}
                >
                  <div className="font-medium">{r.label}</div>
                  <div className="text-sm" style={{ color: "var(--muted)" }}>
                    {r.hint}
                  </div>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-6 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-3 text-sm font-semibold tracking-wide uppercase">
              Duration
            </legend>
            <div className="flex gap-2">
              {([15, 30, 45] as DurationMinutes[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className="flex-1 rounded-lg py-2 text-sm"
                  style={{
                    background:
                      duration === d ? "var(--accent)" : "var(--bg-soft)",
                    color: duration === d ? "#041018" : "var(--ink)",
                    fontWeight: 600,
                  }}
                >
                  {d}m
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold tracking-wide uppercase">
              Seniority
            </legend>
            <div className="flex gap-2">
              {(["mid", "senior"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeniority(s)}
                  className="flex-1 rounded-lg py-2 text-sm capitalize"
                  style={{
                    background:
                      seniority === s ? "var(--accent)" : "var(--bg-soft)",
                    color: seniority === s ? "#041018" : "var(--ink)",
                    fontWeight: 600,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <fieldset>
          <legend className="mb-3 text-sm font-semibold tracking-wide uppercase">
            Mode
          </legend>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("conceptual")}
              className="rounded-lg px-4 py-2 text-sm"
              style={{
                background:
                  mode === "conceptual" ? "var(--accent-soft)" : "var(--bg-soft)",
                border: `1px solid ${
                  mode === "conceptual" ? "var(--accent)" : "var(--line)"
                }`,
              }}
            >
              Conceptual only
            </button>
            <button
              type="button"
              onClick={() => setMode("mixed")}
              className="rounded-lg px-4 py-2 text-sm"
              style={{
                background:
                  mode === "mixed" ? "var(--accent-soft)" : "var(--bg-soft)",
                border: `1px solid ${
                  mode === "mixed" ? "var(--accent)" : "var(--line)"
                }`,
              }}
            >
              Mixed (+ live coding)
            </button>
            <label
              className="ml-auto flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm"
              style={{
                background: voiceEnabled
                  ? "var(--candidate-soft)"
                  : "var(--bg-soft)",
                border: `1px solid ${
                  voiceEnabled ? "var(--candidate)" : "var(--line)"
                }`,
              }}
            >
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(e) => setVoiceEnabled(e.target.checked)}
                className="accent-[var(--candidate)]"
              />
              Voice
            </label>
          </div>
        </fieldset>

        <button
          type="button"
          onClick={start}
          className="w-full rounded-xl py-4 text-base font-semibold transition hover:brightness-110"
          style={{
            background: "var(--accent)",
            color: "#041018",
          }}
        >
          Start interview
        </button>
      </section>
    </div>
  );
}
