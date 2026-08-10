# 01 - Rendering & Reconciliation — Introduction

> Source: `interview-prep/react/01-rendering-reconciliation.md`

# 01 - Rendering & Reconciliation

> Goal: Build a rock-solid mental model of how React turns component trees into DOM updates - virtual DOM, fiber, render vs commit, diffing/keys, and pure components - at a depth that survives senior follow-ups.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this chapter you should be able to:

1. Explain what the "virtual DOM" actually is and why it exists.
2. Describe React's two-phase model: render phase vs commit phase.
3. Explain Fiber as a data structure and a unit of work, and why it enabled interruptible rendering.
4. Explain reconciliation (the diffing algorithm) and its Big-O assumptions/heuristics.
5. Explain why `key` matters, what happens with missing/unstable keys, and array reordering bugs.
6. Explain what makes a component "pure" and why purity matters for correctness and performance.
7. Explain `React.StrictMode` and why effects/renders double-fire in development.
8. Explain batching (legacy vs automatic batching in React 18) and how it affects render count.
9. Distinguish "re-render" from "DOM update" - a re-render does not always touch the DOM.
10. Reason about parent/child re-render propagation and how to reason about "what re-renders when state changes."

---
