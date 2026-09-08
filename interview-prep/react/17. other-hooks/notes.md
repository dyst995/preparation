# Other Built-in Hooks (Working Knowledge)

## What you need to know

Beyond `useState` / `useEffect` / `useRef` / `useLayoutEffect`, interviews expect **working knowledge** of:

| Hook | One-liner |
| --- | --- |
| `useReducer` | Dispatch actions through a pure reducer for complex state |
| `useContext` | Read nearest Provider value; re-render when it changes |
| `useMemo` / `useCallback` | Stabilize values / function identities (perf — ch.04 deep dive) |
| `useImperativeHandle` | Customize what `forwardRef` parents get on a ref |
| `useId` | SSR-safe unique IDs for a11y (`label`/`htmlFor`) |
| `useSyncExternalStore` | Concurrent-safe subscribe to external stores |

This unit is breadth + clear “when to reach for it.” Deep memo performance and Context pitfalls get full chapters later — know enough to choose correctly here.

Prerequisites: [useState](../11.%20usestate/notes.md), [useRef](../15.%20useref/notes.md), [custom hooks](../16.%20custom-hooks/notes.md).

---

## `useReducer`

```jsx
function reducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + 1 };
    case 'reset':
      return { count: 0 };
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0 });
  return (
    <button onClick={() => dispatch({ type: 'increment' })}>
      {state.count}
    </button>
  );
}
```

**Prefer over many `useState`s when:**

- Multiple fields change **together** in coordinated transitions.  
- Next state depends on previous in **non-trivial** ways.  
- You want **testable** pure transitions / a clear action log for debugging.

`dispatch` identity is stable. Lazy init: `useReducer(reducer, initArg, initFn)`.

Same immutability / bail-out ideas as `useState` — return a **new** state object when something changed.

---

## `useContext`

```jsx
const ThemeContext = createContext('light');

function ThemedButton() {
  const theme = useContext(ThemeContext);
  return <button className={theme}>…</button>;
}

// Ancestor:
<ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
```

- Reads the **nearest** matching Provider.  
- Consumer **re-renders when the Provider `value` changes** (reference matters — new object every parent render re-renders all consumers).  
- Not a replacement for all props; good for cross-cutting concerns (theme, auth, i18n).

Pitfall “Context re-renders everything under a changing value” → chapter 03. Interview teaser: split contexts, memoize value, or select with external store.

---

## `useMemo` / `useCallback` (pointer + working knowledge)

```jsx
const sorted = useMemo(() => expensiveSort(items), [items]);
const onSelect = useCallback((id) => setSelected(id), []);
```

- **`useMemo`:** cache a **computed value** until deps change.  
- **`useCallback`:** cache a **function** reference until deps change (`useCallback(fn, deps)` ≈ `useMemo(() => fn, deps)`).

**Main uses:** keep referential equality for `React.memo` children; skip expensive recalculation.

**Not:** default wrapping of everything. Measure first — chapter 04.

---

## `useImperativeHandle` (+ `forwardRef`)

Expose a **controlled imperative API** instead of the raw DOM node:

```jsx
const FancyInput = forwardRef((props, ref) => {
  const inputRef = useRef(null);
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus(),
    clear: () => {
      inputRef.current.value = '';
    },
  }));
  return <input ref={inputRef} {...props} />;
});

// Parent: fancyRef.current.focus() / .clear()
```

Use sparingly — prefer declarative props. Reach for this when parents must call `focus`/`scrollTo`/`play` on a child that shouldn’t expose the whole DOM.

Optional deps array like other hooks: `useImperativeHandle(ref, createHandle, [deps])`.

---

## `useId`

```jsx
function Field({ label }) {
  const id = useId();
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} />
    </>
  );
}
```

Generates a **stable unique ID** that **matches SSR and client** hydration — avoids collisions when the component appears many times, without hardcoding `"email"`.

Not for keys in lists (`key={item.id}` still from data). Not a replacement for `crypto.randomUUID()` for database IDs.

---

## `useSyncExternalStore`

Low-level primitive to subscribe to a store **outside** React state in a **concurrent-safe** way (avoids “tearing” — seeing inconsistent store snapshots mid-render under concurrent features).

```jsx
const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
// SSR: third argument getServerSnapshot
```

Modern Zustand / Redux `useSelector`-style bindings use this under the hood. Prefer a library for app code unless you’re writing a store binding.

Versus naive `useEffect` + `useState` subscribe: effect-based subscriptions can tear under concurrent rendering; this API is the supported fix.

---

## Quick chooser

| Problem | Hook |
| --- | --- |
| Complex multi-field transitions | `useReducer` |
| Deep tree needs theme/auth | `useContext` (+ careful value identity) |
| Expensive derive / stable callback for memo child | `useMemo` / `useCallback` |
| Parent must `ref.focus()` custom input | `forwardRef` + `useImperativeHandle` |
| Label/input ids with SSR | `useId` |
| Bind to Zustand/Redux/external store | `useSyncExternalStore` (usually via lib) |

---

## Common mistakes and misconceptions

1. `useReducer` for a single boolean toggled once — overkill.  
2. Putting a new object in Context `value={{…}}` every render without memo → mass re-renders.  
3. `useMemo`/`useCallback` everywhere “for performance.”  
4. `useImperativeHandle` as default instead of props.  
5. `useId` as React list `key`.  
6. Rolling `useEffect` store subscriptions when you should use `useSyncExternalStore` / a library.

---

## Connections to other concepts

```
useState
  → useReducer (same state hook family, action-shaped updates)

useRef + forwardRef
  → useImperativeHandle (shape the ref API)

useContext
  → shared values (vs custom hooks = shared logic only)

useMemo/useCallback
  → memo / pure-components / performance chapter

useSyncExternalStore
  → concurrent safety for external data
```

---

## Interview perspective

Be ready to:

1. When `useReducer` over `useState`.  
2. What `useContext` does and the value-identity re-render caveat.  
3. One-line `useMemo` vs `useCallback`.  
4. What `useImperativeHandle` is for (with `forwardRef`).  
5. Why `useId` exists (SSR + a11y).  
6. What problem `useSyncExternalStore` solves (tearing / concurrent external stores).

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
