# Interview notes website

Vite + React reader for this repo — same idea as the DevOps study pack: **theory in markdown**, optional **flashcards** per topic.

## Local

```bash
cd website
npm install
npm run dev          # http://127.0.0.1:5173 — live notes via /api
```

## GitHub Pages

Repo is [dyst995/preparation](https://github.com/dyst995/preparation). The site is a **project site** at:

**https://dyst995.github.io/preparation/**

Push to `master` runs [`.github/workflows/pages.yml`](../.github/workflows/pages.yml): it builds with `BASE_PATH=/preparation/` and deploys static `dist/` (catalog + notes baked into `data/`).

One-time setup in the GitHub repo:

1. **Settings → Pages → Build and deployment → Source:** GitHub Actions
2. Push (or run the workflow manually)

Local production check:

```bash
npm run build:pages
npm run preview:pages
```

The catalog is built from:

| Kind | Where | Tabs |
|---|---|---|
| Study units | `interview-prep/<track>/NN. topic-name/` | Notes, Self-test, Answers, Repetition, Flashcards (if present) |
| DSA units | `interview-dsa/NN. topic-name/` | Notes, Techniques, Problems, Flashcards |
| Chapters | track-root `01-foo.md` files | Notes, Flashcards |

Flashcards are **not** auto-generated. A **Flashcards** tab appears only when the file exists:

- Study unit: `flashcards.json` next to `notes.md`
- Chapter: `01-foo.flashcards.json` next to `01-foo.md`

Deck shape (same as the DevOps site):

```json
{
  "title": "Topic name",
  "subtitle": "One-line what this deck drills",
  "frontLabel": "Prompt",
  "modeForward": "Prompt → meaning",
  "modeReverse": "Meaning → prompt",
  "cards": [
    {
      "id": "stable-id",
      "front": "What you see first",
      "meaning": "The answer",
      "example": "optional code / phrase",
      "notes": "optional extra line"
    }
  ]
}
```

Do not add decks until you pick the topics.
