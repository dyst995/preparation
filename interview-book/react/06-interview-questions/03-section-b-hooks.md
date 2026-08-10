# 03. Section B - Hooks

> Source: `interview-prep/react/06-interview-questions.md`

**B1. Mechanically, how does React know which state belongs to which `useState` call?**
> Each fiber holds an ordered linked list of hook records in `memoizedState`; hooks are matched to their slot by call order/position across renders, not by name - which is why the Rules of Hooks (unconditional, top-level, same order every render) exist.

**B2. Why can't hooks be called conditionally?**
> Because hook identity is purely positional. Skipping a hook call shifts every subsequent hook's position in the list, causing React to read/write the wrong hook's stored state for each following call.

**B3. Difference between `useState(fn())` and `useState(() => fn())`?**
> The former calls `fn()` on every render (wasteful if expensive, since only the very first render's result is used); the latter passes a lazy initializer React only invokes once, on mount.

**B4. Explain a stale closure bug with `setInterval` inside `useEffect([])`.**
> The interval's callback closes over state from the render when the effect was created; with an empty dependency array the effect never re-runs, so the callback keeps referencing the original value forever. Fix: functional updater form (`setCount(c => c + 1)`), or include the dependency and accept the interval recreates.

**B5. When does an effect's cleanup function run?**
> Before the effect re-runs (dependencies changed), and on unmount - to tear down whatever the previous invocation set up before the next one (or teardown) happens.

**B6. `useEffect` vs `useLayoutEffect` - timing and use case?**
> `useEffect` runs asynchronously after paint - default choice for most side effects (fetching, subscriptions, logging). `useLayoutEffect` runs synchronously after DOM mutation but before paint - needed when you must measure/mutate the DOM before the user sees a flash, e.g., positioning a tooltip based on measured dimensions.

**B7. What's the "effects vs events" model?**
> Effects synchronize a component with an external system for as long as some condition holds (subscribe to a store while an ID is active). Events respond to a specific user interaction (submit, click). Side effects that are really "when the user does X" (like firing an analytics event on submit) belong directly in the event handler, not routed through a `useEffect` watching a boolean flag - doing the latter risks duplicate firing from unrelated re-renders/remounts.

**B8. Why doesn't mutating `ref.current` trigger a re-render?**
> Refs intentionally live outside React's rendering/diffing cycle - they're for bookkeeping values (timer IDs, previous-value caches, DOM node handles) that shouldn't affect what's rendered. If a value should affect the UI, it belongs in state.

**B9. Do two components calling the same custom hook share state?**
> No - each call site gets an independent set of hook state, exactly as if the hook's internals were inlined per component. Custom hooks share logic, not state; shared state requires Context, Zustand, Redux, or similar.

**B10. When would you use `useReducer` over multiple `useState` calls?**
> When state transitions are complex, multiple sub-values change together, or the next state depends non-trivially on the previous state - a reducer centralizes and simplifies testing transition logic as a pure function, and makes it easier to log/trace dispatched actions.

---
