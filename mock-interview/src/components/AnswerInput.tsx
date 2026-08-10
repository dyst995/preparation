"use client";

import { useEffect, useRef } from "react";

export function AnswerInput({
  value,
  onChange,
  onSend,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled]);

  return (
    <div className="flex gap-2">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={3}
        placeholder={placeholder || "Type your answer… (Enter to send, Shift+Enter for newline)"}
        className="flex-1 resize-none rounded-xl px-4 py-3 outline-none"
        style={{
          background: "var(--bg-soft)",
          border: "1px solid var(--line)",
          color: "var(--ink)",
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!disabled && value.trim()) onSend();
          }
        }}
      />
      <button
        type="button"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="self-end rounded-xl px-5 py-3 font-semibold disabled:opacity-40"
        style={{ background: "var(--accent)", color: "#041018" }}
      >
        Send
      </button>
    </div>
  );
}
