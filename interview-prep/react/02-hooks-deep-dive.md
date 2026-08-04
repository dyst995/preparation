
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

## 1. How hooks work mechanically

### The linked-list mental model

Each function component instance has an associated **fiber**, and that fiber holds a **linked list of hook objects** in `memoizedState`. Every hook call (`useState`, `useEffect`, etc.) inside that component corresponds to one node in that list, **in the exact order they're called**.

```javascript
// Roughly what a fiber's hook list looks like after:
// const [a, setA] = useState(0);
// useEffect(() => {...}, [a]);
// const ref = useRef(null);

fiber.memoizedState = {
  memoizedState: 0,              // useState's value
  next: {
    memoizedState: { deps: [0], destroy: fn },  // useEffect's record
    next: {
      memoizedState: { current: null },          // useRef's record
      next: null,
    },
  },
};
```

On every re-render, React walks this list **in order** and matches each hook call to its corresponding slot by **position**, not by name or any other identifier. This is the entire reason the Rules of Hooks exist.

### Why hooks must be called unconditionally, in the same order, every render

If you conditionally skip a hook call:

```jsx
function Bad({ shouldTrack }) {
  const [name, setName] = useState('');
  if (shouldTrack) {
    useEffect(() => { track(name); }, [name]);  // BAD: conditional hook call
  }
  const ref = useRef(null);
  return <input value={name} onChange={e => setName(e.target.value)} ref={ref} />;
}
```

If `shouldTrack` changes between renders, the position of the `useRef` call in the list shifts - React would try to read `ref`'s value from whatever slot the `useEffect` used to occupy (or vice versa), silently corrupting hook state. React actually detects many such mismatches at the dev-mode "rendered fewer/more hooks than expected" error, but the underlying mechanism is exactly this positional linked list.

### Interview question

**Q: Why can't hooks be called conditionally or inside loops?**

> "React tracks hooks per component as an ordered linked list on the fiber, matched by call position across renders - not by name. If a hook call is skipped conditionally, every hook after it shifts position, and React reads the wrong hook's stored state for each subsequent slot. The rule exists because hooks have no other identity mechanism; call order *is* their identity."

---

## 2. The Rules of Hooks

1. **Only call hooks at the top level.** Never inside loops, conditions, or nested functions - ensures call order stays consistent across renders.
2. **Only call hooks from React function components or custom hooks.** Not from regular JS functions, class components, or event handler bodies directly (you can call a hook-derived function *inside* an event handler, but the hook call itself must be at the top level of the component).
3. (Practical corollary) **Custom hooks must start with `use`** - this isn't just convention, it's how the linter (`eslint-plugin-react-hooks`) and React's own tooling identify which functions need the "top-level, unconditional" rules applied.

### Legitimate ways to handle "conditional" logic without violating the rules

```jsx
// WRONG: conditional hook call
if (isEnabled) {
  useEffect(() => { ... }, []);
}

// RIGHT: always call the hook; branch inside it
useEffect(() => {
  if (!isEnabled) return;
  // ... effect logic
}, [isEnabled]);
```

```jsx
// WRONG: hook in a loop
items.forEach(item => {
  const [state, setState] = useState(item.value); // BAD
});

// RIGHT: lift array-item state into a single structure, or render a child component
// per item where each child owns its own useState call at a stable position.
function ItemRow({ item }) {
  const [value, setValue] = useState(item.value); // fine - one per component instance
  return ...;
}
```

### Interview question

**Q: You need a hook only for admin users. How do you structure this?**

> "I always call the hook unconditionally, and put the conditional logic *inside* the hook body - e.g., `useEffect(() => { if (!isAdmin) return; ...}, [isAdmin])` - or I extract the admin-only behavior into a custom hook and always call it, letting the hook internally no-op when the condition isn't met. I never wrap the hook call itself in an `if`."

---

## 3. `useState` in depth

### Basic contract

```jsx
const [state, setState] = useState(initialValue);
```

- `initialValue` is only used on the **first render** for that fiber; ignored on every subsequent render.
- `setState` schedules a re-render (unless the new value is `Object.is`-equal to the current value, in which case React bails out and does not re-render - a lesser-known but interview-relevant optimization).

### Lazy initialization - avoid expensive work on every render

```jsx
// BAD: expensiveComputation() runs on every render, even though only the first result is used
const [data, setData] = useState(expensiveComputation());

// GOOD: pass a function - React only calls it once, on mount
const [data, setData] = useState(() => expensiveComputation());
```

This matters because the *expression* `expensiveComputation()` is evaluated every time the component function runs (every render), even though `useState` only *uses* that value on the very first call. Passing a function defers evaluation to only the initial mount.

### Functional updates - avoiding stale closures when batching

```jsx
// Given multiple updates in the same batch/handler, this is WRONG if you want cumulative +2:
setCount(count + 1);
setCount(count + 1);   // both read the same stale `count` from this render's closure -> net +1

// RIGHT: functional form always receives the latest pending value:
setCount(c => c + 1);
setCount(c => c + 1);  // net +2
```

**Rule of thumb:** if the new state depends on the previous state, always use the functional updater form - it's correct regardless of batching behavior and protects against subtle async bugs (e.g., updating state inside a `setTimeout` or a promise resolution where the closure may be stale).

### `Object.is` bail-out

```jsx
function Bad() {
  const [obj, setObj] = useState({ count: 0 });
  return (
    <button onClick={() => setObj(obj)}>  {/* same reference -> React bails out, NO re-render */}
      Click
    </button>
  );
}
```

For objects/arrays, passing the *same reference* back skips the re-render (`Object.is(prevState, nextState)` is `true`), but passing a **new object with identical values** (`{...obj}`) still triggers a re-render, because references differ even if shallowly "equal" in content. This is a frequent point of confusion - immutability discipline (always create new references for changed data) directly interacts with this bail-out mechanism.

### Interview question

**Q: Why should you use the functional updater form of `setState`?**

> "Because state updates can be batched, and the plain-value form captures whatever `state` was in the closure at the time the handler ran - calling it multiple times with the same stale value collapses into effectively one update. The functional form `setState(s => ...)` always operates on the most recent pending state, so sequential updates compose correctly, and it's also safer inside async callbacks where the closure might be stale by the time it runs."

---

## 4. `useEffect` in depth

### What effects are actually for

`useEffect` synchronizes a component with an **external system** - the DOM outside React's control, a subscription, a timer, browser APIs, analytics, or a network request. It is **not** a general "run this after render" hook for arbitrary logic, and it is **not** for responding to a specific user interaction (that's what event handlers are for - see Section 6).

### Timing

`useEffect` callbacks run **asynchronously after the browser paints** ("passive effects"). Sequence per commit:

1. React commits DOM mutations.
2. Browser paints the updated screen.
3. React runs cleanup for the *previous* effect (if dependencies changed) then the *new* effect callback.

This means `useEffect` never blocks the paint - good for most side effects (data fetching, subscriptions, analytics) since the user sees the UI update immediately, without effect work delaying visible feedback.

### Dependency array semantics

```jsx
useEffect(() => { /* effect */ }, [a, b]);   // runs on mount, and again whenever a or b changes (by Object.is)
useEffect(() => { /* effect */ });            // no array: runs after EVERY render (rare, usually a smell)
useEffect(() => { /* effect */ }, []);        // empty array: runs once on mount, cleanup once on unmount
```

**Every value from component scope used inside the effect (props, state, functions defined in the component) must be listed as a dependency**, or you risk a **stale closure** - the effect capturing an old value that never updates even though the "current" value elsewhere in the component has changed.

### Classic stale closure bug

```jsx
function Timer() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1);   // BUG: `count` is captured at effect-creation time (always 0 here)
    }, 1000);
    return () => clearInterval(id);
  }, []);  // empty deps -> effect runs once, closure locks in count=0 forever

  return <div>{count}</div>;   // stuck incrementing from a fixed base, or displays "1" forever
}
```

**Fix 1 - functional updater** (best when you don't actually need `count`'s value elsewhere in the effect):

```jsx
useEffect(() => {
  const id = setInterval(() => {
    setCount(c => c + 1);   // reads latest state directly from React, no closure dependency
  }, 1000);
  return () => clearInterval(id);
}, []);
```

**Fix 2 - correct dependency array** (recreates the interval each time `count` changes - can be wasteful for intervals specifically, but is the *conceptually correct* general fix for effects that truly need the current value of something):

```jsx
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1);
  }, 1000);
  return () => clearInterval(id);
}, [count]);
```

### Cleanup functions

The function returned from an effect runs:
1. **Before the effect re-runs** (when dependencies change) - to tear down the *previous* effect's side effects.
2. **On unmount** - final teardown.

```jsx
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal })
    .then(res => res.json())
    .then(setData)
    .catch(err => { if (err.name !== 'AbortError') setError(err); });

  return () => controller.abort();   // cancels in-flight request if `url` changes or component unmounts
}, [url]);
```

Without cleanup here, rapidly changing `url` (e.g., a search-as-you-type field) can cause a **race condition**: an older, slower request resolves *after* a newer one and overwrites fresher data with stale results. Cleanup (aborting) prevents that.

### The exhaustive-deps ESLint rule - respect it, don't silence it

`eslint-plugin-react-hooks`'s `exhaustive-deps` rule flags missing dependencies. The correct response to a warning is almost always to **fix the actual data flow** (functional updates, moving a value inside the effect, wrapping a function in `useCallback`, or restructuring), not to add `// eslint-disable-next-line`. Silencing it is one of the most common sources of stale-closure production bugs.

### Infinite loop pattern (and why it happens)

```jsx
function Bad({ options }) {  // `options` is a new object literal from the parent every render, e.g. <Bad options={{sort: 'asc'}} />
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData(options).then(setData);
  }, [options]);   // `options` is a NEW reference every parent render -> effect re-runs every render -> setData triggers a re-render -> loop-ish churn (not infinite in the strictest sense, but constant re-fetching)

  return <View data={data} />;
}
```

**Fix:** memoize `options` in the parent (`useMemo`), pass primitive fields instead of an object, or destructure only the primitive values the effect actually needs into the dependency array.

### Interview question

**Q: You have a `useEffect` with an empty dependency array that reads a piece of state inside a `setInterval`. It seems "stuck" on the initial value. Why, and how do you fix it?**

> "The effect ran once because of the empty array, so the closure captured `count`'s value from that first render permanently - the interval's callback keeps referencing that stale variable. The fix is either the functional updater form `setCount(c => c + 1)`, which reads React's latest state without needing the closure to be fresh, or including the dependency and accepting the interval gets recreated each time it changes - the first approach is usually preferred for this exact case."

---

## 5. `useLayoutEffect` vs `useEffect`

| | `useEffect` | `useLayoutEffect` |
|---|---|---|
| Timing | Async, after paint | Sync, after DOM mutation but **before paint** |
| Blocks visual update? | No | Yes - browser waits for it to finish before painting |
| Use for | Data fetching, subscriptions, analytics, most side effects | Measuring/mutating DOM synchronously before the user sees a flash (layout measurement, scroll position restoration, avoiding visual flicker) |
| SSR warning | None | Warns in SSR ("useLayoutEffect does nothing on the server") since there's no DOM to measure |
| Performance cost | Low, doesn't block rendering | Can hurt perceived performance if overused - blocks paint |

### When `useLayoutEffect` is the *correct* choice

Classic case: measuring an element's size/position and synchronously adjusting layout **before the browser paints**, to avoid a visible flicker.

```jsx
function Tooltip({ targetRef }) {
  const tooltipRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    const rect = targetRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    setPosition({
      top: rect.top - tooltipRect.height,
      left: rect.left,
    });
    // Runs before paint: user never sees the tooltip flash at position (0,0) first.
  }, [targetRef]);

  return <div ref={tooltipRef} style={{ position: 'absolute', ...position }}>...</div>;
}
```

If this used `useEffect` instead, the browser could paint the tooltip at its initial `(0, 0)` position first, then immediately snap to the correct position on the next paint - a visible flicker/jump.

### Interview question

**Q: When would you reach for `useLayoutEffect` instead of `useEffect`?**

> "When I need to measure or mutate the DOM synchronously *before* the browser paints, to avoid a visible flash - for example, measuring an element's size to position a tooltip or popover correctly on first render. `useLayoutEffect` blocks paint until it finishes, so it should be used sparingly and kept fast, since overusing it can hurt perceived performance. For anything that doesn't need to happen before paint - fetching data, setting up subscriptions, logging - `useEffect` is the default and correct choice."

---

## 6. Effects vs events - the mental model that resolves most `useEffect` misuse

This is one of the most valuable mental models for both interviews and real code review.

| | **Effect** (`useEffect`) | **Event handler** |
|---|---|---|
| Triggered by | A value changing / component syncing with the outside world | A specific user interaction (click, submit, keypress) |
| Answers | "What does this component need to *stay in sync with* as long as it's rendered/some value changes?" | "What should happen when the user does X?" |
| Example | Subscribing to a WebSocket while a chat room ID is active; syncing `document.title` to a state value | Submitting a form; sending an analytics event on a specific button click; showing a toast right after an action |

### The most common misuse: putting event-response logic in an effect

```jsx
// BAD: using an effect to react to a "submission" that's really an event, not a sync-with-external-system need.
function Form() {
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (submitted) {
      sendAnalytics('form_submitted');   // this is really "when the user submits, do X" - an event, not a sync
      setSubmitted(false);
    }
  }, [submitted]);

  function handleSubmit() {
    // ...validate...
    setSubmitted(true);   // indirect trigger just to get into the effect
  }
}

// GOOD: call it directly in the event handler - simpler, no extra state, no effect indirection, no risk
// of the effect firing again for unrelated reasons that also happen to leave `submitted` truthy.
function Form() {
  function handleSubmit() {
    // ...validate...
    sendAnalytics('form_submitted');
  }
}
```

**Why this matters beyond style:** effects run whenever their dependencies change, for *any* reason - not just the one you had in mind. An effect that's really "respond to this specific click" can accidentally re-fire due to unrelated re-renders, remounts (see `StrictMode` double-invoke), or dependency changes triggered elsewhere, producing duplicate side effects (double analytics events, duplicate toasts, etc.) that are hard to trace back to the root cause.

### Decision checklist

Ask: **"Does this side effect need to happen because the component is displaying data that depends on some external system, and should stay synchronized with it for as long as that's true?"**
- Yes -> effect (e.g., subscribe to a store, fetch data based on an ID, sync scroll position).
- No, it's "when the user does X, do Y" -> event handler, called directly from the interaction callback.

### Interview question

**Q: Give an example of using `useEffect` when a plain event handler would have been correct - and why is that a problem?**

> "A common one is firing an analytics event by setting a boolean state in a click handler and having a `useEffect` watch that boolean to fire the analytics call. It's really just 'on click, log an event' - an event, not something needing synchronization. The effect version adds indirection, extra state, and risk: the effect can re-fire due to remounts (like StrictMode's dev double-invoke) or unrelated dependency churn, producing duplicate analytics events that are hard to trace. The fix is calling the side effect directly inside the click handler."

---

## 7. `useRef` in depth

### Two main uses

1. **Mutable value that persists across renders without causing re-renders when changed** - unlike state, mutating `ref.current` does not schedule a re-render and is not tracked by React's diffing.
2. **Direct access to a DOM node** (or component instance via `forwardRef`) - the escape hatch for imperative operations React doesn't model declaratively (focus, scroll position, media playback, text selection, measuring).

```jsx
function SearchBox() {
  const inputRef = useRef(null);
  const renderCountRef = useRef(0);
  renderCountRef.current++;   // OK here - this is fine as a debugging aid, but treat with caution (see purity notes in ch.01);
                                // safer to increment inside an effect if you want to strictly avoid mutation during render.

  useEffect(() => { inputRef.current.focus(); }, []);

  return <input ref={inputRef} />;
}
```

### Why refs don't trigger re-renders (and when that's exactly what you want)

State exists to drive **what's rendered on screen**. Refs exist for values the component needs to **remember across renders without that value being part of the rendered UI** - a timer ID, a previous prop value for comparison, a flag like "has this effect already run," a DOM node reference, or a mutable cache that isn't itself displayed.

```jsx
// Storing an interval ID - changing it should NOT cause a re-render; it's bookkeeping, not UI state.
function usePolling(callback, delay) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; }, [callback]);

  useEffect(() => {
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
```

This pattern (`savedCallback` ref) is a common way to avoid re-creating the interval every time `callback` changes reference, while still always calling the *latest* version of `callback` - a good example of combining refs and effects correctly.

### Common ref mistakes

```jsx
// MISTAKE: expecting a UI update when a ref changes.
function Bad() {
  const countRef = useRef(0);
  return (
    <button onClick={() => { countRef.current++; }}>
      {countRef.current}  {/* never visually updates - mutating a ref doesn't trigger re-render */}
    </button>
  );
}
```

```jsx
// MISTAKE: reading/writing ref.current during render (not in an event handler or effect) for
// anything that affects what's displayed - this reintroduces the purity problems from chapter 01.
function Bad2() {
  const ref = useRef(0);
  ref.current = ref.current + 1;  // mutating during render - unsafe under StrictMode double-invoke / concurrent rendering
  return <div>{ref.current}</div>;
}
```

### Interview question

**Q: Why doesn't updating `ref.current` re-render the component - and when is that a feature, not a limitation?**

> "Refs are explicitly designed to hold mutable values outside React's rendering/diffing cycle - they don't participate in the virtual DOM comparison, so mutating them is intentionally invisible to the render pipeline. That's exactly right for bookkeeping values that shouldn't affect what's on screen - like a timer ID, a previous-value cache for comparisons, or a flag - because triggering a re-render for pure bookkeeping would be wasteful. If a value *should* be reflected in the UI, it belongs in state, not a ref."

---

## 8. Custom hooks - encapsulating reusable stateful logic

A custom hook is just a JS function whose name starts with `use` and that calls other hooks internally. It doesn't create a new "instance" of state shared across components - **each call site gets its own independent state**, exactly as if the hook's internals were inlined into that component.

### Example: `useDebouncedValue`

```jsx
function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);   // cancel the pending update if value changes again before delay elapses
  }, [value, delayMs]);

  return debounced;
}

// Usage: search-as-you-type without spamming the API on every keystroke.
function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    if (debouncedQuery) fetchResults(debouncedQuery);
  }, [debouncedQuery]);

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

### Example: `usePrevious`

```jsx
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => { ref.current = value; });  // runs AFTER render, so ref still holds the PREVIOUS value during this render
  return ref.current;
}

function Component({ count }) {
  const prevCount = usePrevious(count);
  return <div>Now: {count}, before: {prevCount}</div>;
}
```

This works because the effect (which updates the ref) runs *after* the render that reads `ref.current` - so during any given render, `ref.current` still reflects whatever was set during the *previous* render's effect.

### Example: `useLocalStorage`

```jsx
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full / disabled - fail silently or log
    }
  }, [key, value]);

  return [value, setValue];
}
```

### Design principles for good custom hooks

- **Return a stable, minimal API** - usually `[value, setValue]` (state-like) or `{ data, error, isLoading }` (async-like), matching conventions users expect from `useState`/similar built-ins.
- **Encapsulate the messy parts** (event listeners, timers, cleanup) so consumers can't forget to clean up.
- **Don't overgeneralize prematurely** - a custom hook used in exactly one place with no reuse benefit is often just unnecessary indirection; extract when a pattern repeats or when isolating complex effect logic clarifies a component.
- **Name for what it does, not how** - `useDebouncedValue`, not `useEffectWithTimeout`.

### Interview question

**Q: If two components both call `useLocalStorage('theme', 'light')`, do they share state?**

> "No - each call site gets an entirely independent set of hook state. Custom hooks are not a shared-state mechanism; they're reusable *logic*. Each component's fiber has its own hook list, so calling the same custom hook from two components produces two separate `useState` instances internally, each syncing independently to the same `localStorage` key, but not sharing in-memory state with each other. If you need actual shared state across components, that's a job for Context, Zustand, or Redux - not a custom hook alone."

---

## 9. Other built-in hooks (working knowledge)

### `useReducer`

Preferred over multiple `useState` calls when:
- State transitions are complex, with multiple sub-values that change together.
- The next state depends on the previous state in non-trivial ways.
- You want to centralize/test transition logic (a reducer is a pure function, trivially unit-testable) or make debugging easier (a single dispatched action log).

```jsx
function reducer(state, action) {
  switch (action.type) {
    case 'increment': return { ...state, count: state.count + 1 };
    case 'reset': return { count: 0 };
    default: throw new Error(`Unknown action: ${action.type}`);
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0 });
  return <button onClick={() => dispatch({ type: 'increment' })}>{state.count}</button>;
}
```

### `useContext`

Reads the nearest matching `Provider`'s value; re-renders the consuming component whenever that value changes (see chapter 03 for the "Context re-render everything" pitfall in depth).

### `useMemo` / `useCallback`

Covered in depth in chapter 04 (Performance Patterns) - memoize a computed value / a function reference respectively, to preserve referential equality across renders, primarily useful to avoid breaking `React.memo` children or avoid expensive recomputation.

### `useImperativeHandle`

Customizes what a parent sees when it attaches a `ref` to a component wrapped in `forwardRef` - used to expose a controlled imperative API (e.g., `focus()`, `scrollIntoView()`) instead of the raw DOM node.

```jsx
const FancyInput = forwardRef((props, ref) => {
  const inputRef = useRef(null);
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus(),
    clear: () => { inputRef.current.value = ''; },
  }));
  return <input ref={inputRef} {...props} />;
});
```

### `useId`

Generates a stable, unique ID string safe for SSR (matches between server and client render) - used for associating labels/inputs (`htmlFor`/`id`) without hardcoding IDs that could collide if the component renders multiple times on a page.

### `useSyncExternalStore`

The correct low-level primitive for subscribing to external stores (outside React state) in a concurrent-safe way - this is what libraries like Zustand and Redux's `useSelector` are built on under the hood in modern versions, ensuring tearing-free reads during concurrent rendering.

---

## Interview question bank (hooks)

1. **Mechanically, how does React know which `useState` call corresponds to which state across renders?**
2. **Why must hooks be called unconditionally, at the top level?**
3. **What's the difference between `useState(expensiveFn())` and `useState(() => expensiveFn())`?**
4. **Explain the stale closure problem with a `setInterval` inside `useEffect`.**
5. **When does an effect's cleanup function run?**
6. **What's the difference between `useEffect` and `useLayoutEffect`, mechanically and in timing?**
7. **Give an example where using `useLayoutEffect` fixes a visible bug that `useEffect` would cause.**
8. **What's the "effects vs events" mental model, and how does it prevent misuse of `useEffect`?**
9. **Why doesn't mutating `ref.current` cause a re-render, and when is that useful?**
10. **Do two components calling the same custom hook share state? Why or why not?**
11. **When would you reach for `useReducer` instead of multiple `useState` calls?**
12. **What does the `exhaustive-deps` ESLint rule check, and why shouldn't you casually disable it?**
13. **Explain a real bug you've hit from a missing dependency, and how you diagnosed/fixed it.**
14. **What is `useSyncExternalStore` for, and why do external store libraries need it instead of just `useState` + a subscription?**

---

## Hands-on drills (do these)

- [ ] Build the buggy `setInterval` + `useEffect([])` stale-closure example; observe the bug; fix it with a functional updater; fix it a second way with a correct dependency array; explain the tradeoff between the two fixes out loud.
- [ ] Build `useDebouncedValue` from scratch and wire it into a search input with a fake async fetch; verify it doesn't fire a request per keystroke.
- [ ] Build `usePrevious` and use it to show a "+N" or "-N" delta indicator next to a changing counter.
- [ ] Take a `useEffect` that fires an analytics event based on a boolean flag set from a click handler; refactor it to call the analytics function directly in the handler; explain why this is strictly better.
- [ ] Build a tooltip/popover that measures a target element's `getBoundingClientRect()`; implement it first with `useEffect` (observe the flicker), then fix with `useLayoutEffect`.
- [ ] Intentionally write a component that calls a hook inside an `if` block; run it and read the actual React error message; explain what's happening under the hood.

---

## Senior red flags / green flags

### Green flags interviewers love
- Explaining hooks via the "linked list matched by call order" model, not just "it's magic React does."
- Immediately reframing a "why is my effect firing twice/looping" bug in terms of dependency array + closure correctness.
- Applying the effects-vs-events distinction unprompted when reviewing a `useEffect`-heavy code sample.
- Knowing exactly when `useLayoutEffect` is *necessary* (not just "it's the sync version").

### Red flags
- "I just add `// eslint-disable-next-line react-hooks/exhaustive-deps` when it complains."
- Treating `useEffect` as a general "do this after render" hook for any logic, including direct responses to clicks/submits.
- Not knowing that refs don't trigger re-renders, or using state where a ref was clearly correct (e.g., storing a timer ID in `useState`).
- Believing custom hooks share state across call sites by default.

---

## Mastery checklist

- [ ] I can explain hooks' internal call-order-based identity model and why the Rules of Hooks follow from it.
- [ ] I can diagnose and fix a stale-closure bug in a `useEffect` without looking anything up.
- [ ] I can explain `useLayoutEffect` vs `useEffect` with a concrete visible-bug example, not just a definition.
- [ ] I can apply the "effects vs events" model to refactor a misused `useEffect` on the spot.
- [ ] I can write 3+ custom hooks from memory (`useDebouncedValue`, `usePrevious`, `useLocalStorage`) and explain their internals.
- [ ] I can explain when `useReducer` beats multiple `useState` calls with a concrete example.
