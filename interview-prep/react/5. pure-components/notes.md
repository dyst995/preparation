# Pure Components and Why Purity Matters

## What you need to know

A React component is **pure** (during render) if:

- **Same inputs → same output:** given the same props, state, and context it reads, it returns the same UI description (elements).
- **No observable side effects during render:** no mutating external variables, no network/DOM writes, no non-deterministic output (`Math.random()` / `Date.now()` driving the UI unless stored in state), no depending on shared mutable module state written elsewhere.

Purity is not style preference — React’s **render phase**, **StrictMode**, **concurrent rendering**, and **`memo` / `PureComponent` / `useMemo`** all assume it.

Prerequisites: [render vs commit](../2.%20render-vs-commit/notes.md), [Fiber](../3.%20fiber/notes.md).

---

## What “pure” means for a component

Think of the component function as:

```text
UI = f(props, state, context)
```

During that call you may **read** props/state/context and **compute** JSX. You must not **change the world** in a way that would be wrong if React called `f` twice or discarded the result.

**Side effects belong in:** event handlers, `useEffect` / `useLayoutEffect`, or other commit-time paths — not in the render body.

**Determinism:** if nothing in props/state/context changed, two render calls should describe the same UI. Hidden inputs (module globals, `Date.now()` in JSX) break that.

---

## Why React cares mechanically

### 1. Correctness under StrictMode / concurrent rendering

React may:

- **Double-invoke** render in development (`StrictMode`) to surface impure renders.
- **Start, pause, abandon, or restart** render work (concurrent features).

Impure render ⇒ duplicated analytics/fetches, mutated globals twice, or UI that depends on “how many times we rendered.”

### 2. Safe bail-out optimizations

`React.memo`, `PureComponent`, `useMemo`, and `useCallback` assume **same inputs ⇒ same result**.

If the component secretly reads a **module-level mutable** value or other non-prop input, React can skip a re-render (props shallow-equal) while that hidden input changed ⇒ **stale UI**. Hard to debug because “memo is working” while the screen is wrong.

### 3. Predictable tests

Pure render ⇒ assert `props in → elements out` without mocking network/DOM for the render itself.

---

## Common purity violations (preserved)

```jsx
// VIOLATION 1: mutating outside the component during render
let renderCount = 0;
function Bad() {
  renderCount++;
  return <div>{renderCount}</div>;
}

// VIOLATION 2: mutating a ref during render (unsafe pattern)
function Bad2({ items }) {
  const cache = useRef({});
  cache.current[items.length] = items; // write during render
  return <List items={items} />;
}

// VIOLATION 3: non-deterministic output not from props/state
function Bad3() {
  return <div>{Math.random()}</div>;
}
```

### Fixes (preserved direction)

| Problem | Fix |
| --- | --- |
| Counting renders / logging “once” | `useEffect` (or ref updated in an effect), not render body |
| Caching derived data | `useMemo` (or derive purely without mutating a ref in render) |
| Random / unstable id for display | `useState(() => Math.random())` or lazy `useRef` init — stable unless you intentionally refresh |

**Nuance:** reading a ref during render is sometimes done; **writing** to `ref.current` during render (except narrow lazy-init patterns) is what breaks purity/concurrent assumptions. Prefer effects or memo for caches.

---

## Local mutation that is still “pure enough”

Creating a **new** local array/object and mutating **only that** before returning JSX is usually fine — it doesn’t escape or change prior render results:

```jsx
function Sorted({ items }) {
  const sorted = [...items].sort((a, b) => a.localeCompare(b));
  return <List items={sorted} />;
}
```

**Not fine:** `items.sort()` mutating the prop array owned by the parent.

Rule of thumb: don’t mutate **inputs you didn’t create in this render**, and don’t mutate **anything that outlives this render call** (module scope, refs used as stores, DOM).

---

## `PureComponent` and `React.memo`

| API | What it does |
| --- | --- |
| **`class extends PureComponent`** | `shouldComponentUpdate` with **shallow** compare of **props and state** — skip render if shallow-equal |
| **`React.memo(Component)`** | Function-component equivalent — skip re-render if **props** shallow-equal (optional custom compare as 2nd arg) |

**Shallow only:** new object/array/function reference ⇒ “different,” even if contents are equal. That’s why parents often need `useCallback` / `useMemo` so memoized children aren’t defeated (detail in performance chapter).

```jsx
const Row = React.memo(function Row({ item, onSelect }) {
  return <li onClick={() => onSelect(item.id)}>{item.text}</li>;
});

// Parent keeps onSelect stable or memo rarely helps:
const onSelect = useCallback((id) => setSelectedId(id), []);
```

**Important:** `memo` / `PureComponent` do **not** make an impure component safe — they only skip work when props/state look unchanged. Purity is still required for correctness when React *does* render (and for memo not to hide updates you needed via secret inputs).

---

## Purity vs “pure component” naming

- **Pure render (concept):** same inputs → same output, no render-time side effects — **every** component should aim for this.  
- **`PureComponent` / `memo` (APIs):** **optimization** wrappers that skip re-renders on shallow equality.

Interview clarity: “I keep components pure; I use `memo` when profiling shows skipped child renders help — purity isn’t optional, memo is.”

---

## Common mistakes and misconceptions

1. Treating purity as optional “nice style.”  
2. `fetch` / `subscribe` in the component body.  
3. Mutating props or shared arrays during render.  
4. Expecting `memo` to deep-compare props.  
5. Inline `onClick={() => ...}` / `style={{}}` defeating `memo` without understanding shallow compare.  
6. Relying on module-level variables for UI data while wrapping in `memo` → stale UI.  
7. Confusing “PureComponent” API with “my component is pure.”

---

## Connections to other concepts

```
render phase must be pure
  → StrictMode double-render safe
  → concurrent pause/restart safe

same inputs → same output
  → memo / PureComponent / useMemo bail out safely

impure hidden inputs + memo
  → stale UI bugs

side effects
  → commit / useEffect (not render)
```

---

## Interview perspective

**Q: What does it mean for a component to be pure, and why does React care?**

Preserved strong answer:

> Pure means same props/state always produce the same rendered output, with no observable side effects during the render call. React relies on this to re-invoke render safely — StrictMode checks, concurrent pause/resume/discard — without inconsistent results or duplicated side effects. It’s also the precondition for `memo` / `PureComponent` / `useMemo` to skip work safely: if a component secretly reads outside props/state, memoization can serve stale output.

Follow-ups: give a purity violation; explain shallow `memo`; contrast purity vs `PureComponent`.

---

# Self-test

## Core recall

1. What does it mean for a React component render to be pure?
2. Name three kinds of side effects that must not run during render.
3. Why does StrictMode / concurrent rendering care about purity?
4. How does purity relate to `memo` / `PureComponent` / `useMemo`?
5. What do `PureComponent` and `React.memo` actually compare?
6. Why can a new function prop defeat `React.memo`?
7. How do you stabilize a random value used in UI across re-renders?
8. Is every component supposed to extend `PureComponent`?

## Explain why

1. Why can impure render + StrictMode double-invoke cause duplicate network calls?
2. Why can `memo` + a module-level mutable variable produce stale UI?
3. Why is mutating `props.items` with `.sort()` during render dangerous?
4. Why isn’t `React.memo` a substitute for keeping render pure?
5. Why move “renderCount++” out of render into an effect?
6. Why does shallow compare force `useCallback` next to memoized children?

## Compare and contrast

1. Pure render (concept) vs `PureComponent` / `memo` (APIs)  
2. Side effect in render vs in `useEffect`  
3. Local copy-then-sort vs in-place sort of props  
4. `PureComponent` vs default `Component` (`shouldComponentUpdate`)  
5. Non-deterministic `Math.random()` in JSX vs `useState(() => Math.random())`  
6. Defeating memo with new props vs correctly skipping with stable props  

## Predict the behavior

1.
```jsx
let n = 0;
function A() {
  n++;
  return <span>{n}</span>;
}
// StrictMode double-render in dev — what can the user see / what’s wrong?
```

2.
```jsx
const Child = React.memo(function Child({ onClick }) {
  return <button onClick={onClick} />;
});
function Parent() {
  return <Child onClick={() => console.log('x')} />;
}
// Does memo usually skip Child when Parent re-renders? Why?
```

3.
```jsx
function Bad() {
  return <div>{Date.now()}</div>;
}
// Same props, two render calls in one update cycle — same output?
```

4. Memoized child only reads `theme` from a module `let theme = ...` changed by a sibling without prop changes. Parent re-renders with same props to child. What UI risk?

## Debugging

1. Analytics fires twice per navigation only in development. Suspect?

2. `React.memo(Row)` never seems to help; Profiler shows Row always rendering. Checklist?

3. UI shows old “feature flag” from a module export after flag flips; component is memoized. Diagnosis?

4. `useRef` cache filled during render causes subtle concurrent bugs. What change?

5. Test flakes because component output changes with no prop change. Likely purity issue?

## Application

1. Fix `Bad` that increments a module `renderCount` during render.

2. Replace `return <div>{Math.random()}</div>` with a stable-per-mount random id.

3. Wrap a presentational `Avatar({ url, name })` in `memo` and note when it helps.

4. Rewrite sorting so you don’t mutate `items` from props.

5. Write one interview sentence distinguishing purity from `React.memo`.

## Interview questions

1. What does it mean for a component to be pure, and why does React care?  
   **Follow-ups:** Example violation? How does this relate to `memo`?

2. What does `React.memo` do, and what are its limits?

3. What’s the difference between a pure component and `PureComponent`?

4. Why might memoization cause stale UI?

5. Where should side effects go if not in render?

## Connections

1. How does this unit reinforce “no side effects in the render phase”?
2. How does Fiber/concurrent restart depend on purity?
3. How will the performance chapter build on shallow `memo`?
4. How do impure renders interact with StrictMode (later section)?
5. How is purity related to testing components in isolation?
