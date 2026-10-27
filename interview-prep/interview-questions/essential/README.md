# Three-day essential index

Curated subset of the senior handbook for **maximum interview prep value in three days**. Selection used weighted scoring (interview relevance 30%, fundamentals 25%, practical use 20%, coverage 15%, senior depth 10%), then human-style ranking for **balanced coverage** and **deduplication**—not raw score alone.

## What is included

| Collection | Source | Selected | Tiers |
|---|---|---:|---|
| [React](./react.md) | 500 handbook Qs | 90 | 40 Must Know · 30 Important · 20 Advanced |
| [NestJS](./nestjs.md) | 500 handbook Qs | 90 | 40 · 30 · 20 |
| [Node.js](./nodejs.md) | 500 handbook Qs | 90 | 40 · 30 · 20 |
| [Databases](./databases.md) | 500 handbook Qs | 90 | 40 · 30 · 20 |
| [TypeScript](./typescript.md) | **New** bank (`../typescript/`) | 100 | 40 · 30 · 30 |

**Total drill items:** 460 (360 curated + 100 TypeScript).

**On the website:** open the **Q&A** tab. Essential tracks are first in the sidebar (`Essential · React`, NestJS, Node.js, Databases, TypeScript), each with Must Know / Important / Advanced. Full TypeScript Q&A (100) and the four full banks follow. Regenerate site bundles with `npm run essential` in `website/` (also runs on `predev` / `prebuild`).

Machine-readable lists: `_react.json`, `_nestjs.json`, `_nodejs.json`, `_databases.json`, `_typescript.json`. Bundles served by the site live in `../essential-site/`.

## Three-day plan

Assume ~6 focused hours/day. Speak answers aloud; cover the written answer until you have tried.

| Day | Morning (~3h) | Afternoon (~3h) |
|---|---|---|
| **1** | React Must Know (40) | Node.js Must Know (40) |
| **2** | NestJS Must Know (40) + Databases Must Know (first 20) | Databases Must Know (rest) + TypeScript Must Know (40) |
| **3** | All four tracks’ Important (30 each) — pick weakest first | Advanced tiers + TypeScript Important/Advanced; retry misses from Day 1–2 |

If time is short, **stop after Must Know**. Important beats Advanced. Do not burn Day 3 on Advanced trivia if Must Know still fails out loud.

## Rules while drilling

1. Read only the **Question**. Answer in under ~90 seconds.
2. Uncover **Answer**. Note the gap in one sentence.
3. Do the **Follow-up** closed-book.
4. Skip IDs you can already teach; re-queue misses for Day 3.

Full handbook and study habits: [../STUDY_GUIDE.md](../STUDY_GUIDE.md). Counts for the full bank: [../PROGRESS.md](../PROGRESS.md).

## Selection principles (summary)

- Prefer concepts that show up in senior interviews and production.
- Strong fundamentals outrank obscure framework internals.
- No near-duplicate concepts unless they test different failure modes.
- Tier = **prep priority**, not difficulty label on the original card.
