"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function VoiceControls({
  enabled,
  disabled,
  onTranscribed,
}: {
  enabled: boolean;
  disabled?: boolean;
  onTranscribed: (text: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const stop = useCallback(async () => {
    const recorder = mediaRef.current;
    if (!recorder || recorder.state === "inactive") {
      setListening(false);
      return;
    }

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    setListening(false);

    const blob = new Blob(chunksRef.current, {
      type: recorder.mimeType || "audio/webm",
    });
    chunksRef.current = [];
    mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
    mediaRef.current = null;

    if (blob.size < 500) {
      setError("Recording too short — hold the button while speaking.");
      return;
    }

    try {
      setError(null);
      const form = new FormData();
      form.append("audio", blob, "answer.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed");
      if (data.text) onTranscribed(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transcription failed");
    }
  }, [onTranscribed]);

  const start = useCallback(async () => {
    if (disabled || !enabled) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRef.current = recorder;
      recorder.start(200);
      setListening(true);
    } catch {
      setError("Microphone permission denied.");
    }
  }, [disabled, enabled]);

  if (!enabled) return null;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={disabled}
        onMouseDown={start}
        onMouseUp={stop}
        onMouseLeave={() => {
          if (listening) void stop();
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          void start();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          void stop();
        }}
        className="rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-40"
        style={{
          background: listening ? "var(--danger)" : "var(--bg-soft)",
          color: listening ? "#fff" : "var(--ink)",
          border: "1px solid var(--line)",
        }}
      >
        {listening ? "Listening… release to send" : "Hold to speak"}
      </button>
      {error && (
        <p className="text-xs" style={{ color: "var(--danger)" }}>
          {error} — you can still type your answer.
        </p>
      )}
    </div>
  );
}

let currentAudio: HTMLAudioElement | null = null;

export async function speakText(
  text: string,
  opts?: { autoplay?: boolean }
): Promise<void> {
  if (!text.trim()) return;
  try {
    currentAudio?.pause();
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "TTS failed");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    if (opts?.autoplay !== false) {
      await audio.play();
    }
    audio.onended = () => URL.revokeObjectURL(url);
  } catch {
    // Voice is best-effort; text remains available
  }
}

export function stopSpeaking() {
  currentAudio?.pause();
  currentAudio = null;
}
