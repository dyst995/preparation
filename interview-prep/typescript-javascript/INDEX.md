# TypeScript + JavaScript Interview Prep - Index

Detailed study guides for the foundation underneath everything else on your CV: React, React Native, and NestJS are all TypeScript-heavy. Interviewers frequently probe JS fundamentals and TS type-system depth separately from framework knowledge - this track exists so neither gap shows up.

**Total:** 5 chapters, built for someone who already ships TypeScript daily but needs to *explain* the "why" under pressure, not just the "how."

Mark progress in each file by flipping `[ ]` to `[x]` as you master a topic.

---

## Chapters

| # | File | Focus |
|---|---|---|
| 01 | [JavaScript Fundamentals](./01-javascript-fundamentals.md) | Scope, hoisting, closures, `this`, prototypes vs classes, coercion, equality, modules |
| 02 | [Async & the Event Loop](./02-async-event-loop.md) | Call stack, event loop, microtasks vs macrotasks, Promises, async/await, error handling, concurrency pitfalls |
| 03 | [TypeScript Core](./03-typescript-core.md) | Types vs interfaces, unions/intersections, narrowing, generics, utility types, `unknown` vs `any`, type guards, enums vs unions |
| 04 | [TypeScript Advanced](./04-typescript-advanced.md) | Conditional types, mapped types, declaration merging, typing React/Nest patterns, strict mode, DTO typing |
| 05 | [Interview Questions & Drills](./05-interview-questions-drills.md) | Large JS/TS question bank with answer sketches, rapid-fire round, and a daily drill plan |

---

## Why this order

JavaScript fundamentals come first because **TypeScript is JavaScript with a type layer on top** - if `this`, closures, and prototypes are shaky, TypeScript explanations will sound memorized rather than understood. The event loop chapter follows immediately because async bugs (race conditions, unhandled rejections, stale closures in `setTimeout`) are among the most common "explain what happens" interview traps, and they build directly on chapter 1's closure and scope material.

TypeScript core comes third: by then you have the JS mental model solid, so type narrowing, generics, and utility types map cleanly onto runtime behavior you already understand. TypeScript advanced pushes into type-system machinery (conditional/mapped types) and - importantly for your stack - how typing shows up concretely in React props/hooks and NestJS DTOs/decorators. Chapter 5 is pure repetition and recall under simulated pressure.

## Suggested study order (8-10h/day)

1. **01 JavaScript Fundamentals** - the load-bearing wall; do not skip even if it feels "too basic," because senior interviews probe depth here (event loop ordering, `this` binding edge cases, prototype chains) far more than junior interviews do.
2. **02 Async & Event Loop** - directly follow-on; almost every "predict the output" interview question lives here.
3. **03 TypeScript Core** - daily-driver type system knowledge you already use; sharpen the *why*, not just the syntax.
4. **04 TypeScript Advanced** - the layer that separates "uses TypeScript" from "understands TypeScript," plus direct ties to React/Nest patterns you already write.
5. **05 Interview Questions & Drills** - revisit daily, 20-30 minutes, answer out loud with no notes.

---

## How to use each chapter

1. Read the explanation, not just the code sample - interviewers grade the *reasoning*, not the syntax.
2. Check off topics with `[x]` once you can teach them out loud in under 2 minutes.
3. Cover the answer and try the interview Q&A cold; only then read the model answer.
4. Do the hands-on drills in an actual file/REPL - typing it out catches gaps that reading does not.
5. Read the green/red flag list before every interview - it is the fastest calibration you can do in 5 minutes.

---

## Daily drill (any day, ~30-45 min)

1. Pick one chapter you have not touched in the longest.
2. Skim the topic checklist; mentally flag anything you hesitate on.
3. Answer 5 interview questions out loud, no notes, timed to under 90 seconds each.
4. Do 1 hands-on drill from that chapter in a scratch file.
5. Write down (physically) the one thing you fumbled - review it again tomorrow before moving on.

---

## Tie-ins to your stack

This track is deliberately framework-agnostic in its core (chapters 1-3), but calls out stack-specific relevance throughout:

- **React** - closures explain stale state in hooks; `this` binding explains class-component footguns; prototypes explain why some libraries use `Object.create`; generics explain typed `useState`/`useReducer`/custom hooks.
- **React Native** - the JS thread runs the same single-threaded event loop model as any JS runtime (Hermes/JSC), so event loop mental models transfer directly; async/await patterns matter heavily for navigation, storage, and network code.
- **NestJS** - decorators, classes, and prototypes are load-bearing (Nest is built on top of them); DTO typing, generics in services/repositories, and enums vs union types come up constantly in Nest code review and interviews.

---

## Progress tracker

- [ ] 01 JavaScript Fundamentals
- [ ] 02 Async & Event Loop
- [ ] 03 TypeScript Core
- [ ] 04 TypeScript Advanced
- [ ] 05 Interview Questions & Drills
