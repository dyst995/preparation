# 07. useRef in depth

> Source: `interview-prep/react/02-hooks-deep-dive.md`

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
