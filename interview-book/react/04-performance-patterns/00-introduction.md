# 04 - Performance Patterns — Introduction

> Source: `interview-prep/react/04-performance-patterns.md`

# 04 - Performance Patterns

> Goal: Move beyond "wrap it in `useMemo`" and build a principled, measurement-first approach to React performance - memoization tradeoffs, list virtualization, code splitting, avoiding request/render waterfalls, and profiling methodology.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this chapter you should be able to:

1. State the golden rule of performance work: measure first, never guess.
2. Explain exactly what `React.memo`, `useMemo`, and `useCallback` do, their costs, and when they help vs hurt.
3. Diagnose "why does this re-render" using React DevTools Profiler methodology.
4. Explain list virtualization conceptually and know when a plain `.map()` becomes a real problem.
5. Explain code splitting (`React.lazy` + `Suspense`, route-based splitting) and its tradeoffs.
6. Identify and fix request waterfalls and render waterfalls.
7. Explain bundle-size thinking: what to lazy-load, what to tree-shake, what to avoid importing wholesale.
8. Use `useTransition`/`useDeferredValue` to keep UI responsive under expensive updates.
9. Explain the difference between perceived performance and raw computation time, and techniques for improving the former.

---
