import { NextRequest } from "next/server";
import { TTS_MODEL, TTS_VOICE, getOpenAI } from "@/lib/openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { text } = (await req.json()) as { text?: string };
    if (!text?.trim()) {
      return Response.json({ error: "text is required" }, { status: 400 });
    }

    // Strip coding markers before speaking
    const speakable = text
      .replace(/^\[CODING_ROUND[^\]]*\]\s*/m, "")
      .replace(/\[CODING_ROUND[^\]]*\]/g, "")
      .trim()
      .slice(0, 4000);

    if (!speakable) {
      return Response.json({ error: "nothing to speak" }, { status: 400 });
    }

    const openai = getOpenAI();
    const response = await openai.audio.speech.create({
      model: TTS_MODEL,
      voice: TTS_VOICE as "alloy",
      input: speakable,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    return new Response(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TTS failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
