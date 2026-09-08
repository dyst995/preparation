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

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
