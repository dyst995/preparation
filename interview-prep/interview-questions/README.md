# Senior full-stack interview handbook

Reference of technical interview questions and senior-level answers for React, NestJS, Node.js, and databases (PostgreSQL first, plus Redis and document-store concepts). JavaScript and TypeScript are woven into those four tracks.

**Target:** 2,000 questions (500 per track, 10 sections × 50). **Do not treat this README as a claim that the target is finished.** Completion is whatever `PROGRESS.md` says after a count of `### TECH-NNN` headings.

## Layout

| Track | Folder | IDs |
|---|---|---|
| React | `react/` | `REACT-001` … `REACT-500` |
| NestJS | `nestjs/` | `NEST-001` … `NEST-500` |
| Node.js | `nodejs/` | `NODE-001` … `NODE-500` |
| Databases | `databases/` | `DB-001` … `DB-500` |

Each topic file is exactly 50 questions when that section is done. IDs are global within a track, in file order.

## How to study

See [STUDY_GUIDE.md](./STUDY_GUIDE.md). Section map and per-question links: [INDEX.md](./INDEX.md) (regenerate after new questions are saved). Counts: [PROGRESS.md](./PROGRESS.md).

## Accuracy rules used while writing

- Scenarios include enough constraints for the answer. Missing facts are called out as clarifying questions.
- Answers separate what the runtime guarantees from what depends on your code, product rules, or measurement.
- Examples are hypothetical and labeled as such. No invented production incidents or benchmarks.
- Version-sensitive behavior is named (React 18 concurrent rendering, Node 20+ event loop, NestJS provider scopes, PostgreSQL isolation). If a claim is version-dependent and not pinned, the answer says so.
