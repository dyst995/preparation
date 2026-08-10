# Mock Round — AI Interviewer

Personal mock-interview app grounded in your `interview-prep/` and `interview-dsa/` materials.

## Quick start

```bash
cd mock-interview
cp .env.example .env.local
# Add your OpenAI API key to .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **Setup**: pick tracks, role focus, duration, mid/senior bar, conceptual vs mixed (+ coding), voice toggle
- **Live interview**: streaming AI interviewer with follow-ups from your question bank
- **Live coding**: Monaco editor when the interviewer starts a coding round
- **Voice**: hold-to-speak (Whisper) + interviewer TTS (OpenAI)
- **Feedback**: scored report with strengths, gaps, per-topic scores, and study-next chapter paths

## Scripts

| Command | Description |
|---|---|
| `npm run generate` | Rebuild `src/data/question-bank.json` from markdown |
| `npm run dev` | Generate + start Next.js |
| `npm run build` | Production build |

## Env

```bash
OPENAI_API_KEY=sk-...
# optional
OPENAI_CHAT_MODEL=gpt-4o
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy
```
