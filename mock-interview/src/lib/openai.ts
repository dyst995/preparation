import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error(
        "OPENAI_API_KEY is not set. Copy .env.example to .env.local and add your key."
      );
    }
    client = new OpenAI({ apiKey: key });
  }
  return client;
}

export const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o";
export const TTS_MODEL = process.env.OPENAI_TTS_MODEL || "tts-1";
export const TTS_VOICE = process.env.OPENAI_TTS_VOICE || "alloy";
export const WHISPER_MODEL = "whisper-1";
