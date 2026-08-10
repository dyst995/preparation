# 02 - Hooks Deep Dive — Introduction

> Source: `interview-prep/react/02-hooks-deep-dive.md`

# 02 - Hooks Deep Dive

> Goal: Master `useState`, `useEffect`, `useRef`, `useLayoutEffect`, the Rules of Hooks, custom hooks, and the effects-vs-events mental model - deeply enough to debug real bugs live in an interview, not just recite definitions.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this chapter you should be able to:

1. Explain how hooks work mechanically (linked list per fiber, call-order dependent).
2. State and justify the Rules of Hooks, and explain *why* each rule exists (not just that it exists).
3. Explain `useState` including lazy initialization, functional updates, and the `Object.is` bail-out.
4. Explain `useEffect` timing, dependency arrays, cleanup, and the stale closure problem.
5. Explain `useLayoutEffect` vs `useEffect` and when each is correct.
6. Explain `useRef` for mutable values and DOM access, and why refs don't trigger re-renders.
7. Distinguish "effects" (synchronizing with external systems) from "events" (responding to a specific interaction).
8. Build custom hooks that correctly encapsulate stateful logic and reusable effects.
9. Debug the most common dependency-array bugs (missing deps, stale closures, infinite loops).
10. Explain `useReducer`, `useContext`, `useMemo`, `useCallback`, `useImperativeHandle`, and `useId` at a working level.

---
