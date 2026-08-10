# 01. What the virtual DOM actually is

> Source: `interview-prep/react/01-rendering-reconciliation.md`

### The core idea

The real DOM is slow to touch directly at scale: every mutation can trigger layout, style recalculation, and paint. React's solution is to keep a lightweight, in-memory description of what the UI *should* look like - the **virtual DOM (VDOM)** - and compute the *minimal* set of real DOM operations needed to get the actual DOM to match it.

A VDOM node is just a plain JS object (roughly):

```javascript
{
  type: 'button',
  props: { className: 'btn', onClick: fn, children: 'Save' },
  key: null,
}
```

JSX compiles to `React.createElement(type, props, children)` calls (or the newer `jsx()` runtime), which produce these objects. **JSX is not the virtual DOM; it's syntax sugar that produces the virtual DOM elements.**

### Why not just mutate the DOM directly?

You *can* build UI by hand-mutating the DOM (jQuery-style), but it doesn't scale:

- You must manually track "what changed" as your app grows - this becomes a correctness nightmare.
- Declarative code ("render this tree given this state") is easier to reason about than imperative DOM surgery.
- A VDOM diff lets React batch and minimize real DOM writes, which are the expensive part.

### Answer sketch

> "The virtual DOM is a plain-JS-object tree that mirrors the intended UI. React builds a new VDOM tree on every render, diffs it against the previous tree (reconciliation), and computes the minimal set of real DOM mutations to apply. This lets me write declarative 'render this given this state' code while React handles efficient DOM updates."

### Common misconception (call this out proactively in interviews)

"Virtual DOM is always faster than the real DOM" is **not** universally true - diffing has its own cost. The real value is **developer ergonomics + a consistent, batched update model**, not "raw speed" in every case. Hand-optimized imperative DOM code can outperform React in microbenchmarks; React optimizes for *maintainability at scale* plus *good-enough* performance via heuristics (see Section 4).

---
