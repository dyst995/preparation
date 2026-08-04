
# 06 - Interview Question Bank

> Goal: A large, organized Q&A bank covering everything in chapters 01-05, plus coding/whiteboard prompts, rapid-fire drills, behavioral/CV-tie-back questions, and a final readiness checklist. Use this chapter last, after studying 01-05, and loop back to weak areas.

Mark progress with `[x]` as you master each section.

---

## How to use this chapter

1. Cover the answer, read only the question, answer out loud in under 90 seconds.
2. Compare against the model answer - check for missing mechanism/depth, not just "got the gist."
3. For coding prompts, actually write the code (in a scratchpad, not just mentally) before checking the solution sketch.
4. Do the rapid-fire round timed, aiming for under 15 seconds per question.
5. Revisit anything you fumbled the next day.

---

## Section A - Rendering & Reconciliation

**A1. What is the virtual DOM, and why does React use it?**
> A lightweight in-memory tree of plain JS objects describing the intended UI. React diffs the new tree against the previous one (reconciliation) and applies only the minimal real DOM mutations needed. The value is a declarative programming model plus batched, efficient updates - not "always faster than the DOM" in every case.

**A2. What's the difference between render phase and commit phase?**
> Render phase calls component functions and computes the diff; it must be pure and can be paused/discarded/redone. Commit phase applies DOM mutations and runs effects (`useLayoutEffect` synchronously before paint, `useEffect` asynchronously after); it runs to completion once started.

**A3. What is Fiber?**
> Both a persistent linked-list data structure mirroring the component tree, and the reconciler algorithm built on it. It made rendering interruptible - React can pause after each fiber node and yield to more urgent work (like input handling), unlike the old synchronous recursive stack reconciler.

**A4. Why does React need `key` on list items?**
> Keys give stable identity across renders so React can correctly match items during reordering/insertion/deletion, rather than falling back to position-based matching, which can misattribute component state and uncontrolled DOM values (focus, input values) to the wrong logical item.

**A5. What's the failure mode of using array index as key?**
> When the list reorders or has items inserted/removed anywhere but the end, index-based matching treats the item at a given position as "the same" even though its underlying data changed - causing state or uncontrolled input values to appear attached to the wrong row.

**A6. What makes a component "pure," and why does React care?**
> Same props/state always produce the same output, with no observable side effects during render. React may call render functions more than once (StrictMode dev double-invoke, concurrent rendering pausing/resuming), so impure renders produce inconsistent results or duplicated side effects. Purity is also the precondition for `memo`/`useMemo` to safely skip work.

**A7. What is automatic batching in React 18?**
> Multiple `setState` calls occurring in the same tick - across event handlers, promises, timeouts, and other async contexts - are batched into a single re-render by default, unlike React 17 where only React event handler contexts batched automatically.

**A8. Why does `console.log` right after `setState` show the old value?**
> State updates are scheduled, not synchronous; the log reads the current render's closure, which still holds the pre-update value until the component re-renders with fresh state.

**A9. What does `React.StrictMode` do, and why do effects fire twice in dev?**
> Dev-only helper that double-invokes render functions and mount/cleanup/mount of effects on initial mount, to surface impure renders and effects with incomplete cleanup - simulating future unmount/remount scenarios. No production cost or behavior change.

**A10. If a `<div>` becomes a `<span>` at the same tree position, what happens?**
> React sees a type mismatch at that position and doesn't diff children - it unmounts the entire old subtree (destroying state, running cleanup) and mounts a fresh one for the new type.

---

## Section B - Hooks

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

## Section C - State & Data Fetching

**C1. How do you decide where a new piece of state should live?**
> Classify it first: local-to-one-component -> `useState`; server-owned/fetched data -> React Query regardless of sharing scope; client-only and rarely changing/shared -> Context; client-only and more frequently changing/shared -> Zustand or Redux depending on complexity and team conventions.

**C2. Why is server state fundamentally different from client state?**
> Server state is borrowed, can be stale the instant it arrives, may be updated by other clients, and benefits from background revalidation/caching/deduplication - properties client-owned synchronous state doesn't have. Treating server data like plain client state means hand-rebuilding caching/dedup/staleness logic ad hoc.

**C3. What goes wrong with `useState` + `useEffect` for data fetching at scale?**
> No caching (refetch every mount even if fresh), no deduplication across components needing the same data, manual race-condition guarding, and manual reimplementation of loading/error/retry/refetch-on-focus logic in every component that fetches.

**C4. Explain `staleTime` vs `gcTime`/`cacheTime` in React Query.**
> `staleTime` is how long data is considered fresh - within that window, no refetch happens on remount/refocus. `gcTime` is how long unused (no active observers) cached data is kept in memory before being garbage collected, independent of freshness.

**C5. How does React Query prevent duplicate requests?**
> Requests are deduplicated by query key - multiple components calling `useQuery` with the same key share one in-flight request and one cache entry rather than firing independent network calls.

**C6. What is an optimistic update, and how do you roll it back?**
> Updating the cache immediately with the expected result before the server confirms, for instant UI feedback. In React Query, `onMutate` snapshots the previous cache value and applies the optimistic change; `onError` restores the snapshot if the mutation fails; `onSettled` typically re-invalidates to reconcile with server truth either way.

**C7. Why does Context re-render every consumer on any value change?**
> Context has no built-in selector mechanism - any change to the Provider's `value` reference notifies every consuming component, regardless of which part of that value it actually reads. Mitigations: memoize the value, split into multiple contexts by update frequency/concern, or use a selector-based store (Zustand) for frequently-changing widely-consumed state.

**C8. How does Zustand achieve selective re-rendering without a Provider?**
> Stores live outside React as a plain object; components subscribe via a selector function and only re-render when their specific selected slice changes (built on `useSyncExternalStore` under the hood), and no Provider wrapping is needed since the store is just an importable hook.

**C9. What does Immer let you do inside `createSlice`, and is it actually safe?**
> Write code that looks like direct mutation (`state.field = value`) against a special draft proxy; Immer produces a correctly immutable new state under the hood by recording the changes and applying them structurally. The store's actual state remains immutable - Immer just removes manual spread-boilerplate for deep updates.

**C10. When would you choose Redux Toolkit over Zustand?**
> When the domain is large/cross-cutting with many interacting slices, the team has established Redux conventions, you need strict action-based auditing/logging, deep DevTools time-travel debugging, or a bigger middleware ecosystem - versus Zustand for smaller, feature-scoped shared state without that overhead.

**C11. RTK Query vs React Query - what's the actual difference?**
> Same core problem (server-state caching/sync) with different integration points - RTK Query lives inside the Redux store (server cache visible alongside client state in Redux DevTools), React Query is standalone and state-library-agnostic. Choice often comes down to whether you want server-state logic coupled to Redux or independent of whichever client-state library is in use.

**C12. Why might putting fetched API data directly into Redux/Zustand be an anti-pattern?**
> It reimplements caching, staleness, deduplication, and invalidation by hand inside a general-purpose store not designed for network lifecycle concerns - usually resulting in more code and more bugs (stale data, race conditions) than delegating that responsibility to React Query.

**C13. When is prop drilling actually fine?**
> For 1-2 levels, when it keeps data flow explicit and traceable via simple prop search - often preferable to introducing global state machinery for a narrow, shallow need. It becomes a problem past ~3 levels or when many unrelated branches need the same prop, forcing intermediate components to carry data they don't use.

**C14. Architect state for a dashboard with: user session, a filterable/sortable data table, and a live product list.**
> Session -> Redux (or Context if simple and app-wide but rarely changes) since it's genuinely global and cross-cutting. Table filters/sort/pagination -> Zustand or local component state depending on how widely those controls are shared. Product list -> React Query, with the query key including the current filter/sort/pagination params so changing them naturally produces a distinct, cacheable query.

---

## Section D - Performance

**D1. What's your methodology for a performance problem?**
> Reproduce the specific symptom, profile (React DevTools Profiler / Chrome Performance tab) to find the actual bottleneck, form a hypothesis, apply the smallest targeted fix, re-measure to confirm - never guess-and-memoize upfront.

**D2. Why might `React.memo` fail to prevent a re-render even when applied correctly on the child?**
> `memo`'s comparison is shallow; if the parent passes a new object/array/function reference every render (inline literals), the child sees "different" props every time regardless of content equality, defeating memoization. The parent must keep those references stable via `useMemo`/`useCallback`.

**D3. Give two distinct reasons to use `useMemo`.**
> (1) Avoid recomputing a genuinely expensive calculation; (2) preserve referential identity of a resulting object/array so a `memo`-wrapped child or another hook's dependency array doesn't see a "new" value every render, even for a cheap computation.

**D4. When does `useCallback` provide zero benefit?**
> When the function isn't consumed by anything reference-sensitive - i.e., not passed to a `memo`-wrapped component and not used as another hook's dependency. Wrapping it still costs a dependency comparison for no payoff.

**D5. When do you actually need list virtualization?**
> When list size (hundreds-to-thousands+ of rows, especially with non-trivial row content) makes rendering every row measurably expensive - confirmed by profiling, not assumed. Tradeoffs: often needs known/estimated row heights, complicates native find-in-page/scrollbar behaviors, and adds implementation complexity.

**D6. Route-based splitting vs component-level splitting - which is higher leverage by default?**
> Route-based splitting is usually the highest-leverage default since users only download code for the page they're visiting. Component-level splitting is valuable for heavy, conditionally-shown UI (rich editors, charting libraries, rarely-used admin panels) layered on top of route splitting.

**D7. What's a request waterfall, and how do you tell accidental from necessary?**
> Requests that could run in parallel run sequentially instead. Accidental waterfalls come from component nesting/mount order with no real data dependency between the requests (fix: fetch in parallel using params already available). Necessary ones exist when one query genuinely needs another's result (fix: explicit gating, e.g., React Query's `enabled`, not blind restructuring).

**D8. What problem does `useTransition` solve that plain debouncing doesn't?**
> Debouncing delays work by a fixed timer regardless of device capability. `useTransition` marks an update as low priority so React's scheduler can interleave it with more urgent work and abandon a stale transition entirely if superseded - adapting to actual rendering cost rather than a guessed delay.

**D9. Is a faster raw computation always the right performance fix?**
> No - perceived performance (skeleton screens, optimistic UI, instant click feedback, avoiding layout shift) often matters more to users than shaving milliseconds off actual computation; both are worth measuring and addressing.

---

## Section E - Forms, UI & CSS

**E1. Controlled vs uncontrolled inputs - when to choose each?**
> Controlled: need live validation/formatting/derived UI per keystroke, single source of truth in state. Uncontrolled: only need final values at submit time, want to minimize re-renders on large forms, or working with inputs React can't control anyway (file inputs).

**E2. What causes the "changing an uncontrolled input to controlled" warning?**
> The input's `value` prop is `undefined` on an early render (uncontrolled) and becomes a defined value later (controlled) - usually from initializing state with data that hasn't loaded yet. Fix: initialize state to a defined default (`?? ''`).

**E3. How do you prevent double form submission?**
> Track `isSubmitting` state, disable the submit button while true, and additionally guard the top of the submit handler to bail out if already submitting, resetting the flag in a `finally` block regardless of success/failure.

**E4. Why does React Hook Form avoid per-keystroke re-renders?**
> It tracks inputs via refs (uncontrolled internally) rather than controlled state, only triggering re-renders for state you actually subscribe to (like `errors` or `isSubmitting`), not on every keystroke.

**E5. Why is `<div onClick>` worse than `<button>` for a clickable action?**
> `<div>` isn't keyboard-focusable or operable via Enter/Space by default and announces no meaningful role to screen readers - all of that would need to be manually re-implemented (`tabIndex`, key handlers, `role="button"`), whereas `<button>` provides it natively.

**E6. What's the default `type` of a `<button>` inside a `<form>`, and what bug results from forgetting it?**
> Defaults to `type="submit"`. A "cancel" or "toggle" button without an explicit `type="button"` will unintentionally submit the form when clicked.

**E7. `justify-content` vs `align-items` in Flexbox?**
> `justify-content` aligns children along the main axis (defined by `flex-direction`); `align-items` aligns them along the cross axis.

**E8. When would you choose Grid over Flexbox?**
> When the layout is genuinely two-dimensional - coordinating rows and columns together (page shells, dashboards, card grids) - versus Flexbox's one-dimensional row-or-column model.

**E9. How do you keep Tailwind utility strings maintainable as components grow?**
> Extract a React component once a utility combination repeats or grows unwieldy (preferred, keeps style co-located with the component); reserve `@apply` for cases where a component wrapper isn't practical, like shared non-component markup.

**E10. What's the "first rule of ARIA"?**
> No ARIA is better than bad ARIA - prefer native semantic HTML first, and only add ARIA roles/attributes to fill gaps native elements can't cover, since incorrect ARIA can actively make an experience worse for assistive technology users than having none at all.

---

## Section F - Rapid-fire round (answer in under 15 seconds each)

1. What compiles JSX into `createElement` calls? *(Babel/the JSX transform)*
2. What's the default `flex-direction`? *(row, on web; note RN defaults to column)*
3. What hook do you use to read the nearest Provider's value? *(`useContext`)*
4. What React 18 hook lets you defer a value under load? *(`useDeferredValue`)*
5. What's the shorthand meaning of `flex: 1`? *(grow:1, shrink:1, basis:0%)*
6. What does `Object.is` comparison govern in `useState`? *(whether setting the same value bails out of a re-render)*
7. What hook exposes a query's in-flight mutation status? *(`useMutation`'s `isPending`/`isPending` state)*
8. What CSS property creates named layout regions in Grid? *(`grid-template-areas`)*
9. What ARIA attribute announces an error message immediately? *(`role="alert"`)*
10. What does `React.lazy` require to show a fallback? *(`Suspense`)*
11. What's the RTK function that bundles reducer + actions? *(`createSlice`)*
12. What Zustand middleware persists state to storage? *(`persist`)*
13. What React Query function marks cached data as stale and triggers a refetch? *(`invalidateQueries`)*
14. What hook gives you a stable SSR-safe unique ID? *(`useId`)*
15. What's the React 18 root API that enables automatic batching? *(`createRoot`)*
16. What CSS unit is commonly used for responsive font sizing relative to the root element? *(`rem`)*
17. What native HTML element association makes clicking a label focus its input? *(`<label htmlFor>` / `<label>` wrapping)*
18. What's the React DevTools Profiler feature that shows why a component rendered? *("render reasons," e.g. props/state/hooks changed)*
19. What hook do you use to imperatively expose a custom API through a ref? *(`useImperativeHandle`, with `forwardRef`)*
20. What's the escape hatch to force a synchronous, unbatched update? *(`flushSync`)*

---

## Section G - Live coding / whiteboard prompts

For each, actually write the code before reading the solution sketch.

**G1. Implement a `useDebouncedValue(value, delayMs)` custom hook from scratch.**
> See chapter 02, Section 8 for the reference implementation (state + effect with `setTimeout` and cleanup via `clearTimeout`).

**G2. Fix this buggy counter that double-increments incorrectly in a batched handler:**
```jsx
function handleClick() {
  setCount(count + 1);
  setCount(count + 1);
}
```
> Replace with functional updater form: `setCount(c => c + 1)` twice, so each reads the latest pending value instead of the same stale closure value.

**G3. Given a list rendered with `key={index}`, and a bug report that editing text in one row after deleting an earlier row shows the wrong text - diagnose and fix.**
> Diagnosis: index-based keys cause React to reuse the DOM/state at each position rather than tracking identity, so deleting row 0 shifts row 1's data into position 0 while row 0's fiber/state (and any uncontrolled input value) stays attached to that position rather than following the data. Fix: use a stable unique `id` from the data as the key instead of the array index.

**G4. Build a `useFetch(url)` hook that avoids race conditions when `url` changes quickly.**
```jsx
function useFetch(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    fetch(url, { signal: controller.signal })
      .then(res => res.json())
      .then(setData)
      .catch(err => { if (err.name !== 'AbortError') setError(err); })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [url]);

  return { data, error, isLoading };
}
```
> Key point to say out loud: the cleanup function aborts the in-flight request when `url` changes again (or on unmount), preventing a slower, older request from resolving after a faster, newer one and overwriting fresh data with stale results.

**G5. Given a `React.memo`-wrapped `Row` component that still re-renders every time its parent state changes, find and fix the bug in this code:**
```jsx
function List({ items }) {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      {items.map(item => (
        <Row key={item.id} item={item} onSelect={(id) => console.log(id)} />
      ))}
    </>
  );
}
```
> Bug: `onSelect={(id) => console.log(id)}` creates a new function reference every render of `List`, defeating `Row`'s `memo`. Fix: wrap it in `useCallback` (with an empty dependency array if it doesn't close over anything that changes), or hoist it outside the component if it truly needs no closure at all.

**G6. Write a `createSlice` for a `cart` domain supporting `addItem`, `removeItem`, and `clearCart`, using Immer-style updates.**
```jsx
const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [] },
  reducers: {
    addItem(state, action) {
      state.items.push(action.payload);
    },
    removeItem(state, action) {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
    clearCart(state) {
      state.items = [];
    },
  },
});
```
> Key point: `state.items.push(...)` looks like a mutation but is safe because Immer intercepts writes to the draft proxy and produces a new immutable state object under the hood.

**G7. Implement a minimal accessible modal with focus trap and Escape-to-close (sketch, not full production code).**
> See chapter 05, Section 8 for the reference implementation pattern (store previously focused element, focus the dialog on open, restore focus on close, handle Escape key).

**G8. Given a component that fetches `user`, then a child fetches `profile` only after `user` resolves, then a grandchild fetches `posts` only after `profile` resolves - identify and fix the waterfall if none of the three actually depend on each other's data.**
> See chapter 04, Section 7 - lift all three `useQuery` calls to fire in parallel at a common point (since all only need `userId`, known immediately), instead of gating each one behind the previous one's render/mount.

---

## Section H - "Why did you..." / CV tie-back questions

These test whether you can defend real architectural choices, not just recite definitions.

**H1. Why does your stack use Redux, Zustand, AND React Query instead of just one?**
> See chapter 03 Section 6 model answer - separation of concerns: server state (React Query), global cross-cutting client state (Redux Toolkit), lightweight feature-scoped shared client state (Zustand). Using the right tool per problem reduces total code versus one tool handling everything adequately.

**H2. You've also worked in React Native - what carries over to web React, and what doesn't?**
> Carries over: component model, hooks, reconciliation/rendering mental model, state management patterns (Zustand/Redux/React Query work almost identically in both). Doesn't carry over: the DOM as host (vs native views), CSS/Flexbox nuances (web has full CSS + Grid; RN is Flexbox-only via Yoga with different defaults), browser-specific concerns (forms, accessibility via ARIA/semantic HTML, bundlers/code-splitting, SEO), and browser APIs vs native modules.

**H3. Describe a real performance problem you diagnosed and fixed.**
> Structure with: symptom -> profiling method used -> root cause found -> fix applied -> measured improvement (even approximate numbers are far more convincing than vague claims). Prepare 1-2 concrete examples from actual project experience before the interview, not improvised on the spot.

**H4. Describe a time you chose Zustand over Redux (or vice versa) for a feature - why?**
> Structure with: what kind of state it was, why it didn't warrant full Redux setup (or why it needed Redux's structure), and what the actual tradeoff/outcome was. Prepare a specific real example.

**H5. How do you keep server data fresh without over-fetching?**
> React Query's `staleTime` tuned per query based on how often that data realistically changes, background refetch on window focus/reconnect for data that should self-heal, and explicit `invalidateQueries` calls after mutations that are known to affect specific cached data - rather than blanket polling or refetching on every mount.

**H6. How do you approach accessibility in a Tailwind-heavy codebase, given utility classes don't enforce semantics?**
> Utility classes style elements but don't change their underlying semantics - so the discipline is choosing the right native element first (button, nav, label) regardless of how it's styled, then layering Tailwind utilities on top; accessibility and styling are orthogonal concerns that both need explicit attention.

---

## Final review checklist - are you ready?

- [ ] I can explain render phase vs commit phase and Fiber's role without hesitation.
- [ ] I can diagnose a stale closure bug in a `useEffect` live and propose 2 different fixes.
- [ ] I can defend the Redux + Zustand + React Query stack with a concrete example architecture.
- [ ] I can explain why `React.memo` "isn't working" by inspecting a code sample for unstable prop references.
- [ ] I can build an accessible form (controlled, validated, with proper ARIA wiring) from scratch.
- [ ] I know when to reach for Grid vs Flexbox and can sketch common layouts from memory.
- [ ] I have 2+ real, numbers-backed stories ready: one performance win, one architecture/state-management decision.
- [ ] I can complete the rapid-fire round (Section F) in under 5 minutes total with no more than 1-2 misses.
- [ ] I've done every hands-on drill in chapters 01-05 at least once.
- [ ] I can explain my React Native experience as a complement to, not a substitute for, deep web React fundamentals.
