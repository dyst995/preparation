# Custom Hooks — Encapsulating Reusable Stateful Logic

## What you need to know

A **custom hook** is a JS function that:

1. Is named `use…` (lint + convention).  
2. Calls other hooks (`useState`, `useEffect`, …) internally.

It does **not** create a shared global store. **Each call site gets its own independent hook state** — as if the internals were inlined into that component’s fiber list.

Use them to reuse **stateful logic** (timers, subscriptions, debouncing, storage sync), not to share one in-memory value across the tree (that’s Context / Zustand / Redux).

Prerequisites: [hooks mechanics](../9.%20hooks-mechanics/notes.md), [Rules of Hooks](../10.%20rules-of-hooks/notes.md), [useState](../11.%20usestate/notes.md) / [useEffect](../12.%20useeffect/notes.md) / [useRef](../15.%20useref/notes.md).

---

## Mental model: inlining onto the caller’s fiber

```jsx
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = () => setOn((v) => !v);
  return [on, toggle];
}

function A() {
  const [on, toggle] = useToggle(); // A's fiber: useState slot
}
function B() {
  const [on, toggle] = useToggle(); // B's fiber: separate useState slot
}
```

`A` and `B` do **not** share `on`. Two calls to `useToggle` in the **same** component also create **two** independent slots (like two `useState`s).

Rules of Hooks still apply **inside** the custom hook: no conditional hook calls.

---

## Example: `useDebouncedValue` (preserved)

```jsx
function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
```

Consumer types into controlled `query`; API effect depends on `debouncedQuery` — fewer requests. Cleanup cancels the pending timeout when `value` changes again before `delayMs`.

---

## Example: `usePrevious` (preserved)

```jsx
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  }); // after every render: store what was just rendered
  return ref.current; // during render: still previous value
}
```

**Why it works:** render reads `ref.current` (last effect’s write = previous render’s value). Then effect runs and updates the ref for **next** time. First render typically returns `undefined`.

(Effect with **no deps array** runs every render — intentional here.)

---

## Example: `useLocalStorage` (preserved)

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
      // storage full / disabled
    }
  }, [key, value]);

  return [value, setValue];
}
```

Lazy init reads storage once per mount. Effect writes when `value`/`key` change.

### Shared key ≠ shared React state

Two components calling `useLocalStorage('theme', 'light')` each have **their own** `useState`. They both may write the same key; they do **not** share one in-memory cell. Updating one does **not** automatically re-render the other unless you add a `storage` event listener or lift state / use a real store.

---

## Design principles (preserved)

1. **Stable, minimal API** — `[value, setValue]` or `{ data, error, isLoading }`.  
2. **Encapsulate cleanup** — consumers shouldn’t forget `removeEventListener` / `clearTimeout`.  
3. **Don’t extract too early** — one-off indirection isn’t reuse; extract when patterns repeat or complexity clarifies.  
4. **Name for what, not how** — `useDebouncedValue`, not `useEffectWithTimeout`.

Also: return **stable setters** when possible (or document identity); avoid returning new object literals every render if consumers put the return value in deps without care — or document that the return is fresh each time.

---

## Custom hooks vs Context / global stores

| Goal | Tool |
| --- | --- |
| Reuse the *same logic* in many places | Custom hook |
| Share *one* live value across many components | Context, Redux, Zustand, … |
| Both | Hook that **reads** context (`useTheme`) — logic reuse + shared source |

`useLocalStorage` alone ≠ cross-component sync. A `useTheme` that reads `ThemeContext` shares because of Context, not because of the `use` prefix.

---

## Testing and composition

- Custom hooks are tested via a small harness component or `@testing-library/react` `renderHook`.  
- Hooks compose: `useDebouncedValue` inside `useSearchResults`.  
- Each composition still appends hooks to **whichever component** called the outermost hook.

---

## Common mistakes and misconceptions

1. Thinking two `useLocalStorage('x')` share one React state.  
2. Conditional calls inside the custom hook.  
3. Extracting a hook for a one-line `useState` with no reuse.  
4. Naming helpers `useFoo` when they don’t call hooks (confuses lint).  
5. Forgetting cleanup inside the hook so every consumer leaks.  
6. Expecting `usePrevious` to return the previous value *after* the effect in the same render (it returns previous *during* render).

---

## Connections to other concepts

```
custom hook call
  → hooks append to caller's fiber list
    → independent state per call site

use prefix
  → eslint Rules of Hooks

debounce / previous / localStorage
  → useState + useEffect + useRef compositions

need shared memory
  → Context/store, not hook alone
```

---

## Interview perspective

**Q: Two components call `useLocalStorage('theme', 'light')` — shared state?**

Preserved answer:

> No. Each call site gets independent hook state. Custom hooks reuse **logic**, not a shared instance. Each fiber has its own list — two separate `useState`s, each syncing to the same key independently, not sharing in-memory state. For real shared state use Context, Zustand, or Redux.

Follow-ups: how `usePrevious` timing works; when to extract a hook; debounce cleanup.

---

# Self-test

## Core recall

1. What is a custom hook?
2. Do two components calling the same custom hook share state?
3. Where do a custom hook’s `useState` slots live?
4. What does `useDebouncedValue` return and why clear the timeout in cleanup?
5. Why does `usePrevious` return the previous value during render?
6. Does `useLocalStorage` synchronize two components’ in-memory state automatically?
7. Name three design principles for custom hooks.
8. When should you *not* extract a custom hook?

## Explain why

1. Why isn’t a custom hook a global store?
2. Why must custom hooks follow the Rules of Hooks internally?
3. Why is the `use` prefix important?
4. Why does debounce cleanup matter for search-as-you-type?
5. Why is `usePrevious`’s effect scheduled after render essential to the pattern?
6. Why can two `useLocalStorage('theme')` diverge in the UI?

## Compare and contrast

1. Custom hook vs shared Context value  
2. Custom hook vs copying hook code into each component  
3. `useLocalStorage` vs Redux/Zustand for theme  
4. Naming `useDebouncedValue` vs `useEffectWithTimeout`  
5. Two `useToggle()` in one component vs one in each of two components  

## Predict the behavior

1. `A` and `B` both `useToggle()` — toggling `A` affects `B`?  
2. One component calls `useDebouncedValue(query, 300)` twice for two queries — shared debounce state?  
3. First render of `usePrevious(5)` — typical return value?  
4. After `count` goes 1 → 2, during the render where `count === 2`, what does `usePrevious(count)` return?

## Debugging

1. Engineer expects all tabs using `useLocalStorage('tab')` to update together in memory — they don’t. Fix approaches?  
2. Custom hook calls `useEffect` only when `enabled` — lint/runtime issues. Fix?  
3. Debounced search still fires every keypress — consumer effect depends on `query` not `debouncedQuery`. Diagnosis?  
4. `usePrevious` always equals current value in an effect that reads it — timing confusion?

## Application

1. Write `useToggle(initial)`.  
2. Write `useDebouncedValue` as in the notes.  
3. Sketch `useMediaQuery(query)` with subscribe/unsubscribe cleanup.  
4. Refactor duplicated “subscribe to window resize” from two components into a hook.  
5. Answer: shared theme across tree — hook alone or Context? Why?

## Interview questions

1. If two components both call `useLocalStorage('theme', 'light')`, do they share state?  
   **Follow-ups:** How would you share? What does a custom hook reuse?

2. How do custom hooks relate to the fiber hook list?

3. Explain `usePrevious`.

4. When do you extract a custom hook?

5. Design a good API for an async `useFetch(url)` return value.

## Connections

1. How does this unit apply hooks mechanics (positional list)?
2. How do Rules of Hooks + `use` naming connect?
3. How do debounce cleanups reuse the useEffect cleanup lesson?
4. How does `usePrevious` reuse the useRef “box” lesson?
5. How do you combine a custom hook with Context for `useAuth()`?
