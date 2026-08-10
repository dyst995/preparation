import { NextRequest } from "next/server";
import { WHISPER_MODEL, getOpenAI } from "@/lib/openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("audio");

    if (!file || !(file instanceof Blob)) {
      return Response.json(
        { error: "audio file is required" },
        { status: 400 }
      );
    }

    const openai = getOpenAI();
    const filename =
      (file as File).name ||
      `recording.${file.type.includes("mp4") ? "mp4" : "webm"}`;

    const transcription = await openai.audio.transcriptions.create({
      file: new File([file], filename, {
        type: file.type || "audio/webm",
      }),
      model: WHISPER_MODEL,
      language: "en",
    });

    return Response.json({ text: transcription.text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
