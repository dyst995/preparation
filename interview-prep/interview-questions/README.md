# Senior full-stack interview handbook

Reference of technical interview questions and senior-level answers for React, NestJS, Node.js, databases (PostgreSQL first, plus Redis and document-store concepts), and a dedicated TypeScript bank.

**Full handbook:** 2,000 questions (500 × 4 tracks, 10 sections × 50). **TypeScript add-on:** 100 questions. Completion counts live in [PROGRESS.md](./PROGRESS.md).

**Three-day crunch:** use the curated [essential/](./essential/) index (360 selected + 100 TypeScript = 460 drills), not the full bank.

## Layout

| Track | Folder | IDs |
|---|---|---|
| React | `react/` | `REACT-001` … `REACT-500` |
| NestJS | `nestjs/` | `NEST-001` … `NEST-500` |
| Node.js | `nodejs/` | `NODE-001` … `NODE-500` |
| Databases | `databases/` | `DB-001` … `DB-500` |
| TypeScript | `typescript/` | `TS-001` … `TS-100` |

Each topic file in the four main tracks is 50 questions when complete. TypeScript is two × 50. IDs are global within a track, in file order.

## How to study

For a **3-day senior prep**, start at [essential/README.md](./essential/README.md). Full drill loop: [STUDY_GUIDE.md](./STUDY_GUIDE.md). Section map: [INDEX.md](./INDEX.md). Counts: [PROGRESS.md](./PROGRESS.md).

## Answer length and formatting — mandatory

This is a **senior-level interview reference**. Answers must be easy to understand, remember, and say aloud—not expert shorthand.

### Clarity and readability (mandatory)

1. **Use natural, conversational English.** Write the way an experienced senior engineer explains ideas in a real interview.
2. **Prioritize understanding over terminology.** Say what it is, how it works, and why it matters. Use technical terms only when they help.
3. **Avoid compressed technical shorthand.** Do not pack several complex ideas into dense jargon-heavy sentences.
4. **Keep answers concise but understandable.** Aim for 50–100 words; use fewer when enough. Never sacrifice clarity just to be shorter.
5. **Explain complex internals progressively.** Simple definition → mechanism → practical significance.
6. **Avoid unnecessary repetition.** Every sentence should add useful information.
7. **Preserve senior-level accuracy.** Plain language is not an excuse for superficial or wrong explanations.
8. **Optimize for spoken interviews.** Easy to read aloud and explain naturally.

**Goal:** as easy to understand as possible while remaining concise and accurate—not as short as possible.

#### Bad vs good

**Question:** What is React Fiber?

**Bad (compressed shorthand):**
> A fiber is the mutable work node for one instance (type, props, hook list, child/sibling/return, commit flags). Elements are cheap per-render descriptions. Fiber lets React pause/resume/abandon work instead of a recursive stack walk.

**Good (clear interview answer):**
> React Fiber is React's internal architecture for managing rendering and updates. Each Fiber node represents part of the UI and stores information about its state, props, and relationships to other nodes.
>
> Fiber lets React divide rendering into smaller units, prioritize important updates, and interrupt rendering work when necessary.
>
> React maintains a current tree and a work-in-progress tree. Once the new work is ready, React commits the changes.

### Structure

| Section | Rule |
|---|---|
| **Question** | 1–3 sentences. Fold essential constraints into the question; no long “Context” block. |
| **Answer** | 50–100 words, clear and spoken-friendly. Prefer clarity over minimum length. |
| **Code** | Only when necessary; ideally under 10 lines. Omit otherwise. |
| **Follow-up** | One short question with a 1–3 sentence answer (same clarity rules). |
| **Trade-offs** | Only when they materially affect the decision. Omit otherwise. |

Do **not** use separate Context, Practical Implementation, Common Mistakes, or multi-paragraph essay sections.

### Per-question template

```md
### TECH-NNN — Short title

**Difficulty:** Junior | Intermediate | Senior | Staff

**Category:** …

**Question:**

…

**Answer:**

…

**Code:** *(optional)*

```lang
…
```

**Trade-offs:** *(optional)*

…

**Follow-up:**

…

Answer: …
```

## Accuracy rules used while writing

- Scenarios include enough constraints for the answer. Missing facts are called out as clarifying questions.
- Answers separate what the runtime guarantees from what depends on your code, product rules, or measurement.
- Examples are hypothetical and labeled as such. No invented production incidents or benchmarks.
- Version-sensitive behavior is named (React 18 concurrent rendering, Node 20+ event loop, NestJS provider scopes, PostgreSQL isolation). If a claim is version-dependent and not pinned, the answer says so.
