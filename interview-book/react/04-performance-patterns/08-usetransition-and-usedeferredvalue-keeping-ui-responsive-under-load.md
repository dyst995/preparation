# 08. useTransition and useDeferredValue - keeping UI responsive under load

> Source: `interview-prep/react/04-performance-patterns.md`

### The problem they solve

Some state updates are **urgent** (typing in a text box should feel instant) and some are **not urgent but expensive** (re-filtering a huge list based on that same input). If both happen in the same render, the expensive part can block the urgent part from feeling responsive.

### `useTransition`

Marks a state update as **low priority** - React will keep the UI responsive to more urgent updates (like further typing) and can interrupt/deprioritize the transition's render work.

```jsx
function SearchPage() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState([]);

  function handleChange(e) {
    setQuery(e.target.value);            // urgent - input feels instant
    startTransition(() => {
      setResults(computeExpensiveResults(e.target.value));  // low priority - can lag behind without blocking typing
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}
      <ResultsList results={results} />
    </>
  );
}
```

### `useDeferredValue`

A related primitive: defers using a value for expensive rendering until more urgent updates settle, without needing to wrap the state setter itself.

```jsx
function SearchPage() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);   // lags behind `query` under load, catches up when idle

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <ExpensiveResultsList query={deferredQuery} />  {/* re-renders at lower priority */}
    </>
  );
}
```

### When to reach for these vs plain debouncing

- **Debouncing** delays work by a *fixed time*, regardless of device speed - can feel laggy on fast devices and still not enough on slow ones.
- **`useTransition`/`useDeferredValue`** let React interleave the expensive work with the browser's actual capacity to keep up, adapting to real device performance, and can be interrupted/abandoned entirely if a newer urgent update supersedes it (unlike a debounce timer, which just delays, not cancels-and-restarts).

### Interview question

**Q: When would you use `useTransition` over just debouncing an input?**

> "Debouncing delays the expensive work by a fixed timer regardless of the device's actual capacity - it's a blunt instrument. `useTransition` tells React the update is lower priority, so React can interleave it with more urgent work like continued typing, and can genuinely abandon a stale transition if a newer one supersedes it, adapting to real rendering cost rather than a guessed delay. I'd reach for it when the expensive work is a React render/computation I want React's scheduler to deprioritize, and reach for debouncing more when I want to reduce the *frequency* of an external effect, like network requests, which `useTransition` doesn't address by itself."

---
