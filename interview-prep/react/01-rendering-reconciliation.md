
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

## 1. What the virtual DOM actually is

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

## 2. Render phase vs commit phase

React's work per update splits into two phases:

| Phase | What happens | Can it be interrupted / thrown away? | Side effects allowed? |
|---|---|---|---|
| **Render phase** | Call component functions, compute new element tree, run the diffing algorithm to build a list of effects ("what changed") | Yes (concurrent features can pause, abandon, or restart it) | No - must be pure |
| **Commit phase** | Apply DOM mutations, run layout effects synchronously, run passive effects (`useEffect`) asynchronously after paint | No - runs synchronously to completion once started | Yes - this is where the real world is touched |

### Why this split matters

- **Render phase must be pure** (no DOM mutation, no subscriptions, no logging side effects intended to run once) because React may call your component function multiple times, throw away the result, or interleave it with other work in concurrent mode. If you mutate something during render, you can get double-mutations, stale mutations, or invisible bugs that only show up in `StrictMode` or concurrent features.
- **Commit phase is where `useLayoutEffect` and DOM mutations happen synchronously**, followed by the browser paint, followed by `useEffect` callbacks (passive effects) asynchronously.

### Mental timeline for a state update

1. `setState` is called (an event handler, effect, etc.).
2. React schedules a render (may batch with other updates - see Section 6).
3. **Render phase**: component function(s) re-execute, produce new element tree, React diffs old vs new fiber trees, builds a list of DOM mutations ("effect list").
4. **Commit phase**: 
   a. DOM mutations applied.
   b. `useLayoutEffect` cleanup + effects run synchronously, **before the browser paints**.
   c. Browser paints.
   d. `useEffect` cleanup + effects run asynchronously, **after paint**.

### Interview question

**Q: Why can't you do side effects during render?**

> "Render must be pure because React can call it more than once for the same update - in `StrictMode` for dev-time safety checks, or during concurrent rendering where React may start rendering, pause for a higher-priority update, and either resume or discard the work. If a component mutates external state or the DOM during render, you get bugs like double-fired analytics events, duplicated subscriptions, or stale writes that only appear under specific timing - often invisible until you turn on `StrictMode` or hit concurrent mode in production."

---

## 3. Fiber: the unit of work

### What Fiber is

Fiber is both:
1. **A data structure** - a linked-list-like tree of JS objects, one per component instance/host node, that mirrors your element tree but persists across renders (unlike the throwaway element tree from `createElement`).
2. **A reimplementation of the reconciler** (since React 16) that makes rendering **incremental and interruptible**, replacing the old synchronous, recursive "stack reconciler."

Each fiber node roughly holds:

```javascript
{
  type: 'div',              // or component function/class
  key: null,
  stateNode: domNodeOrInstance,
  child: fiberOrNull,       // first child
  sibling: fiberOrNull,     // next sibling
  return: parentFiberOrNull,
  pendingProps: {...},
  memoizedProps: {...},
  memoizedState: {...},     // hooks list lives here for function components
  effectTag: 'Placement' | 'Update' | 'Deletion' | ...,
  alternate: otherFiberOrNull, // the "other" tree (current vs work-in-progress)
}
```

### Why Fiber exists (the problem it solves)

Before Fiber (React <=15), reconciliation was a **synchronous recursive walk** of the tree - once started, it ran to completion, blocking the main thread. For large trees this could cause visible jank: the browser couldn't process input or paint until the whole diff was done.

Fiber restructures this recursive walk into a **linked list traversal** that can be paused after processing each fiber node, yielding control back to the browser (e.g., to handle a high-priority input event), and resumed later. This is what makes concurrent features (like `useTransition`, `Suspense` prioritization) possible.

### Double buffering: current tree vs work-in-progress tree

React keeps **two fiber trees**:
- **current** - what's on screen right now.
- **work-in-progress (WIP)** - being built during the render phase for the next update.

Each fiber has an `alternate` pointer to its counterpart in the other tree. When the WIP tree finishes and commits, it becomes the new `current` tree ("tree swap"), and the old `current` becomes the next WIP scratch tree. This avoids allocating a whole new tree on every render.

### Interview question

**Q: What problem does Fiber solve that the old stack reconciler didn't?**

> "The old reconciler did a synchronous recursive tree walk that couldn't be paused - a big tree meant a big blocking chunk of main-thread work, causing dropped frames and unresponsive input. Fiber turns the tree into a linked structure that can be processed unit-by-unit and paused/resumed, which enables scheduling: React can yield to the browser for high-priority work (like a keystroke) and continue rendering later, and it enables concurrent features like transitions and Suspense-based prioritization."

**Follow-up: Is Fiber the same as concurrent mode?**
> "No - Fiber is the underlying architecture that *makes concurrency possible*. Concurrent features (`startTransition`, concurrent rendering, Suspense for data) are built on top of Fiber's ability to pause/resume/abandon work, but Fiber itself just describes the tree and unit-of-work model."

---

## 4. Reconciliation: the diffing algorithm

### The core heuristic problem

A generic tree-diff algorithm is O(n^3) in the general case - way too slow for UI updates. React uses two heuristics to get to **O(n)**:

1. **Different component types produce different trees.** If a `<div>` becomes a `<span>` (or a class/function component changes type) at the same position, React does **not** try to diff their children - it tears down the old subtree entirely (unmounting it and all its state) and builds a fresh one.
2. **Keys hint at stable identity across renders for lists.** Developers can hint which children are "the same" element across renders via a `key` prop, so React can match items even if their position/order in the array changes, instead of assuming order-based identity.

### Element-by-element diff rules (per sibling position)

For each position in a children list, React compares old element vs new element:

| Comparison | Result |
|---|---|
| Same type (`'div'` -> `'div'`, or `MyComp` -> `MyComp`) | Reuse the underlying DOM node/instance; update changed props only |
| Different type (`'div'` -> `'span'`, `MyComp` -> `OtherComp`) | Unmount old subtree (run cleanup effects, destroy DOM), mount new subtree from scratch |
| Same type + different `key` | Treated as a different element - old one removed, new one mounted (identity mismatch) |

### Why "different type = full remount" matters practically

This is a very common real bug source: conditionally rendering different component types (or even the same JSX at a different position in the tree) can silently reset state you expected to persist.

```jsx
// BUG: switching `isEditing` remounts the whole subtree because
// the ternary branches render structurally different trees at the same slot in some cases,
// and any local state inside <Editor> / <Viewer> is lost on every toggle - which might be desired,
// but often isn't and confuses candidates who don't understand *why* state reset happened.
function Field({ isEditing }) {
  return isEditing ? <Editor /> : <Viewer />;
}
```

If you *wanted* state to persist across the toggle, you'd need to keep the same component type mounted and just change its props/rendered content, or explicitly lift the state above the branch point.

### Keys and list diffing in depth

Without keys, React falls back to matching by **index** in the array. This works fine if the list never reorders, inserts in the middle, or removes from the middle - but breaks (functionally or performance-wise) the moment it does.

**Classic key bug - index as key with reordering:**

```jsx
// items = [{id: 1, text: 'A'}, {id: 2, text: 'B'}]
{items.map((item, index) => (
  <TodoRow key={index} item={item} />   // BAD: index as key
))}
```

If a new item is prepended (`[{id: 3, text: 'C'}, {id: 1, text: 'A'}, {id: 2, text: 'B'}]`), React sees:
- index 0: previously `{id:1}`, now `{id:3}` -> same type, same key (`0`) -> React thinks it's the *same element*, just updates its props (text). It does **not** unmount/remount, so any **internal state inside `TodoRow`** (like an uncontrolled input's value, or `useState` for "is this row expanded") stays attached to the *wrong* logical item - it stays at index 0 but now represents different data. This produces classic bugs: text inputs showing the wrong value, checkboxes toggled on the wrong row, animations firing on the wrong element.

**Fix - use a stable, unique identifier:**

```jsx
{items.map((item) => (
  <TodoRow key={item.id} item={item} />   // GOOD: stable identity
))}
```

Now when the array reorders, React matches fibers by `id`, correctly moving the DOM node instead of morphing row 0's identity into new data, so per-row state and DOM (focus, scroll position, CSS transition state) travel with the correct logical item.

### When index-as-key is actually fine

- The list is **static and never reorders, inserts, or deletes** (rare but happens, e.g., a fixed set of tabs).
- Items have **no internal state and no keyed side effects** (no controlled inputs per row, no animation, no focus).
- As a last resort with genuinely no stable ID available - but flag it as a known risk if items can be added/removed/reordered.

### Interview question

**Q: Why does React need `key`, and what breaks without a stable key?**

> "Keys give React a stable identity for list items across renders. Without them, React defaults to positional/index matching, which breaks down when the list is reordered, or items are inserted/removed anywhere except the end - state and uncontrolled DOM properties (input values, focus, checkbox state, CSS transitions) can get silently reassigned to the wrong logical item because React thinks the *position* is the same element rather than tracking identity. I use a stable unique ID from the data - never the array index - whenever the list can reorder or mutate in the middle."

**Follow-up: What happens if two siblings have the same key?**
> "React warns in development ('Encountered two children with the same key') and behavior becomes unreliable - it may only render one of them correctly, or silently overwrite/duplicate DOM references, because keys are assumed unique among siblings at that level."

---

## 5. Pure components and why purity matters

### What "pure" means for a component

A component is **pure** if, given the same props (and same context/state it reads), it always renders the same output and produces **no observable side effects during render** (no mutating external variables, no network calls, no DOM writes, no `Math.random()`/`Date.now()` used to change output non-deterministically without being derived from props/state, no relying on shared mutable module-level state written elsewhere).

### Why this matters mechanically, not just stylistically

1. **Correctness under Strict Mode / concurrent rendering** - React may invoke your render function multiple times for one commit (double-invoking in dev `StrictMode`, or throwing away a paused render mid-way in concurrent mode). Impure renders produce different results or duplicate side effects across those extra invocations.
2. **Enables safe bail-out optimizations** - `React.memo`, `PureComponent`, and `useMemo`/`useCallback` all rely on the assumption that "same inputs -> same output" to safely skip re-rendering or recomputation. If a component secretly depends on something outside its props/state (a module-level mutable variable, a ref read during render, etc.), memoization can produce **stale UI** - a real, hard-to-debug class of bug.
3. **Predictability for testing** - pure render functions are trivially testable (input -> output, no mocking side effects needed).

### Common purity violations (call these out - real interview gotchas)

```jsx
// VIOLATION 1: mutating a variable outside the component during render
let renderCount = 0;
function Bad() {
  renderCount++;              // side effect during render - breaks under StrictMode double-invoke
  return <div>{renderCount}</div>;
}

// VIOLATION 2: reading and mutating a ref's value directly in render logic
function Bad2({ items }) {
  const cache = useRef({});
  cache.current[items.length] = items;   // mutation during render - not observably safe
  return <List items={items} />;
}

// VIOLATION 3: non-deterministic output not derived from props/state
function Bad3() {
  return <div>{Math.random()}</div>;      // different output every render call, even with same props
}
```

**Fixes:** move `renderCount`-like tracking into `useEffect` (or `useRef` incremented in an effect, not render); compute derived values with `useMemo` instead of mutating a ref during render; generate random values once via `useState(() => Math.random())` or `useRef` initialized lazily so it's stable across re-renders unless intentionally regenerated.

### `PureComponent` and `React.memo` - what they actually do

- **`class extends React.PureComponent`** - implements `shouldComponentUpdate` with a **shallow prop and state comparison**; skips re-render if all props/state are shallow-equal to the previous render.
- **`React.memo(Component)`** - the function-component equivalent; wraps a component so React skips re-rendering it if its props are shallow-equal to last time (you can pass a custom comparator as the second argument).

**Both only compare shallowly** - a new object/array/function reference passed as a prop (even with identical contents) will be considered "different," defeating the memoization. This is why `useMemo`/`useCallback` exist alongside `memo` (see chapter 04).

```jsx
const Row = React.memo(function Row({ item, onSelect }) {
  return <li onClick={() => onSelect(item.id)}>{item.text}</li>;
});

// Parent must keep `onSelect` reference stable (useCallback) or memo is defeated:
const onSelect = useCallback((id) => setSelectedId(id), []);
```

### Interview question

**Q: What does it mean for a component to be pure, and why does React care?**

> "Pure means the same props/state always produce the same rendered output, with no observable side effects during the render call itself. React relies on this to safely re-invoke render functions multiple times - for `StrictMode` dev checks, or when concurrent rendering pauses and resumes work - without producing inconsistent results or duplicated side effects. It's also the precondition for `memo`/`PureComponent` and `useMemo` to safely skip work: if a component secretly reads something outside props/state, memoization can serve stale output."

---

## 6. Batching: how many renders does one event trigger?

### Legacy batching (React <=17, "automatic" only in React event handlers)

Before React 18, multiple `setState` calls inside a **React synthetic event handler** (like `onClick`) were batched into a single re-render. But calls inside **promises, `setTimeout`, native event handlers, or async/await code** were **not** batched - each `setState` triggered its own separate render.

```jsx
// React 17: inside onClick, both setStates batch into ONE render.
function handleClick() {
  setCount(c => c + 1);
  setFlag(f => !f);
}

// React 17: inside setTimeout, these cause TWO separate renders (no batching).
function handleClickAsync() {
  setTimeout(() => {
    setCount(c => c + 1);   // render #1
    setFlag(f => !f);       // render #2
  }, 0);
}
```

### Automatic batching (React 18+)

React 18's `createRoot` API introduced **automatic batching everywhere** - promises, timeouts, native event handlers, and any other context all batch multiple `setState` calls into a single re-render, not just inside React event handlers.

```jsx
// React 18 with createRoot: this now batches into ONE render, even in setTimeout.
function handleClickAsync() {
  setTimeout(() => {
    setCount(c => c + 1);
    setFlag(f => !f);
  }, 0);
}
```

If you truly need a synchronous, unbatched update (rare), you can opt out with `flushSync` from `react-dom`.

### Why batching matters for interviews

- It explains why `console.log(state)` **right after calling `setState`** still shows the old value - state updates are scheduled, not synchronous, and the component re-renders (with fresh closures) later.
- It explains why calling `setState` multiple times with the *same* new value only re-renders once, but calling it with a function updater form (`setCount(c => c + 1)`) is the safe way to base a new value on the latest pending state when you fire multiple updates in the same batch.

```jsx
// BUG: both reference the same stale `count` from this render's closure - net effect is +1, not +2.
setCount(count + 1);
setCount(count + 1);

// FIX: functional updater form reads the latest pending value each time - net effect is +2.
setCount(c => c + 1);
setCount(c => c + 1);
```

### Interview question

**Q: Why doesn't `console.log` right after `setState` show the new value?**

> "State updates are scheduled, not applied synchronously - React batches them and re-renders asynchronously (in React 18, batching happens across event handlers, promises, and timeouts by default). The variable you logged is from the current render's closure, which still holds the old value until the component re-renders with the new state."

**Q: What's the difference between `setCount(count + 1)` twice vs `setCount(c => c + 1)` twice in the same handler?**

> "The first form captures `count` from the closure at call time - calling it twice with the same stale value just schedules the 'same' update twice, netting +1. The functional updater form receives the latest pending state each time it's applied, so two calls correctly net +2."

---

## 7. `React.StrictMode` - what it actually does

`StrictMode` is a development-only wrapper that helps surface bugs related to impure rendering and unsafe lifecycles. It does **not** run in production and has **zero runtime cost** there.

What it does in development:

1. **Double-invokes** component function bodies (render), `useState`/`useMemo`/`useReducer` initializer functions, and (in React 18+) mount/cleanup/mount of `useEffect` on initial mount - to help surface side effects that shouldn't be in render, or effects with missing/incorrect cleanup.
2. Warns about legacy/unsafe lifecycle methods (`componentWillMount`, etc.) in class components.
3. Warns about legacy string refs and legacy context API usage.
4. Helps detect unexpected side effects from render-phase code by making them run twice, so non-idempotent behavior becomes visible (e.g., an API call fired directly in render, or a subscription added without cleanup).

### Why effects "fire twice" in dev with React 18 StrictMode

React 18's `StrictMode` deliberately does: mount -> run effects -> **simulate unmount (run cleanup)** -> **remount (run effects again)** on the *initial* mount of a component tree. This is intentional: it simulates what happens when a component is unmounted and remounted (e.g., due to Suspense/Fast Refresh/tab restoration in some environments), forcing you to write effects whose cleanup correctly undoes their setup - which is exactly what makes effects resilient to being torn down and rebuilt at arbitrary times.

**If your effect breaks under this double-fire, your cleanup function is incomplete** - that's the bug StrictMode is designed to catch, not a StrictMode bug itself.

### Interview question

**Q: Why does my `useEffect` run twice in development, and should I worry about it in production?**

> "In React 18, `StrictMode` intentionally mounts, unmounts, and remounts components once in development to verify effects clean up correctly - this simulates future concurrent-rendering scenarios where components can be torn down and rebuilt. It does not happen in production and has no production cost. If the double-fire causes a visible bug - like a duplicate network call with a side effect, or a subscription leak - that means the effect's cleanup function isn't correctly undoing everything the effect set up, which is a real bug StrictMode surfaced early, not something to suppress."

---

## 8. Does a re-render always touch the DOM?

**No.** A "re-render" means React called your component function again and computed a new element tree during the render phase. Whether that produces any **DOM mutation** depends entirely on whether the reconciliation diff finds actual differences.

```jsx
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <StaticChild />   {/* re-renders (function called again) but produces identical output -> no DOM change for this subtree, assuming no memo bail-out even happened */}
    </div>
  );
}
```

Without `memo`, `StaticChild`'s function body **is called again** on every `Parent` re-render (this is "re-rendering" in the strict sense), but if its output is identical to before, the **commit phase applies zero DOM mutations** for that subtree - React still did the diff work, but found nothing to change.

This distinction matters for performance conversations (chapter 04): `React.memo` avoids the **render call itself** (skips calling the function at all if props are shallow-equal), which is a different optimization than "the diff found no changes" (which still costs CPU time to compute, just skips DOM writes).

### Interview question

**Q: If a child component's output doesn't change, does the DOM update?**

> "Not necessarily. Re-render means the component function ran again during the render phase and produced a new element tree - but if reconciliation finds that tree is equivalent to the previous one, no DOM mutations happen in the commit phase. That's different from `React.memo`, which skips calling the component function entirely when props are shallow-equal, avoiding both the render call and the diff work, not just the DOM write."

---

## Interview question bank (rendering & reconciliation)

1. **What is the virtual DOM and why does it exist?**
2. **Walk me through render phase vs commit phase.**
3. **What is Fiber, and what problem did it solve versus the old reconciler?**
4. **What are the two core heuristics that make React's diffing O(n) instead of O(n^3)?**
5. **Why do keys matter in lists? What's the failure mode with index-as-key?**
6. **When is index-as-key actually acceptable?**
7. **What does it mean for a component to be "pure," and why does React care?**
8. **What's the difference between `React.memo` and a re-render that produces no DOM change?**
9. **What is automatic batching in React 18, and how is it different from React 17?**
10. **Why doesn't `console.log` show the updated state right after calling `setState`?**
11. **What does `React.StrictMode` actually do, and why do effects fire twice in dev?**
12. **If a `<div>` becomes a `<span>` at the same tree position, what does React do?**
13. **What is the `alternate` fiber, and why does React keep two trees (current/work-in-progress)?**
14. **Does calling `setState` with the same value trigger a re-render?** (For primitives, React bails out via `Object.is` comparison if the state is exactly equal to the current value - no re-render is scheduled. For objects/arrays, a new reference always differs even with identical contents.)

---

## Hands-on drills (do these)

- [ ] Build a small list with a "shuffle" button and a per-row uncontrolled `<input>`. Use `index` as key first and observe the bug when shuffling (typed text jumps to the wrong row). Fix it with a stable `id` key and confirm text stays attached to the correct row.
- [ ] Add a `console.log` inside a component's render body (not in an effect) and wrap the app in `StrictMode` - observe it logging twice on mount in development.
- [ ] Write a component that intentionally mutates a module-level variable during render, and explain out loud why this is unsafe under concurrent rendering / StrictMode, even if it "seems to work."
- [ ] Build two `setCount(count + 1)` calls in one handler vs two `setCount(c => c + 1)` calls; log final state to prove the closure-staleness bug and its fix.
- [ ] Wrap a child in `React.memo` and pass it an inline arrow function prop from the parent; verify it re-renders every time despite `memo`. Fix with `useCallback` and verify the child stops re-rendering.
- [ ] Use React DevTools Profiler to record a click that updates parent state, and inspect which children actually re-rendered vs which ones bailed out.

---

## Senior red flags / green flags

### Green flags interviewers love
- Distinguishing "re-render" (function called) from "DOM update" (commit changed something) precisely.
- Explaining *why* keys matter via the state-attachment failure mode, not just "React said to add one."
- Knowing render phase must be pure and *why* (multiple invocation possibility), not just "don't put side effects in render."
- Connecting Fiber to interruptibility/concurrency, not describing it as "just a rewrite."

### Red flags
- "Virtual DOM is always faster than real DOM" with no nuance.
- "Keys are just to make the warning go away."
- Describing `useEffect` running twice in `StrictMode` as a bug to work around instead of a signal to fix cleanup.
- Confusing reconciliation (the algorithm) with the virtual DOM (the data structure) as if they're the same thing.

---

## Mastery checklist

- [ ] I can explain virtual DOM, render phase, commit phase, and Fiber as four distinct but related concepts.
- [ ] I can explain the key-based list diffing failure mode with a concrete example, not just abstractly.
- [ ] I can define component purity precisely and name 2-3 real code patterns that violate it.
- [ ] I can explain React 18 automatic batching and predict render counts across event handlers, promises, and timeouts.
- [ ] I can explain what `StrictMode` does mechanically and why double-firing effects is intentional, not a bug.
- [ ] I can distinguish "component re-rendered" from "DOM actually changed" with a concrete example.
