"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FeedbackReportView } from "@/components/FeedbackReport";
import { loadSession } from "@/lib/storage";
import type { InterviewSession } from "@/lib/types";

export default function FeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<InterviewSession | null>(null);

  useEffect(() => {
    const s = loadSession(params.sessionId as string);
    if (!s?.feedback) {
      router.replace("/");
      return;
    }
    setSession(s);
  }, [params.sessionId, router]);

  if (!session?.feedback) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ color: "var(--muted)" }}
      >
        Loading feedback…
      </div>
    );
  }

  const mins = session.config.durationMinutes;
  const elapsed = session.endedAt
    ? Math.round(
        (new Date(session.endedAt).getTime() -
          new Date(session.startedAt).getTime()) /
          60000
      )
    : mins;

  return (
    <FeedbackReportView
      feedback={session.feedback}
      durationLabel={`${elapsed} min session`}
    />
  );
}
