# `useLayoutEffect` vs `useEffect`

## What you need to know

| | `useEffect` | `useLayoutEffect` |
| --- | --- | --- |
| Timing | Async, **after paint** | Sync, after DOM mutation, **before paint** |
| Blocks paint? | No | **Yes** — browser waits until it finishes |
| Use for | Fetch, subscriptions, analytics, most side effects | Measure/mutate DOM **before** the user sees a frame (tooltips, scroll restore, avoid flicker) |
| SSR | Fine | Warns: does nothing useful on server (no DOM) |
| Cost if overused | Low for paint | Can hurt **perceived** performance |

Default to **`useEffect`**. Reach for **`useLayoutEffect`** only when a wrong first paint would flash.

Same rules otherwise: deps, cleanup, no conditional calls — see [useEffect](../12.%20useeffect/notes.md) and [Rules of Hooks](../10.%20rules-of-hooks/notes.md).

Prerequisites: [render vs commit](../2.%20render-vs-commit/notes.md).

---

## Where each sits in the timeline

```text
Render (pure) → Commit DOM mutations
                 → useLayoutEffect (cleanup + setup)  ← still before paint
                 → Browser paints
                 → useEffect (cleanup + setup)        ← after paint
```

Both run in the **commit** phase family of work; the difference is **relative to paint**.

`useLayoutEffect` can call `setState`. That may trigger a **synchronous** re-render still before paint, so the user never sees the intermediate frame — which is exactly why tooltips use it, and why heavy work there is dangerous.

---

## When `useLayoutEffect` is correct (preserved)

Measure size/position and adjust layout **before paint** so the user never sees `(0,0)` then a jump.

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
    // Before paint: no flash at (0, 0)
  }, [targetRef]);

  return (
    <div ref={tooltipRef} style={{ position: 'absolute', ...position }}>
      …
    </div>
  );
}
```

With **`useEffect`** instead: paint may show initial position, then effect runs, `setState`, second paint snaps — **visible flicker**.

Other classic cases:

- Restore **scroll position** before paint.  
- Focus management that must not flash unfocused content (sometimes).  
- Hiding/showing based on measured overflow without a flash of wrong layout.

Keep the layout effect **short** — only measurement + minimal state updates.

---

## When `useEffect` is correct (default)

- Data fetching  
- Subscriptions / WebSockets  
- Logging / analytics  
- Syncing to `localStorage` when a flash doesn’t matter  
- Anything that can happen **after** the user already sees the new UI  

Using `useLayoutEffect` for fetch doesn’t make data arrive sooner; it only **blocks paint** while the sync part of your callback runs (the await still continues later) — almost always the wrong tool.

---

## SSR / React Native notes

**SSR:** `useLayoutEffect` warns because there’s no browser DOM to measure on the server. Patterns:

- Prefer `useEffect` when measurement is client-only and a brief wrong frame is OK, or  
- Gate client-only layout effects, or use libraries that handle hydration carefully.

**React Native:** timing details differ (no browser paint model the same way); interviews for web still want the table above. RN often treats layout effects as the place for pre-paint host layout work — know web story first.

---

## Performance mental model

| Choice | User experience risk |
| --- | --- |
| `useEffect` for layout measure | Flicker / jump |
| `useLayoutEffect` for heavy work | Jank — delayed first paint |
| `useLayoutEffect` for tiny measure + setState | Smooth first paint |

Interview line: **useLayoutEffect is a scalpel, not a default upgrade.**

---

## Shared rules (don’t forget)

- Dependency arrays and stale closures still apply.  
- Return cleanup when you add listeners in either hook.  
- StrictMode still double-invokes effects in development (including layout effects’ setup/cleanup stress).  
- Prefer refs for the DOM nodes you measure (`tooltipRef.current`).

---

## Common mistakes and misconceptions

1. Using `useLayoutEffect` for “important” fetches.  
2. Putting slow logic in layout effects → blocked paint.  
3. Using `useEffect` for tooltip positioning and wondering about flicker.  
4. Ignoring SSR warnings for layout effects.  
5. Thinking layout effect runs *during* render (it doesn’t — it’s after DOM commit, before paint).  
6. Assuming layout effect avoids needing deps/cleanup.

---

## Connections to other concepts

```
commit DOM
  → useLayoutEffect → paint → useEffect

flicker = painted intermediate state
  → layout effect + setState before paint

useRef
  → hold DOM nodes to measure

useEffect unit
  → same hook rules; different scheduling vs paint
```

---

## Interview perspective

**Q: When would you reach for `useLayoutEffect` instead of `useEffect`?**

Preserved answer:

> When I must measure or mutate the DOM **before paint** to avoid a visible flash — e.g. position a tooltip from `getBoundingClientRect`. It **blocks paint**, so keep it fast and rare. Fetch, subscriptions, logging → **`useEffect`**.

Follow-ups: timeline; SSR warning; what goes wrong with `useEffect` for that tooltip.

---

# Self-test

## Core recall

1. When does `useEffect` run relative to paint? `useLayoutEffect`?
2. Which one can block the browser from painting?
3. Default choice for data fetching / subscriptions?
4. Classic UI reason to use `useLayoutEffect`?
5. What SSR issue does `useLayoutEffect` have?
6. Does `useLayoutEffect` run during the render phase?
7. Why can `setState` inside `useLayoutEffect` avoid flicker?
8. Name one cost of overusing `useLayoutEffect`.

## Explain why

1. Why does measuring a tooltip in `useEffect` often flicker?
2. Why shouldn’t you put heavy work in `useLayoutEffect`?
3. Why is `useEffect` still correct for most side effects?
4. Why does SSR warn about `useLayoutEffect`?
5. Why does the tooltip example use refs?
6. Why isn’t “faster updates” a reason to prefer layout effects for fetch?

## Compare and contrast

1. `useEffect` vs `useLayoutEffect`  
2. Blocking paint vs flickering  
3. Layout measurement vs network I/O  
4. `useLayoutEffect` + `setState` vs `useEffect` + `setState` (first paint)  
5. Client-only measure vs SSR render output  

## Predict the behavior

1. Tooltip positioned in `useEffect` from `(0,0)` initial state — what can the user see?  
2. Same in `useLayoutEffect` — first painted frame?  
3. `useLayoutEffect` runs a 200ms busy loop — what happens to paint?  
4. Fetch in `useLayoutEffect` vs `useEffect` — does data arrive meaningfully sooner?

## Debugging

1. Popover flashes at wrong place then jumps. Which hook to try?  
2. App feels sluggish on navigation; many components use `useLayoutEffect` for logging. Problem?  
3. SSR warning about `useLayoutEffect`. Options?  
4. Scroll restore still flickers with `useEffect`. Why might layout effect help?

## Application

1. Sketch measure-and-position logic with `useLayoutEffect` + two refs.  
2. List three side effects that should stay on `useEffect`.  
3. Write the commit→layout effect→paint→passive effect sequence from memory.  
4. One sentence: when to choose layout effect.

## Interview questions

1. When would you use `useLayoutEffect` instead of `useEffect`?  
   **Follow-ups:** Performance? SSR? Tooltip with `useEffect`?

2. Walk through the timeline including both hooks.

3. Why can `useLayoutEffect` hurt performance?

4. Does `useLayoutEffect` replace the need for cleanup/deps?

5. How do you avoid tooltip flicker?

## Connections

1. How does this refine the render vs commit timeline?
2. How do refs from earlier hooks material connect?
3. How does StrictMode still apply?
4. How does this relate to “re-render vs DOM” (DOM exists before layout effect)?
5. When would CSS-only positioning beat either effect?
