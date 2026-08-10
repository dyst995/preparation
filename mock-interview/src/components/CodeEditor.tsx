"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

const Monaco = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-64 items-center justify-center rounded-xl text-sm"
      style={{ background: "var(--bg-soft)", color: "var(--muted)" }}
    >
      Loading editor…
    </div>
  ),
});

export function CodeEditor({
  value,
  onChange,
  explanation,
  onExplanationChange,
  onSubmit,
  onRun,
  disabled,
  language = "typescript",
}: {
  value: string;
  onChange: (v: string) => void;
  explanation: string;
  onExplanationChange: (v: string) => void;
  onSubmit: () => void;
  onRun?: (output: string) => void;
  disabled?: boolean;
  language?: string;
}) {
  const [runOutput, setRunOutput] = useState<string | null>(null);

  const runCode = useCallback(() => {
    try {
      // Lightweight eval for pure JS snippets
      // eslint-disable-next-line no-new-func
      const fn = new Function(`${value}\n;//# sourceURL=mock-run.js`);
      const logs: string[] = [];
      const original = console.log;
      console.log = (...args: unknown[]) => {
        logs.push(args.map(String).join(" "));
      };
      try {
        const result = fn();
        if (result !== undefined) logs.push(String(result));
      } finally {
        console.log = original;
      }
      const out = logs.join("\n") || "(ran with no output)";
      setRunOutput(out);
      onRun?.(out);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setRunOutput(`Error: ${msg}`);
      onRun?.(msg);
    }
  }, [value, onRun]);

  return (
    <div className="space-y-3">
      <div
        className="overflow-hidden rounded-xl"
        style={{ border: "1px solid var(--line)" }}
      >
        <div
          className="flex items-center justify-between px-3 py-2 text-xs"
          style={{ background: "var(--bg-elevated)", color: "var(--muted)" }}
        >
          <span>Live coding · {language}</span>
          <button
            type="button"
            onClick={runCode}
            disabled={disabled}
            className="rounded px-2 py-1"
            style={{ background: "var(--bg-soft)" }}
          >
            Run
          </button>
        </div>
        <Monaco
          height="280px"
          language={language === "typescript" ? "typescript" : "javascript"}
          theme="vs-dark"
          value={value}
          onChange={(v) => onChange(v ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "IBM Plex Mono, ui-monospace, monospace",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            readOnly: disabled,
          }}
        />
      </div>

      {runOutput !== null && (
        <pre
          className="max-h-28 overflow-auto rounded-lg p-3 text-xs"
          style={{
            background: "var(--bg-soft)",
            color: "var(--muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {runOutput}
        </pre>
      )}

      <textarea
        value={explanation}
        onChange={(e) => onExplanationChange(e.target.value)}
        disabled={disabled}
        rows={2}
        placeholder="Optional: briefly explain your approach / complexity…"
        className="w-full resize-none rounded-xl px-4 py-3 outline-none"
        style={{
          background: "var(--bg-soft)",
          border: "1px solid var(--line)",
          color: "var(--ink)",
        }}
      />

      <button
        type="button"
        disabled={disabled || !value.trim()}
        onClick={onSubmit}
        className="w-full rounded-xl py-3 font-semibold disabled:opacity-40"
        style={{ background: "var(--candidate)", color: "#041018" }}
      >
        Submit code answer
      </button>
    </div>
  );
}
