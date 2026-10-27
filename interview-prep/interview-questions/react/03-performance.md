# React — 03 Performance (REACT-101 – REACT-150)

React 18+. Compact handbook: measure first, then fix the cause (too many renders, expensive renders, or too much work on commit).

---

### REACT-101 — What actually triggers a re-render?
**Difficulty:** Easy
**Category:** Rendering fundamentals
**Question:**
What causes a React component to re-render, and does a parent re-render always re-render its children?
**Answer:**
A component re-renders when its own state changes, its parent re-renders (new element objects are created), or a context it consumes changes. Props changing is not a trigger by itself; the parent rendering is. By default every child re-renders with its parent, even with identical props. `React.memo` opts a child out when props are shallow-equal. Re-render ≠ DOM update: React diffs and only commits changes.
**Follow-up:**
Does a re-render mean the DOM is touched?
Answer: No. Render is a pure computation producing elements; reconciliation compares them and commits only the differences.

---

### REACT-102 — State colocation
**Difficulty:** Easy
**Category:** State colocation
**Question:**
What is state colocation and why is it often the cheapest performance fix?
**Answer:**
Keep state as close as possible to the components that use it. State in a high ancestor re-renders the whole subtree on every change; state in a small leaf component re-renders only that leaf. Typing in an input should not re-render a page, so the input owns its value. It costs nothing, needs no memoization, and is easier to reason about than `memo` everywhere.
**Code:**
```jsx
function SearchBox() {            // state lives here, not in <Page>
  const [q, setQ] = useState("");
  return <input value={q} onChange={e => setQ(e.target.value)} />;
}
```
**Follow-up:**
When must you lift state up instead?
Answer: When two or more siblings need it. Lift only to the lowest common ancestor, not to the app root.

---

### REACT-103 — Moving state down vs. extracting a component
**Difficulty:** Medium
**Category:** State colocation
**Question:**
A page re-renders a heavy chart whenever a small dropdown toggles. How do you fix it without `memo`?
**Answer:**
Extract the part that owns the changing state into its own component so state sits beside the dropdown, not above the chart. The chart is then a sibling outside the state owner and is not re-rendered. This restructuring removes the cause rather than masking it.
**Code:**
```jsx
function Page() {
  return (<><Dropdown /><HeavyChart /></>); // Dropdown owns open state
}
```
**Follow-up:**
What if the state is needed by both parts?
Answer: Use the children-as-props pattern (REACT-104) or memoize the heavy part.

---

### REACT-104 — Children composition to skip renders
**Difficulty:** Medium
**Category:** Composition
**Question:**
How does passing `children` let a stateful wrapper avoid re-rendering the expensive content it wraps?
**Answer:**
Elements passed as `children` are created by the parent that renders the wrapper, not by the wrapper. When the wrapper's state changes, it re-renders but receives the same `children` element reference, and React bails out on identical element identity. So the wrapped subtree is skipped without `memo`.
**Code:**
```jsx
function Scroller({ children }) {
  const [y, setY] = useState(0);
  return <div onScroll={e => setY(e.currentTarget.scrollTop)}>{children}</div>;
}
<Scroller><ExpensiveTree /></Scroller>
```
**Follow-up:**
When does this stop working?
Answer: When the parent that created `children` itself re-renders, since it makes new elements.

---

### REACT-105 — Context provider wrapper using children
**Difficulty:** Medium
**Category:** Composition
**Question:**
Why does a provider component that holds state not re-render all of its consumers' siblings?
**Answer:**
A `ThemeProvider({children})` with `useState` re-renders when state changes, but `children` is the same element reference from above, so only components that actually read the context re-render. Placing the provider at the top with children is therefore cheap; putting state and the whole app JSX in the same component is not.
**Code:**
```jsx
function Provider({ children }) {
  const [v, setV] = useState(0);
  return <Ctx.Provider value={{ v, setV }}>{children}</Ctx.Provider>;
}
```
**Follow-up:**
Is the `value` object here a problem?
Answer: Yes, a new object each render notifies every consumer; memoize it or split it (REACT-111).

---

### REACT-106 — What does React.memo do?
**Difficulty:** Easy
**Category:** Memoization
**Question:**
What does `React.memo` do and what does it compare?
**Answer:**
It wraps a component so React skips re-rendering it when its props are shallow-equal (`Object.is` per prop) to the previous ones. It does not stop re-renders caused by the component's own state or context. It adds a comparison on every parent render, so it only pays off when the component is costly or re-renders often with unchanged props.
**Follow-up:**
Can you give a custom comparator?
Answer: Yes, `memo(C, areEqual)`, but a bad comparator causes stale UI and is itself a cost; prefer stable props.

---

### REACT-107 — The cost of memoization
**Difficulty:** Medium
**Category:** Memoization
**Question:**
Why isn't "wrap everything in memo/useMemo/useCallback" a good strategy?
**Answer:**
Each memo has costs: prop comparison on every render, memory to retain previous props/values, dependency-array bookkeeping, and code complexity. If the component is cheap or its props change almost every time, the check is pure overhead. Memoization also breaks silently when one prop (inline object/function) is unstable. Profile first, memoize hotspots, and prefer structural fixes (colocation, composition).
**Trade-offs:**
Fewer renders vs. extra comparisons, memory, and fragile dependency correctness.
**Follow-up:**
Where does memo clearly pay off?
Answer: Heavy subtrees (big lists, charts) under a frequently updating parent whose props are stable.

---

### REACT-108 — When is useMemo worth it?
**Difficulty:** Medium
**Category:** Memoization
**Question:**
When should you use `useMemo`?
**Answer:**
Three cases: caching a genuinely expensive calculation (measurably more than ~1 ms), keeping a referentially stable object/array that is a dependency of another hook or a prop to a memoized child, and avoiding repeated derivation over large data. Do not use it for cheap math or string concatenation. It is a performance hint, not a semantic guarantee: React may discard the cache.
**Code:**
```jsx
const visible = useMemo(() => filterAndSort(items, q), [items, q]);
```
**Follow-up:**
Can correctness depend on useMemo?
Answer: No. Code must work if the value is recomputed; treat it purely as an optimization.

---

### REACT-109 — What useCallback really does
**Difficulty:** Medium
**Category:** Memoization
**Question:**
Does `useCallback` make a function faster? What is it for?
**Answer:**
No. It only returns the same function reference between renders while dependencies are unchanged (`useMemo(() => fn, deps)`). The function is still created every render. It's useful when the function is a prop of a `memo` child, or a dependency of `useEffect`/`useMemo`. Without a memoized consumer it adds overhead and no benefit.
**Follow-up:**
Why can a stale closure happen?
Answer: If dependencies are incomplete the callback keeps old values; include all dependencies or use a functional state update.

---

### REACT-110 — Why memo "doesn't work"
**Difficulty:** Medium
**Category:** Memoization
**Question:**
A `memo`ized child still re-renders every time. List the common causes.
**Answer:**
Unstable props: inline objects/arrays/functions (`style={{}}`, `onClick={() => ...}`) are new each render and fail shallow equality. Also `children` as JSX is a new element each time, the child consumes a changing context, or it holds its own state/hook updates. Fix by stabilizing with `useMemo`/`useCallback`, hoisting constants outside the component, or removing the unstable prop.
**Follow-up:**
How do you diagnose which prop changed?
Answer: React DevTools Profiler "Why did this render?" or log prop identity changes with a usePrevious helper.

---

### REACT-111 — Context fan-out
**Difficulty:** Medium
**Category:** Context
**Question:**
Why can a single large context cause performance problems?
**Answer:**
Every component calling `useContext(Ctx)` re-renders whenever the provider's `value` changes (by `Object.is`), even if it reads only one field. `memo` does not block it. A context holding fast-changing data (mouse position, form values) fans out to all consumers. Also, a `value={{a, b}}` literal changes identity on every provider render, notifying everyone needlessly.
**Follow-up:**
Does context have built-in selectors?
Answer: No. Split contexts, use an external store with selectors, or `useSyncExternalStore`.

---

### REACT-112 — Splitting providers: state vs. dispatch
**Difficulty:** Medium
**Category:** Context
**Question:**
How do you split context to reduce unnecessary re-renders?
**Answer:**
Separate by change frequency and by read/write. Put the state in one context and the stable `dispatch`/setter in another, so components that only dispatch don't re-render on state changes. Split unrelated domains (auth, theme, cart) into different providers. Memoize `value` objects.
**Code:**
```jsx
<StateCtx.Provider value={state}>
  <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
</StateCtx.Provider>
```
**Follow-up:**
Why is dispatch from useReducer safe to put in its own context?
Answer: Its identity is guaranteed stable, so that context never changes.

---

### REACT-113 — Memoizing the provider value
**Difficulty:** Easy
**Category:** Context
**Question:**
How do you avoid notifying consumers when the provider re-renders for unrelated reasons?
**Answer:**
Wrap the value in `useMemo` keyed on its real inputs, and keep setters stable. If the provider re-renders because its parent did, an inline `{...}` value would still trigger every consumer. Better still, make the provider take `children` so it rarely re-renders from above.
**Code:**
```jsx
const value = useMemo(() => ({ user, logout }), [user, logout]);
```
**Follow-up:**
Does this help if `user` changes often?
Answer: No; then split the volatile part into a separate context or store.

---

### REACT-114 — Context vs. external store with selectors
**Difficulty:** Hard
**Category:** Context
**Question:**
When should you replace context with an external store (Zustand, Redux, Jotai)?
**Answer:**
When state is large or updates frequently and many consumers need different slices. Stores let a component subscribe to a selected slice and re-render only if that slice changes, which context cannot do. Context fits low-frequency, app-wide values (theme, locale, auth). Selector-based stores are built on `useSyncExternalStore`, so they are concurrent-safe.
**Trade-offs:**
Selectors give precision but add a dependency and a different mental model.
**Follow-up:**
What breaks if a selector returns a new object each time?
Answer: It re-renders on every store update because identity differs; use shallow equality or select primitives.

---

### REACT-115 — List virtualization
**Difficulty:** Medium
**Category:** Lists
**Question:**
What is list virtualization and when do you need it?
**Answer:**
Rendering only the rows visible in the viewport (plus overscan) instead of thousands of DOM nodes. It keeps DOM size, memory, layout, and render cost roughly constant. Use it for lists of hundreds to thousands of rows (tables, feeds, logs). Libraries: `react-window`, `react-virtuoso`, TanStack Virtual. Smaller lists are often fine with pagination or `content-visibility: auto`.
**Follow-up:**
How is the scrollbar kept accurate?
Answer: A spacer element has the total height (or estimated height) and visible rows are absolutely positioned/translated.

---

### REACT-116 — Virtualization trade-offs
**Difficulty:** Hard
**Category:** Lists
**Question:**
What are the downsides of virtualizing a list?
**Answer:**
Variable row heights need measurement or estimation and cause scroll jumps. Browser find-in-page, accessibility (screen readers see only mounted rows), anchor links, and printing break or need extra work. Fast scrolling can show blank flashes. Focus and state in unmounted rows are lost unless lifted. Add `aria-rowcount`/`aria-setsize` and keep row state outside the row.
**Trade-offs:**
Big render and memory wins vs. complexity and accessibility cost.
**Follow-up:**
Alternatives for moderate lists?
Answer: Pagination, "load more", or CSS `content-visibility: auto` with `contain-intrinsic-size`.

---

### REACT-117 — Keys and list performance
**Difficulty:** Medium
**Category:** Lists
**Question:**
How do keys affect performance and correctness?
**Answer:**
Stable, unique keys let reconciliation match items across renders, so reorders move DOM nodes and preserve state instead of re-creating them. Index keys on a list that reorders, inserts, or deletes cause wrong state reuse and extra DOM work. Random keys (`Math.random()`) remount every row each render, which is very expensive.
**Follow-up:**
When are index keys acceptable?
Answer: For static lists that never reorder or filter and have no per-item state.

---

### REACT-118 — React DevTools Profiler
**Difficulty:** Easy
**Category:** Profiling
**Question:**
How do you use the React DevTools Profiler to find slow renders?
**Answer:**
Record an interaction, then inspect the flamegraph/ranked chart for components with long render times and the commit list for slow commits. Enable "Record why each component rendered" to see changed props/state/hooks. Profile a production build (or profiling build) since development mode and StrictMode inflate times. Focus on the interactions users actually feel.
**Follow-up:**
What does "did not render" (gray) mean?
Answer: React skipped that component in the commit, which is the outcome you want from memoization.

---

### REACT-119 — The `<Profiler>` component
**Difficulty:** Medium
**Category:** Profiling
**Question:**
What is the `<Profiler>` API and what does its callback give you?
**Answer:**
`<Profiler id onRender>` measures the render cost of the wrapped subtree programmatically. `onRender` receives the id, phase (`mount`/`update`/`nested-update`), `actualDuration` (time spent rendering this commit), `baseDuration` (estimated full re-render cost without memoization), and start/commit times. It's disabled in production unless using a profiling build, and has small overhead.
**Follow-up:**
How do actualDuration and baseDuration help?
Answer: If actual ≪ base, memoization is working; if they're close, little is being skipped.

---

### REACT-120 — Measure before optimizing
**Difficulty:** Easy
**Category:** Profiling
**Question:**
Describe your approach to a "the app feels slow" report.
**Answer:**
Reproduce it, then classify: slow render (CPU), too many renders, big commit/layout, network, or bundle. Use the browser Performance panel for long tasks and INP, React Profiler for component cost. Fix the biggest, cheapest cause first (colocation, virtualization, splitting code), re-measure, and keep a regression check. Avoid blanket memoization.
**Follow-up:**
Which metric reflects interaction slowness?
Answer: INP (Interaction to Next Paint); long tasks over 50 ms on the main thread are the usual culprit.

---

### REACT-121 — startTransition
**Difficulty:** Medium
**Category:** Concurrent rendering
**Question:**
What does `startTransition` do and what problem does it solve?
**Answer:**
It marks state updates as non-urgent. React renders them in the background at lower priority and can interrupt them if an urgent update (typing, click) arrives, keeping the UI responsive. The old UI stays visible until the transition is ready. It does not make work faster; it makes it interruptible and prioritized. `useTransition` also exposes `isPending`.
**Code:**
```jsx
const [isPending, startTransition] = useTransition();
onChange={e => {
  setInput(e.target.value);                       // urgent
  startTransition(() => setQuery(e.target.value)); // deferred
}}
```
**Follow-up:**
Can you use it for controlled input value itself?
Answer: No; the input value must be an urgent update or typing will lag.

---

### REACT-122 — useDeferredValue
**Difficulty:** Medium
**Category:** Concurrent rendering
**Question:**
What does `useDeferredValue` do and when do you prefer it over `startTransition`?
**Answer:**
It returns a value that lags behind the latest one: React first renders with the old value, then re-renders in the background with the new one, interruptibly. Use it when you receive a value as a prop or can't wrap the setter. Combine with `memo` on the expensive consumer so the urgent render stays cheap. Compare `value !== deferred` for a stale indicator.
**Code:**
```jsx
const deferred = useDeferredValue(query);
<SlowList query={deferred} />  // SlowList is memo()
```
**Follow-up:**
Why does it need memo on the child?
Answer: Otherwise the urgent render with the old value still re-renders the slow child.

---

### REACT-123 — Transition vs. debounce
**Difficulty:** Medium
**Category:** Concurrent rendering
**Question:**
How do transitions/deferred values differ from debouncing?
**Answer:**
Debounce adds a fixed delay and still does the heavy render on the main thread, blocking when it finally runs. Transitions begin immediately, adapt to device speed, and yield to input, so fast devices update quickly and slow ones stay responsive. Debounce remains right for reducing network requests or expensive side effects; transitions are for render work.
**Follow-up:**
Do they combine?
Answer: Yes: debounce the fetch, defer the render of the resulting list.

---

### REACT-124 — Transitions and Suspense
**Difficulty:** Hard
**Category:** Concurrent rendering
**Question:**
How do transitions interact with Suspense boundaries?
**Answer:**
If a transition update suspends, React keeps showing the already-visible UI instead of replacing it with the fallback, and `isPending` is true. Without a transition, an urgent update that suspends shows the fallback. This avoids jarring spinners on navigation or tab switches. Only boundaries newly revealed in the transition may show fallbacks; already-revealed content stays.
**Follow-up:**
Can a transition be interrupted by a new one?
Answer: Yes; the newer transition supersedes the older pending one.

---

### REACT-125 — React.lazy and code splitting
**Difficulty:** Easy
**Category:** Code splitting
**Question:**
How do `React.lazy` and `Suspense` reduce initial load?
**Answer:**
`lazy(() => import("./Heavy"))` splits a component into a separate chunk loaded on first render. Wrap it in `<Suspense fallback>` to show a placeholder while loading. Split at route level and for heavy, rarely seen widgets (editors, charts, modals). Initial JS shrinks, improving load and parse time.
**Code:**
```jsx
const Chart = lazy(() => import("./Chart"));
<Suspense fallback={<Spinner />}><Chart /></Suspense>
```
**Follow-up:**
Does lazy support named exports?
Answer: Not directly; the module must have a default export, or re-export it as default in a wrapper.

---

### REACT-126 — Suspense waterfalls
**Difficulty:** Hard
**Category:** Code splitting
**Question:**
What is a Suspense/data waterfall and how do you avoid it?
**Answer:**
A waterfall happens when requests are chained: parent loads its chunk, then renders and starts a child's chunk or fetch, and so on. Total time is the sum. Avoid it by starting fetches/imports early (route-level loaders, preload on hover), fetching in parallel, hoisting data requirements, and using a framework with server components/streaming. Sibling suspending components in one boundary resolve together.
**Follow-up:**
Does render-as-you-fetch fix it?
Answer: Yes: kick off the request before rendering and let components read the already-started promise.

---

### REACT-127 — Preloading lazy components
**Difficulty:** Medium
**Category:** Code splitting
**Question:**
How can you hide the latency of a lazily loaded chunk?
**Answer:**
Trigger the dynamic `import()` before it's needed: on hover/focus of a link, on idle after initial load, or when a route is likely next. The module is cached, so a later `lazy` resolves instantly. Use `<link rel="modulepreload">` or bundler hints (`webpackPrefetch`). Balance against bandwidth waste on mobile.
**Code:**
```jsx
const load = () => import("./Settings");
const Settings = lazy(load);
<a onMouseEnter={load} href="/settings">Settings</a>
```
**Follow-up:**
Risk of preloading everything?
Answer: You lose the bundle savings and spend data; preload only high-probability targets.

---

### REACT-128 — Where to put Suspense boundaries
**Difficulty:** Medium
**Category:** Code splitting
**Question:**
How granular should Suspense boundaries be?
**Answer:**
Place them around independent UI regions so a slow part doesn't block the rest, but not so many that a screen shows many spinners popping in. A common layout: a boundary per route plus boundaries around slow widgets. Nested boundaries enable progressive reveal and, with streaming SSR, let the shell render first. Stable fallbacks that match layout dimensions reduce layout shift.
**Follow-up:**
What goes wrong with one global boundary?
Answer: Any suspension replaces the whole page with a fallback, hurting perceived performance.

---

### REACT-129 — Layout thrashing
**Difficulty:** Hard
**Category:** Layout & effects
**Question:**
What is layout thrashing and how can it occur in React code?
**Answer:**
Interleaving DOM reads that force layout (`offsetHeight`, `getBoundingClientRect`) with DOM writes (style changes) makes the browser recompute layout repeatedly (forced synchronous layout). In React it appears in effects or loops measuring many elements and setting styles/state per element. Batch: read all measurements first, then write once; use `ResizeObserver`/`IntersectionObserver` or CSS instead of polling.
**Code:**
```js
const rects = nodes.map(n => n.getBoundingClientRect()); // all reads
nodes.forEach((n, i) => (n.style.top = rects[i].y + "px")); // then writes
```
**Follow-up:**
How to spot it?
Answer: The Performance panel shows purple "Layout" blocks with "Forced reflow" warnings.

---

### REACT-130 — useLayoutEffect vs. useEffect
**Difficulty:** Medium
**Category:** Layout & effects
**Question:**
When do you use `useLayoutEffect` instead of `useEffect`?
**Answer:**
`useLayoutEffect` runs synchronously after DOM mutations but before paint, so you can measure the DOM and update state without a visible flicker (tooltips, popover positioning). `useEffect` runs after paint, which is better for most side effects. Layout effects block painting, so keep them short and avoid heavy work; overuse hurts responsiveness.
**Trade-offs:**
No flash of wrong layout vs. delayed first paint.
**Follow-up:**
Does a state update in useLayoutEffect cause two paints?
Answer: No; React re-renders synchronously before the browser paints, so users see only the final result.

---

### REACT-131 — useLayoutEffect on the server
**Difficulty:** Medium
**Category:** Layout & effects
**Question:**
Why does `useLayoutEffect` warn during SSR and what do you do?
**Answer:**
Effects don't run on the server, and layout effects can't affect server HTML, so React warned that the UI may differ before hydration (the warning was removed in React 19, but the concern stays). Options: render a fallback on the server and measure after mount, use `useEffect` when flicker is tolerable, or an isomorphic hook choosing by `typeof window`. Prefer CSS-driven layouts to avoid measuring at all.
**Follow-up:**
How do you avoid hydration mismatch with measurements?
Answer: Render the same initial markup on server and client, then measure and update after hydration.

---

### REACT-132 — Web Workers for heavy compute
**Difficulty:** Medium
**Category:** Off-main-thread
**Question:**
How do you keep heavy computation from freezing the React UI?
**Answer:**
React renders on the main thread, and transitions cannot split a single long synchronous function. Move CPU-heavy work (parsing, search indexing, image processing, crypto) into a Web Worker, post inputs, and set state when the result returns. The main thread stays free for input and painting. Use libraries like Comlink to get promise-based calls.
**Code:**
```js
const worker = new Worker(new URL("./w.js", import.meta.url), { type: "module" });
worker.postMessage(data);
worker.onmessage = e => setResult(e.data);
```
**Follow-up:**
Can the worker touch the DOM?
Answer: No; it has no DOM access, only messaging with the main thread.

---

### REACT-133 — Worker communication costs
**Difficulty:** Hard
**Category:** Off-main-thread
**Question:**
What overhead should you consider when using workers?
**Answer:**
`postMessage` uses structured clone, which copies data and can cost more than the computation for large payloads. Use transferables (`ArrayBuffer`, `OffscreenCanvas`) to move without copying, or `SharedArrayBuffer` (needs cross-origin isolation). Also account for worker startup time, cancellation/stale results, and bundling. Workers pay off for tasks above tens of ms, not trivial ones.
**Follow-up:**
How do you handle out-of-order results?
Answer: Tag requests with an id and ignore responses that aren't the latest.

---

### REACT-134 — useSyncExternalStore
**Difficulty:** Hard
**Category:** External state
**Question:**
What is `useSyncExternalStore` and why does it exist?
**Answer:**
A hook to subscribe to non-React state (stores, `window.matchMedia`, `navigator.onLine`). You pass `subscribe`, `getSnapshot`, and optionally `getServerSnapshot`. It guarantees consistent reads during concurrent rendering, avoiding tearing, and forces synchronous updates for store changes. State libraries (Redux, Zustand) use it internally. `getSnapshot` must return a cached, referentially stable value when unchanged.
**Code:**
```jsx
const online = useSyncExternalStore(
  cb => { addEventListener("online", cb); addEventListener("offline", cb);
          return () => { removeEventListener("online", cb); removeEventListener("offline", cb); }; },
  () => navigator.onLine,
  () => true
);
```
**Follow-up:**
What happens if getSnapshot returns a new object each call?
Answer: It loops infinitely or re-renders constantly, because React sees a changed snapshot every time.

---

### REACT-135 — Tearing
**Difficulty:** Hard
**Category:** External state
**Question:**
What is tearing and why does concurrent rendering make it possible?
**Answer:**
Tearing is when different components in one render pass show different values of the same external state, because rendering was paused and the store changed mid-way. With sync rendering this can't happen; with interruptible rendering it can. `useSyncExternalStore` detects changes during render and re-renders synchronously so the UI is consistent. React's own state is tear-free by design.
**Follow-up:**
Does this affect `useState`?
Answer: No, only mutable stores read outside React state.

---

### REACT-136 — Selecting slices with useSyncExternalStore
**Difficulty:** Hard
**Category:** External state
**Question:**
How do you avoid re-rendering on every store change?
**Answer:**
Make `getSnapshot` return only the relevant slice (a primitive or a stable reference), so React compares with `Object.is` and skips unchanged components. For derived objects, memoize the selector output or use `useSyncExternalStoreWithSelector` with an equality function. Avoid subscribing to the entire state object when you need one field.
**Follow-up:**
Why select primitives where possible?
Answer: They compare by value under `Object.is`, so no re-render unless the value actually changes.

---

### REACT-137 — Impure render costs
**Difficulty:** Medium
**Category:** Render purity
**Question:**
Why is doing side effects or mutations in render a performance (and correctness) problem?
**Answer:**
Render may run multiple times, be paused, or be discarded (StrictMode double-invokes, concurrent features). Mutating variables, reading `Date.now()`/`Math.random()`, or fetching in render yields inconsistent output, breaks memoization (new values each time), and causes extra re-render loops. Keep render a pure function of props/state/context; put effects in handlers or `useEffect`.
**Follow-up:**
Is a local mutation OK?
Answer: Yes: mutating objects created during that same render (local variables) is safe.

---

### REACT-138 — StrictMode double render
**Difficulty:** Easy
**Category:** Render purity
**Question:**
Why does StrictMode render twice in development, and is it a performance bug?
**Answer:**
React double-invokes component bodies, state initializers, and reducers (and mounts/unmounts effects once) to expose impurities and missing cleanups. It is development-only, has no production cost, and the second render's logs are dimmed. Don't "fix" slowness measured in dev with StrictMode on; measure a production build.
**Follow-up:**
Name a bug it reveals.
Answer: An effect without cleanup (subscription or timer) leaks after the simulated remount.

---

### REACT-139 — Expensive work in render and lazy init
**Difficulty:** Easy
**Category:** Render purity
**Question:**
How do you avoid re-running an expensive initializer on every render?
**Answer:**
`useState(compute())` calls `compute()` every render (result ignored after the first). Pass a function instead: `useState(() => compute())` runs once. The same applies to `useRef`, where you should initialize conditionally. For derived values use `useMemo`; for values needed only on events compute them in the handler.
**Code:**
```jsx
const [data] = useState(() => parseHuge(raw)); // lazy init, runs once
```
**Follow-up:**
Does `useMemo` guarantee a single run?
Answer: No; React may recompute, so it is a hint, not a guarantee.

---

### REACT-140 — Inline objects, arrays, and functions
**Difficulty:** Easy
**Category:** Memoization
**Question:**
Are inline `{}`/`() => {}` in JSX always bad?
**Answer:**
No. Creating them is cheap. They only matter when passed to a memoized component or used as a hook dependency, where changed identity defeats the optimization. For plain DOM elements and non-memoized children it makes no difference. Hoist constants outside the component and stabilize only where identity matters.
**Follow-up:**
How do you remove a function dependency without useCallback?
Answer: Define the function inside the effect, or use the latest-ref/`useEffectEvent`-style pattern.

---

### REACT-141 — Derived state vs. effects
**Difficulty:** Medium
**Category:** Render purity
**Question:**
Why is syncing derived state through `useEffect` + `setState` slow?
**Answer:**
The component renders with stale data, commits, runs the effect, sets state, and renders again: two passes and a possible flash of wrong UI. Compute derived values during render (optionally with `useMemo`) instead. For resetting state when a prop changes, use a `key` or store the previous value and adjust during render.
**Code:**
```jsx
const fullName = first + " " + last; // not useEffect + setState
```
**Follow-up:**
How can a key reset state?
Answer: Changing `key` unmounts and remounts the component with fresh state.

---

### REACT-142 — Automatic batching
**Difficulty:** Medium
**Category:** Rendering fundamentals
**Question:**
What changed with batching in React 18?
**Answer:**
Updates are batched automatically everywhere (event handlers, promises, `setTimeout`, native handlers) when using `createRoot`, so multiple `setState` calls in one tick produce one re-render. React 17 only batched inside React event handlers. This reduces renders without code changes. Reading state after setting still returns the old value in that closure.
**Follow-up:**
How do you opt out?
Answer: Wrap the update in `flushSync` to force an immediate synchronous render.

---

### REACT-143 — flushSync
**Difficulty:** Hard
**Category:** Rendering fundamentals
**Question:**
When is `flushSync` appropriate and what is its cost?
**Answer:**
It forces React to apply updates and flush the DOM synchronously, useful when you must read the updated DOM immediately (scroll to a newly added item, focus). It bypasses batching and concurrency, can hurt performance, and warns if called during render or lifecycle. Use sparingly and prefer `useLayoutEffect` or refs with effects.
**Code:**
```jsx
flushSync(() => setItems(next));
listRef.current.lastElementChild.scrollIntoView();
```
**Follow-up:**
Alternative that avoids it?
Answer: A layout effect keyed on the list that scrolls after the DOM commit.

---

### REACT-144 — Fast typing in large forms
**Difficulty:** Medium
**Category:** State colocation
**Question:**
A form with 200 fields lags on each keystroke. What are your options?
**Answer:**
Controlled inputs with state in the parent re-render the whole form per key. Options: colocate state per field/section, use uncontrolled inputs with refs or `FormData` and read on submit, use a library with subscription-based fields (React Hook Form), memoize field components, or defer expensive validation with `useDeferredValue`. Keep validation off the keystroke hot path when costly.
**Follow-up:**
Trade-off of uncontrolled inputs?
Answer: Less live control (formatting, instant validation) but much cheaper renders.

---

### REACT-145 — Bundle size and tree shaking
**Difficulty:** Medium
**Category:** Code splitting
**Question:**
How do you keep a React bundle small?
**Answer:**
Analyze with a bundle visualizer, split routes with `lazy`, import specific modules (`lodash-es`, named imports with ESM tree-shaking) instead of whole libraries, replace heavy deps (moment → date-fns/Temporal), defer third-party scripts, compress (gzip/brotli), and avoid shipping server-only logic by using Server Components where available. Track budgets in CI.
**Follow-up:**
Why can tree shaking fail?
Answer: CommonJS modules, side-effectful imports, or barrel files without `sideEffects: false` make code unremovable.

---

### REACT-146 — React Compiler
**Difficulty:** Medium
**Category:** React Compiler
**Question:**
What is React Compiler and how does it change memoization practice?
**Answer:**
A build-time tool that analyzes components and hooks and automatically inserts memoization (like `useMemo`/`useCallback`/`memo`) at fine granularity, including after early returns and conditionals which hooks can't do. It removes most manual memoization. It assumes the Rules of React (pure render, no mutation of props/state). Existing manual memos can stay, and `useMemo` remains useful as an escape hatch for effect dependency control.
**Follow-up:**
What does it not fix?
Answer: Architectural issues: too much state at the top, huge lists without virtualization, or expensive computation.

---

### REACT-147 — Compiler constraints and adoption
**Difficulty:** Hard
**Category:** React Compiler
**Question:**
How do you adopt React Compiler safely?
**Answer:**
Install the ESLint rules/`eslint-plugin-react-compiler` and fix Rules of React violations; the compiler skips components it can't prove safe (bailouts). Roll out incrementally using `compilationMode: "annotation"` and `"use memo"` directives, or by directory, and compare Profiler results and tests. Use `"use no memo"` to opt out. Don't remove manual memoization blindly in existing code.
**Follow-up:**
Which patterns cause bailouts?
Answer: Mutating props/state, reading refs during render, or other impure patterns it can't analyze.

---

### REACT-148 — Server Components and performance
**Difficulty:** Medium
**Category:** Rendering architecture
**Question:**
How do React Server Components help performance?
**Answer:**
Server Components run only on the server, so their code and heavy dependencies (markdown parsers, DB clients) never ship to the client, shrinking the bundle and hydration cost. They can fetch data close to the source, avoiding client waterfalls, and stream via Suspense. Interactive parts remain Client Components. The cost is server load and a stricter component boundary model.
**Follow-up:**
Can a Server Component hold state?
Answer: No; hooks like `useState`/`useEffect` require a Client Component.

---

### REACT-149 — Streaming SSR and selective hydration
**Difficulty:** Hard
**Category:** Rendering architecture
**Question:**
What does React 18 streaming SSR with selective hydration improve?
**Answer:**
`renderToPipeableStream`/`renderToReadableStream` send the HTML shell immediately and stream Suspense-wrapped sections as data arrives, improving TTFB and first paint. Hydration is per Suspense boundary and non-blocking: React hydrates boundaries in priority order and prioritizes the one the user interacts with. Slow components no longer block the page from becoming interactive.
**Follow-up:**
What breaks it?
Answer: A single top-level boundary or non-streaming data fetching that forces the whole page to wait.

---

### REACT-150 — Resetting and unmounting costs: key and conditional rendering
**Difficulty:** Medium
**Category:** Rendering fundamentals
**Question:**
Should you hide heavy components with CSS or unmount them conditionally?
**Answer:**
Unmounting frees memory and effects but loses state and pays full mount cost when shown again. Hiding with CSS (`display: none`) keeps state and mounts once but still runs renders/effects and holds DOM. Choose by toggle frequency and cost: frequent toggles of expensive trees may favor hiding; rarely shown content should be unmounted. React's `<Activity>` (experimental/19.x) hides while deprioritizing and preserving state.
**Trade-offs:**
Mount cost and lost state vs. memory and background work.
**Follow-up:**
Does `display: none` stop re-renders?
Answer: No; React still renders it when state/props change, so it only avoids layout and paint.
