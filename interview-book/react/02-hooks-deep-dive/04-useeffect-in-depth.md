# 04. useEffect in depth

> Source: `interview-prep/react/02-hooks-deep-dive.md`

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
