# Custom Hooks — Answers

## Core recall

1. A `use…` function that calls other hooks to reuse stateful logic.
2. **No** — each call site has independent state.
3. On the **calling component’s fiber** hook list (inlined order).
4. A delayed mirror of `value`; cleanup cancels the pending timeout when inputs change early.
5. Effect updates the ref **after** render, so during render the ref still holds the last render’s value.
6. **No** — separate in-memory state; both may write the same key but don’t share React state.
7. Minimal stable API; encapsulate cleanup; don’t over-extract; name for purpose.
8. When there’s no reuse / clarity win — pure indirection.

## Explain why

1. It only runs hooks on whoever called it; no single shared fiber/store unless you add Context/etc.
2. Its hooks are part of the caller’s ordered list — conditionals inside still shift slots.
3. Signals hook composition to humans and `eslint-plugin-react-hooks`.
4. Without cleanup, multiple timeouts can fire and apply outdated values / extra fetches.
5. If you wrote the ref during render, you’d overwrite before reading previous; effect defers the write.
6. Each has its own `useState`; updating one re-renders only that component unless something else notifies peers.

## Compare and contrast

1. **Hook:** reuse logic / per-instance state. **Context:** shared value + subscriptions to it.  
2. **Hook:** DRY + one cleanup implementation. **Copy-paste:** easy to forget cleanup / drift.  
3. **`useLocalStorage` alone:** per-component memory + disk. **Store:** one live theme for the tree.  
4. **What:** clear intent. **How:** leaks implementation; harder to reuse conceptually.  
5. **Same component two calls:** two slots. **Two components:** two fibers, still independent.

## Predict the behavior

1. **No.**  
2. **No** — two separate debounce states.  
3. **`undefined`** (typically).  
4. **`1`** (previous).

## Debugging

1. Add Context/store, or `storage` event sync, or lift state — don’t expect the hook alone to broadcast.  
2. Always call hooks; branch inside effects with `enabled` in deps.  
3. Wire fetch to **debounced** value, not raw `query`.  
4. In the same effect as “after update,” previous may already be updated if you read after other effects — read `usePrevious` during render for “previous,” or compare in an effect using a ref pattern carefully.

## Application

1.
```jsx
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  return [on, () => setOn((v) => !v)];
}
```

2. As in curriculum notes.  
3.
```jsx
function useMediaQuery(query) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatch(mql.matches);
    mql.addEventListener('change', onChange);
    setMatch(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return match;
}
```

4. `useWindowSize` / `useResizeObserver` encapsulating listener + state + cleanup.  
5. **Context (or store)** for shared live theme; optional `useTheme()` hook that *reads* context.

## Interview questions

1. **Spoken:** No shared React state — independent slots per call; both may hit the same key. Share via Context/Zustand/Redux. Hooks reuse logic.  
   **Follow-ups:** storage events; `useTheme` wrapping context.

2. **Spoken:** Hooks inside append to the caller’s fiber list in call order — like inlining.

3. **Spoken:** Return ref’s current (previous); effect after render writes current for next time.

4. **Spoken:** When logic repeats or complex effects/cleanup clarify the component — not for every line.

5. **Spoken:** Something like `{ data, error, isLoading, refetch }` — predictable async shape.

## Connections

1. Call order in the custom hook becomes consecutive slots on the caller — mechanics unit.  
2. `use` prefix + unconditional calls — rules unit.  
3. Timeout cleanup — same as effect cleanup / race prevention.  
4. Ref as mutable box updated in an effect — useRef unit.  
5. `useAuth` = thin hook over `useContext(AuthContext)` — reuse access pattern + shared source of truth.
