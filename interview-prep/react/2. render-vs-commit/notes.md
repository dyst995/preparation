# Render Phase vs Commit Phase

## What you need to know

Every React update has two phases:

| Phase | What happens | Interruptible? | Side effects? |
| --- | --- | --- | --- |
| **Render** | Run components, build new element/fiber work, **diff**, plan DOM updates (“effect list”) | **Yes** (concurrent: pause, restart, discard) | **No** — must be **pure** |
| **Commit** | Apply DOM mutations; layout effects; then paint; then passive effects | **No** — runs to completion once started | **Yes** — touch the real world here |

This split explains why `useEffect` / `useLayoutEffect` exist, why StrictMode double-invokes render, and why “don’t fetch/subscribe in the component body” is a hard rule.

Curriculum focus: phases, purity, timeline (`setState` → render → commit → paint → `useEffect`), interview answer on side effects during render.

Related later units: Fiber (how interruptible render works), StrictMode, batching, reconciliation. This unit stays on the **two-phase model**.

---

## The render phase

**What it is:** React recalculates what the UI *should* be.

Concretely:

1. Call your function components (or class `render`).  
2. Produce a new tree of React elements (VDOM description).  
3. Reconcile / diff against the previous tree (on fibers).  
4. Record **what needs to change** in the host tree (DOM) — without necessarily applying it yet.

**Why purity:** Concurrent React and StrictMode may:

- call your component **twice** in development;
- **start** rendering, **pause** for higher-priority work;
- **throw away** in-progress render work and start over.

If render does `document.title = …`, `fetch(…)`, `array.push`, or `subscribe()`, those actions can run **extra times**, run for a render that is **discarded**, or leave the world in a wrong state.

**Allowed in render:** compute JSX from props/state, derive values, create element trees. Reading state/props is fine. **Writing** to external systems is not.

```tsx
function Profile({ userId }: { userId: string }) {
  // BAD — side effect during render
  fetch(`/api/users/${userId}`); // may fire more than once / for abandoned work

  // BAD — mutating during render
  // items.push(something);

  // OK — pure derivation
  const label = userId.toUpperCase();
  return <div>{label}</div>;
}
```

Move effects to `useEffect` / event handlers / commit-time APIs.

---

## The commit phase

**What it is:** React applies the planned updates and runs effects that touch the outside world.

Typical order (mental model for one update that commits):

1. **DOM mutations** applied (insert/update/delete nodes, set attributes, etc.).  
2. **`useLayoutEffect`** cleanups + effects — **synchronously**, **before browser paint**.  
3. **Browser paints** (user may see the new UI).  
4. **`useEffect`** cleanups + effects — **asynchronously after paint**.

Once commit starts, it is **not** interruptible the way render is — React finishes applying that committed tree so the DOM isn’t left half-updated relative to that commit.

**Why layout vs passive effects:**

- **`useLayoutEffect`:** measure DOM / sync mutate before paint (avoid flicker). Blocks paint until done — use sparingly.  
- **`useEffect`:** subscriptions, network, logging — after paint so the UI stays responsive.

---

## Mental timeline for a state update (preserved)

1. `setState` runs (handler, effect, etc.).  
2. React **schedules** a render (may **batch** with other updates).  
3. **Render phase:** components re-execute → new element tree → diff → build list of DOM work.  
4. **Commit phase:**  
   - a. DOM mutations  
   - b. `useLayoutEffect` (before paint)  
   - c. Browser paints  
   - d. `useEffect` (after paint)

```
setState
  → (schedule / batch)
    → RENDER (pure, interruptible)
      → COMMIT DOM
        → useLayoutEffect
          → paint
            → useEffect
```

---

## Re-render ≠ DOM update

A component **function running again** (render phase work) does **not** always change the DOM.

If reconciliation decides props/text/structure for that subtree are unchanged, commit may **skip** DOM writes for those nodes. Conversely, parent re-renders often **re-invoke** child functions even when child output is identical (unless memoized later).

Interview precision: “re-render” usually means “React ran the component again”; “DOM update” means commit mutated the document.

---

## Why the split exists (design intent)

1. **Declarative purity** — UI = f(state); side effects scheduled separately.  
2. **Concurrent rendering** — expensive pure calculation can yield to the browser; impure work cannot be casually redone.  
3. **Correctness** — DOM and subscriptions update in a known order relative to paint.

Without the split, interruptible rendering would be unsafe: React couldn’t re-run or abandon work without risking double subscriptions and half-applied mutations.

---

## Practical consequences

| Put this… | Where |
| --- | --- |
| Derive display values, map lists to JSX | Render |
| `fetch`, timers, subscriptions, analytics | `useEffect` (or event handlers) |
| Read layout (`getBoundingClientRect`), sync DOM before paint | `useLayoutEffect` |
| Update React state from user input | Event handlers (then schedule render) |

**StrictMode (dev):** intentionally double-invoking render (and effect setup/cleanup in modern StrictMode) surfaces impure render and missing effect cleanups early — same root cause as “render must be pure.”

---

## Common mistakes and misconceptions

1. “Render” means “paint” — paint is after (part of) commit.  
2. Putting `fetch` / `addEventListener` in the component body.  
3. Using `useEffect` for something that must happen **before** paint (flicker) — need `useLayoutEffect`.  
4. Assuming every re-render updates the DOM.  
5. Mutating props/state objects during render (breaks purity and future concurrent assumptions).  
6. Thinking commit is optional — it’s when the real DOM catches up to the planned tree.

---

## Connections to other concepts

```
VDOM / elements (render output)
  → render phase builds & diffs them
    → commit applies host updates

purity in render
  → enables StrictMode double-render + concurrent discard

useLayoutEffect vs useEffect
  → commit timing relative to paint

Fiber (next)
  → how render work is broken into interruptible units

batching
  → multiple setStates → fewer render→commit cycles
```

---

## Interview perspective

**Q: Why can’t you do side effects during render?**

Preserved strong answer:

> Render must be pure because React can call it more than once for the same update — StrictMode checks, or concurrent rendering that pauses and may resume or **discard** work. Mutating external state or the DOM during render causes double analytics, duplicated subscriptions, or stale writes that only show under specific timing.

Also ready to: draw the setState → render → commit → layout effects → paint → useEffect timeline; contrast interruptible render vs synchronous commit.

---

# Self-test

## Core recall

1. What happens in the render phase vs the commit phase?
2. Which phase may be interrupted or thrown away?
3. Are side effects allowed during render? During commit?
4. Order after DOM mutations: `useLayoutEffect`, paint, `useEffect`?
5. Where does browser paint sit in the timeline?
6. Does every re-render imply a DOM mutation?
7. What does “render must be pure” mean in one sentence?
8. Name two reasons React might run a component function more than once for “one” update.

## Explain why

1. Why must the render phase avoid subscriptions and DOM writes?
2. Why is the commit phase not interruptible like render?
3. Why does `useLayoutEffect` run before paint?
4. Why does `useEffect` run after paint?
5. Why does StrictMode double-rendering help catch bugs related to this model?
6. Why can concurrent features discard render work safely only if render is pure?

## Compare and contrast

1. Render phase vs commit phase  
2. `useEffect` vs `useLayoutEffect`  
3. Re-render vs DOM update  
4. Side effects in render vs side effects in an event handler  
5. Scheduling a render (`setState`) vs committing  
6. Pure calculation during render vs impure work in effects  

## Predict the behavior

1.
```tsx
function Bad({ id }) {
  fetch(`/api/${id}`);
  return null;
}
// Under StrictMode in development, what can happen to fetch?
```

2.
```tsx
function Box() {
  useLayoutEffect(() => {
    console.log('layout');
  });
  useEffect(() => {
    console.log('effect');
  });
  return <div />;
}
// Relative order of logs vs first paint?
```

3. Parent state updates; child returns the same `<span>Hi</span>` with same props — did the child function necessarily run? Did the span’s DOM node necessarily update?

4. During render you `document.body.style.background = 'red'`. What’s wrong under concurrent/StrictMode thinking?

## Debugging

1. Analytics `track('view')` in component body fires twice in dev only. Diagnosis?

2. UI flickers: measure DOM in `useEffect` and then set size state. Better phase tool?

3. Subscription registered in render, never cleaned up; memory leak / duplicates. Fix?

4. Developer says “commit didn’t run because reconciliation found no changes.” Is that accurate language? Clarify re-render vs DOM.

5. `useEffect` reads layout and user sees a jump. What’s the mismatch?

## Application

1. Sketch the timeline from `setCount(c => c + 1)` in a click handler to `useEffect` running.

2. Move this impure render into the correct place:

```tsx
function Title({ text }) {
  document.title = text;
  return null;
}
```

3. Choose `useEffect` or `useLayoutEffect` for: (a) syncing to `localStorage`, (b) focusing an input before paint, (c) attaching a window resize listener.

4. Write one sentence you’d say in an interview defining the two phases.

## Interview questions

1. Why can’t you do side effects during render?  
   **Follow-ups:** StrictMode? Concurrent discard?

2. Walk through what happens after `setState` until the user sees the update and effects run.

3. What’s the difference between render and commit?

4. When would you use `useLayoutEffect` instead of `useEffect`?

5. Does a re-render always update the DOM? Why or why not?

## Connections

1. How does this relate to the virtual DOM / element tree?
2. How will Fiber build on “interruptible render”?
3. How do hooks rules (`useEffect` dependencies) sit in the commit model?
4. How does batching reduce how often this whole pipeline runs?
5. How does purity here echo “don’t mutate during render” advice for Redux/state updates?
