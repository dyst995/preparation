import { NextRequest } from "next/server";
import { CHAT_MODEL, getOpenAI } from "@/lib/openai";
import {
  OPENING_USER_NUDGE,
  buildInterviewerSystemPrompt,
} from "@/lib/prompts";
import type { ChatMessage, SessionConfig, SessionPackQuestion } from "@/lib/types";

export const runtime = "nodejs";

interface TurnBody {
  config: SessionConfig;
  pack: SessionPackQuestion[];
  messages: ChatMessage[];
  /** When true, nudge the model to start the interview */
  start?: boolean;
  endSignal?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TurnBody;
    const { config, pack, messages, start, endSignal } = body;

    if (!config || !pack?.length) {
      return Response.json(
        { error: "config and pack are required" },
        { status: 400 }
      );
    }

    const openai = getOpenAI();
    const system = buildInterviewerSystemPrompt(config, pack);

    const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] =
      [{ role: "system", content: system }];

    for (const m of messages) {
      chatMessages.push({
        role: m.role === "interviewer" ? "assistant" : "user",
        content: m.content,
      });
    }

    if (start && messages.length === 0) {
      chatMessages.push({ role: "user", content: OPENING_USER_NUDGE });
    }

    if (endSignal) {
      chatMessages.push({
        role: "user",
        content:
          "Please wrap up the interview now with a brief one-sentence closing. Do not give a scorecard.",
      });
    }

    const stream = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 800,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Stream failed";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: message })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
