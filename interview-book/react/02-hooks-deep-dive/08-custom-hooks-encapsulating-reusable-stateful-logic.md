# 08. Custom hooks - encapsulating reusable stateful logic

> Source: `interview-prep/react/02-hooks-deep-dive.md`

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
