# 05. useLayoutEffect vs useEffect

> Source: `interview-prep/react/02-hooks-deep-dive.md`

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
