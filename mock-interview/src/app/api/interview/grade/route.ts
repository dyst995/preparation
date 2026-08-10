import { NextRequest } from "next/server";
import { CHAT_MODEL, getOpenAI } from "@/lib/openai";
import { buildGraderSystemPrompt } from "@/lib/prompts";
import type {
  ChatMessage,
  FeedbackReport,
  SessionConfig,
  SessionPackQuestion,
} from "@/lib/types";

export const runtime = "nodejs";

interface GradeBody {
  config: SessionConfig;
  pack: SessionPackQuestion[];
  messages: ChatMessage[];
}

function extractJson(text: string): FeedbackReport {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Grader did not return JSON");
  }
  return JSON.parse(raw.slice(start, end + 1)) as FeedbackReport;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GradeBody;
    const { config, pack, messages } = body;

    if (!config || !pack?.length || !messages?.length) {
      return Response.json(
        { error: "config, pack, and messages are required" },
        { status: 400 }
      );
    }

    const openai = getOpenAI();
    const system = buildGraderSystemPrompt(config, pack);

    const transcript = messages
      .map(
        (m) =>
          `${m.role === "interviewer" ? "Interviewer" : "Candidate"}: ${m.content}`
      )
      .join("\n\n");

    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Here is the full interview transcript. Grade it and return JSON only.\n\n${transcript}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2500,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content || "{}";
    const feedback = extractJson(text);

    // Soft defaults
    feedback.overallScore = Number(feedback.overallScore) || 5;
    feedback.strengths = feedback.strengths || [];
    feedback.gaps = feedback.gaps || [];
    feedback.missedFollowUps = feedback.missedFollowUps || [];
    feedback.perTopic = feedback.perTopic || [];
    feedback.studyNext = feedback.studyNext || [];
    feedback.hireSignal = feedback.hireSignal || "Lean hire";
    feedback.summary = feedback.summary || "No summary generated.";

    return Response.json({ feedback });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
