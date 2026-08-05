# Interview Prep Flashcards

A flashcard web app generated from everything in `../interview-prep/`. Practice by topic: React Native, TypeScript, React, Next.js, NestJS, SQL, DevOps.

## Quick start

```bash
cd flashcards-project
npm install
npm run dev
```

Open http://localhost:5173

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Regenerate cards from interview-prep + start dev server |
| `npm run generate` | Parse interview-prep markdown and rebuild `src/data/flashcards.json` |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Features

- **By topic** - filter by track (React Native, NestJS, etc.) and chapter
- **Flip cards** - click to reveal answer
- **Progress** - mark "Got it" or "Still learning" (saved in localStorage)
- **Shuffle** - randomize order within current topic
- **Stats** - mastery % per topic in sidebar

## Regenerating cards

After you update `interview-prep/` content, run:

```bash
npm run generate
```

The parser extracts:
- `**Q: ...**` interview questions with blockquote / model answers
- Rapid-fire `1. **Question** -> answer` pairs
- `## Model answers` sections paired with question banks (when a match exists)

Generic topic checklist cards and unanswered prompts are excluded so every card has a real answer.

## Project structure

```text
flashcards-project/
  scripts/generate-flashcards.mjs   # parser
  src/
    data/flashcards.json            # generated
    components/                     # UI
    App.jsx
```
