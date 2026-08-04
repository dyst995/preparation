
# React (Web) Interview Prep - Index

Detailed study guides split by topic, built around your stack: React, Redux (Redux Toolkit), React Query / TanStack Query, Zustand, Tailwind CSS, plus the React Native overlap you already have deep experience with (EasyPay, MyCreditInfo, Wizer, Online School, Clean House, Travel2Georgia).

This track focuses on **web React** specifically: the DOM renderer, browser-specific concerns (forms, CSS, accessibility, bundling), and the state/data-fetching stack you actually ship with. Where React Native and web React share a mental model (hooks, reconciliation, rendering rules), the explanation is written once here and you should cross-reference `../react-native/01-fundamentals.md` for the native-specific host differences.

Mark progress in each file with `[ ]` -> `[x]`.

> Each of the 6 chapter files now also includes a "Senior-Level Best Practices" section (decision frameworks, production checklists, anti-patterns, failure modes, observability, and harder senior follow-up Q&A) near the end of the file - use it as the final drill pass after the core material feels solid.

---

## Chapters

| # | File | Focus |
|---|---|---|
| 01 | [Rendering & Reconciliation](./01-rendering-reconciliation.md) | Virtual DOM mental model, fiber, render vs commit, diffing, keys, pure components, StrictMode |
| 02 | [Hooks Deep Dive](./02-hooks-deep-dive.md) | useState, useEffect, useRef, useLayoutEffect, rules of hooks, custom hooks, effects vs events, cleanup, dependency arrays |
| 03 | [State & Data Fetching](./03-state-data-fetching.md) | Local state, Context pitfalls, Redux Toolkit, Zustand, React Query/TanStack Query, decision framework aligned to your CV |
| 04 | [Performance Patterns](./04-performance-patterns.md) | memo/useMemo/useCallback tradeoffs, virtualization, code splitting, avoiding waterfalls, profiling with DevTools |
| 05 | [Forms, UI & CSS](./05-forms-ui-css.md) | Controlled/uncontrolled inputs, form libraries, HTML semantics, Flexbox/Grid, Tailwind patterns, accessibility basics |
| 06 | [Interview Question Bank](./06-interview-questions.md) | Large Q&A bank with model answers, rapid-fire drills, whiteboard/coding prompts, red/green flags |

**Total:** ~3,150 lines across 6 chapters (plus this index).

---

## How this maps to your CV

You've shipped React with:

- **Redux / Redux Toolkit** - global app state, likely auth/session, cross-cutting UI state, maybe normalized entities.
- **React Query (TanStack Query)** - server-state caching, likely paired with Redux/Zustand for client-only state (correct modern pattern - be ready to explain *why* you split them).
- **Zustand** - lightweight client state, probably for UI-local-but-shared concerns (modals, filters, theme) without Redux boilerplate.
- **Tailwind CSS** - utility-first styling, consistent design tokens, fast iteration.
- **React Native** overlap - you already understand hooks, reconciliation, and component patterns deeply from RN; this track reframes that knowledge for the DOM host and browser-specific tooling.

Interviewers will probe **why you chose one state tool over another** far more than "what is useState." Chapter 03 is built specifically to give you a crisp, defensible decision framework using your actual stack.

---

## Suggested study order (8-10h / day)

1. **01 Rendering & Reconciliation** - the mental model everything else depends on.
2. **02 Hooks Deep Dive** - the daily bread and butter; most live-coding rounds test this.
3. **03 State & Data Fetching** - your differentiator stack (Redux Toolkit + RTK Query overlap, Zustand, React Query). Expect deep "when would you use X vs Y" questions.
4. **04 Performance Patterns** - senior-level signal; ties into your production experience reducing issues.
5. **05 Forms, UI & CSS** - often underestimated; Tailwind + accessibility questions are common at product companies.
6. **06 Interview Question Bank** - do this last, then loop back to weak chapters.

---

## Daily drill (any day)

1. Pick one chapter.
2. Read topics + check off what you can already teach without notes.
3. Answer 5-10 questions from chapter 06 out loud, timed.
4. Do the hands-on drill(s) in that chapter in a scratch file or CodeSandbox.
5. Write down weak spots and revisit them the next day before moving on.

---

## Core positioning statement (memorize a version of this)

> "I build React apps with a clear separation of concerns: React Query owns server state - caching, revalidation, and background sync - so I never hand-roll loading/error/cache logic. Redux Toolkit owns genuinely global, cross-feature client state like auth and app-wide UI flags, using slices and RTK's built-in Immer-based reducers to avoid boilerplate. Zustand covers smaller, feature-local shared state where Redux would be overkill - it's minimal API surface and no provider wrapping makes it fast to introduce without a big refactor. Styling is Tailwind for velocity and consistency, and I lean on React Native experience for cross-platform component thinking when needed."

Rehearse this. It answers three questions at once: architecture judgment, tool tradeoffs, and stack fluency.

---

## Progress tracker

- [ ] 01 Rendering & Reconciliation
- [ ] 02 Hooks Deep Dive
- [ ] 03 State & Data Fetching
- [ ] 04 Performance Patterns
- [ ] 05 Forms, UI & CSS
- [ ] 06 Interview Question Bank

---

## Cross-references

- React Native fundamentals (host/runtime differences): `../react-native/01-fundamentals.md`
- React Native state management (Zustand/Redux/React Query in a mobile context): `../react-native/03-state-management.md`
- React Native performance (FlatList, threads, profiling): `../react-native/06-performance.md`
- TypeScript/JavaScript foundations: `../typescript-javascript/`
