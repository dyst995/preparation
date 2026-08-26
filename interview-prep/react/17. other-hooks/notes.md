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

# Self-test

## Core recall

1. When prefer `useReducer` over multiple `useState`s?
2. What does `useContext` read, and when does the consumer re-render?
3. One-line difference: `useMemo` vs `useCallback`?
4. What does `useImperativeHandle` customize?
5. What is `useId` for? What is it not for?
6. What problem does `useSyncExternalStore` address?
7. Is `dispatch` from `useReducer` typically stable?
8. Name a library pattern built on `useSyncExternalStore`.

## Explain why

1. Why is a reducer easier to unit-test than scattered `setState`s?
2. Why can Context cause large re-render subtrees?
3. Why aren’t `useMemo`/`useCallback` default on every value/function?
4. Why expose `focus()` via `useImperativeHandle` instead of the raw input ref sometimes?
5. Why must `useId` be SSR-safe?
6. Why is `useEffect` + `setState` a weaker external-store subscription under concurrent React?

## Compare and contrast

1. `useState` vs `useReducer`  
2. Custom hook alone vs `useContext`  
3. `useMemo` vs recalculating each render  
4. `forwardRef` alone vs `forwardRef` + `useImperativeHandle`  
5. `useId` vs `key={item.id}`  
6. External store via `useSyncExternalStore` vs copying into React state manually  

## Predict / choose the hook

1. Wizard with many fields and named transitions (`NEXT`, `BACK`, `SET_EMAIL`) — which hook?  
2. App theme needed in header and footer — which?  
3. Memoized list row needs stable `onSelect` — which?  
4. Design system `TextField` should allow parent `ref.current.focus()` without exposing DOM — which?  
5. Two password fields on one page need unique label ids with SSR — which?

## Debugging

1. All Context consumers re-render every parent keystroke; `value={{ theme, setTheme }}`. Fix approach?  
2. Parent `ref.current` is an input node but you wanted only `.shake()`. What’s missing?  
3. Hydration warning on `id={Math.random()}`. Better approach?  
4. UI tears reading a Zustand-like store with homemade effect subscription. What API?

## Application

1. Write a tiny `useReducer` counter with `increment` / `reset`.  
2. Sketch Provider + `useContext` for a string locale.  
3. Wrap an input with `forwardRef` + `useImperativeHandle` exposing `focus`.  
4. Wire `label`/`input` with `useId`.  
5. One sentence each: when you’d mention `useMemo` and `useSyncExternalStore` in an interview.

## Interview questions

1. When do you choose `useReducer` over `useState`?  
2. How does `useContext` trigger re-renders?  
3. What are `useMemo` and `useCallback` for at a high level?  
4. Explain `useImperativeHandle`.  
5. Why does `useId` exist?  
6. What is `useSyncExternalStore` and who uses it?

## Connections

1. How does `useReducer` connect to the useState immutability / updater story?
2. How does Context differ from custom hooks for sharing?
3. How do `useCallback` + `memo` connect to the pure-components / re-render unit?
4. How does `useImperativeHandle` extend the useRef / forwardRef story?
5. How does `useSyncExternalStore` relate to concurrent rendering / Fiber?
