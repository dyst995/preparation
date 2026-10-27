# React — 03 Performance (REACT-101 – REACT-150)

React 18+. Compact handbook: measure first, then fix the cause (too many renders, expensive renders, or too much work on commit).

---

### REACT-101 — What actually triggers a re-render?

**Difficulty:** Easy

**Category:** Rendering fundamentals

**Question:**

What causes a React component to re-render, and does a parent re-render always re-render its children?

**Answer:**

A component re-renders for three reasons: its own state changes, its parent re-renders, or a context it reads changes. Changing props is not a separate trigger. Props change because the parent rendered.

By default, when a parent renders, all of its children render too, even if their props are identical. `React.memo` lets a child skip that when its props are shallow-equal.

A re-render does not mean the DOM is updated. React compares the new output with the old and commits only the differences.

**Follow-up:**

Does a re-render mean the DOM is touched?

Answer: No. Rendering is just computing a new description of the UI. React compares it with the previous one and updates the DOM only where something differs.

---

### REACT-102 — State colocation

**Difficulty:** Easy

**Category:** State colocation

**Question:**

What is state colocation and why is it often the cheapest performance fix?

**Answer:**

State colocation means keeping state as close as possible to the components that use it.

When state lives in a high-level parent, every change re-renders that whole subtree. When it lives in a small component, only that component re-renders. For example, an input should own its own value, so typing does not re-render the whole page.

It costs nothing, needs no memoization, and is easier to understand than adding `memo` everywhere. That is why it is often the first fix to try.

**Code:**

```jsx
function SearchBox() {            // state lives here, not in <Page>
  const [q, setQ] = useState("");
  return <input value={q} onChange={e => setQ(e.target.value)} />;
}
```

**Follow-up:**

When must you lift state up instead?

Answer: When two or more siblings need the same state. Lift it only to their lowest common parent, not all the way to the app root.

---

### REACT-103 — Moving state down vs. extracting a component

**Difficulty:** Medium

**Category:** State colocation

**Question:**

A page re-renders a heavy chart whenever a small dropdown toggles. How do you fix it without `memo`?

**Answer:**

Move the dropdown and its state into its own component. Then the state sits next to the dropdown instead of above the chart.

When the dropdown toggles, only the dropdown component re-renders. The chart is now a sibling outside the component that owns the state, so React does not touch it.

This removes the cause of the extra renders instead of hiding it. It is simpler and more reliable than wrapping the chart in `memo`.

**Code:**

```jsx
function Page() {
  return (<><Dropdown /><HeavyChart /></>); // Dropdown owns open state
}
```

**Follow-up:**

What if the state is needed by both parts?

Answer: Use the children-as-props pattern (REACT-104), or memoize the heavy part.

---

### REACT-104 — Children composition to skip renders

**Difficulty:** Medium

**Category:** Composition

**Question:**

How does passing `children` let a stateful wrapper avoid re-rendering the expensive content it wraps?

**Answer:**

Elements passed as `children` are created by the component that renders the wrapper, not by the wrapper itself.

When the wrapper's own state changes, it re-renders, but it receives the same `children` element object as before. React sees that the element has not changed and skips rendering it.

So the expensive content under `children` is not re-rendered, and you don't need `memo`. This works because the wrapper's state change does not re-run the parent that created the children.

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

Answer: When the parent that created `children` re-renders, because it creates new elements.

---

### REACT-105 — Context provider wrapper using children

**Difficulty:** Medium

**Category:** Composition

**Question:**

Why does a provider component that holds state not re-render all of its consumers' siblings?

**Answer:**

Take a `ThemeProvider({ children })` that holds state. When that state changes, the provider re-renders, but `children` is the same element that was passed in from above, so React skips it.

Only the components that actually read the context re-render.

That makes it cheap to put a stateful provider at the top of the app. It is expensive only when the state and the whole app's JSX are written in the same component, because then every state change re-creates all the elements.

**Code:**

```jsx
function Provider({ children }) {
  const [v, setV] = useState(0);
  return <Ctx.Provider value={{ v, setV }}>{children}</Ctx.Provider>;
}
```

**Follow-up:**

Is the `value` object here a problem?

Answer: Yes. A new object on every render notifies every consumer. Memoize it or split it (REACT-111).

---

### REACT-106 — What does React.memo do?

**Difficulty:** Easy

**Category:** Memoization

**Question:**

What does `React.memo` do and what does it compare?

**Answer:**

`React.memo` wraps a component so React can skip re-rendering it when its props have not changed. It compares each prop with the previous one using a shallow check, `Object.is` for every prop.

It does not stop re-renders caused by the component's own state or by a context it reads.

The comparison itself costs a little on every parent render, so `memo` only helps when the component is expensive to render, or re-renders often with the same props.

**Follow-up:**

Can you give a custom comparator?

Answer: Yes, `memo(C, areEqual)`. But a wrong comparator causes stale UI and has its own cost, so stable props are usually better.

---

### REACT-107 — The cost of memoization

**Difficulty:** Medium

**Category:** Memoization

**Question:**

Why isn't "wrap everything in memo/useMemo/useCallback" a good strategy?

**Answer:**

Memoization is not free. React must compare props on every render, keep the previous values in memory, and track dependency arrays. It also makes the code harder to read.

If a component is cheap, or its props change almost every time, the check is wasted work.

It can also fail without any warning. One unstable prop, like an inline object or function, breaks the whole thing.

So profile first and memoize real hotspots. Prefer structural fixes like colocating state and using composition.

**Trade-offs:**

Fewer renders vs. extra comparisons, memory, and fragile dependency correctness.

**Follow-up:**

Where does memo clearly pay off?

Answer: For heavy subtrees, such as big lists or charts, under a parent that updates often while the subtree's props stay stable.

---

### REACT-108 — When is useMemo worth it?

**Difficulty:** Medium

**Category:** Memoization

**Question:**

When should you use `useMemo`?

**Answer:**

`useMemo` is worth it in three cases. First, when a calculation is genuinely expensive, meaning you measured it at more than about a millisecond. Second, when you need a stable object or array reference, because it is a dependency of another hook or a prop to a memoized child. Third, when you repeatedly derive something from large data.

Don't use it for cheap math or string joining.

Treat it as a performance hint, not a guarantee. React may discard the cache, so your code must still work if the value is recomputed.

**Code:**

```jsx
const visible = useMemo(() => filterAndSort(items, q), [items, q]);
```

**Follow-up:**

Can correctness depend on useMemo?

Answer: No. The code must still be correct if the value is recomputed. Use it only as an optimization.

---

### REACT-109 — What useCallback really does

**Difficulty:** Medium

**Category:** Memoization

**Question:**

Does `useCallback` make a function faster? What is it for?

**Answer:**

No, it doesn't make the function faster. The function is still created on every render. `useCallback` only gives you back the same function reference between renders while the dependencies stay the same. It is the same as `useMemo(() => fn, deps)`.

That stable reference matters when the function is passed as a prop to a `memo` child, or used as a dependency of `useEffect` or `useMemo`.

If nothing depends on the function's identity, it only adds overhead.

**Follow-up:**

Why can a stale closure happen?

Answer: If the dependencies are incomplete, the callback keeps using old values. List all dependencies, or use a functional state update.

---

### REACT-110 — Why memo "doesn't work"

**Difficulty:** Medium

**Category:** Memoization

**Question:**

A `memo`ized child still re-renders every time. List the common causes.

**Answer:**

The most common cause is an unstable prop. Inline objects, arrays, and functions like `style={{}}` or `onClick={() => ...}` are new on every render, so the shallow comparison always fails.

Passing JSX as `children` has the same problem, because it creates a new element each time.

Two other causes: the child reads a context that keeps changing, or it has its own state or hooks that update.

To fix it, stabilize the props with `useMemo` or `useCallback`, move constants outside the component, or remove the unstable prop.

**Follow-up:**

How do you diagnose which prop changed?

Answer: Use the React DevTools Profiler and its "Why did this render?" info, or log prop changes with a `usePrevious` helper.

---

### REACT-111 — Context fan-out

**Difficulty:** Medium

**Category:** Context

**Question:**

Why can a single large context cause performance problems?

**Answer:**

Every component that calls `useContext(Ctx)` re-renders whenever the provider's `value` changes, even if it only uses one field of it. `memo` cannot stop this.

If the context holds fast-changing data, like mouse position or form values, every consumer re-renders on each change. This spreading of updates is called fan-out.

A `value={{ a, b }}` object literal also creates a new object on every provider render, so consumers are notified even when nothing changed.

**Follow-up:**

Does context have built-in selectors?

Answer: No. Split the context into several, use an external store with selectors, or use `useSyncExternalStore`.

---

### REACT-112 — Splitting providers: state vs. dispatch

**Difficulty:** Medium

**Category:** Context

**Question:**

How do you split context to reduce unnecessary re-renders?

**Answer:**

Split by how often values change and by whether they are read or written.

Put the state in one context and the stable `dispatch` or setter in another. Components that only dispatch actions then don't re-render when the state changes.

Also separate unrelated areas, like auth, theme, and cart, into their own providers, so a change in one does not wake consumers of the others.

Memoize any object you pass as `value`.

**Code:**

```jsx
<StateCtx.Provider value={state}>
  <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
</StateCtx.Provider>
```

**Follow-up:**

Why is dispatch from useReducer safe to put in its own context?

Answer: React guarantees its identity never changes, so that context's value never changes.

---

### REACT-113 — Memoizing the provider value

**Difficulty:** Easy

**Category:** Context

**Question:**

How do you avoid notifying consumers when the provider re-renders for unrelated reasons?

**Answer:**

Wrap the context value in `useMemo`, using only its real inputs as dependencies, and keep any setters stable.

Without this, an inline `{ ... }` value is a new object every time the provider re-renders, for example because its parent did. That notifies every consumer even though nothing meaningful changed.

An even better approach is to have the provider accept `children`, so it rarely re-renders from above in the first place.

**Code:**

```jsx
const value = useMemo(() => ({ user, logout }), [user, logout]);
```

**Follow-up:**

Does this help if `user` changes often?

Answer: No. In that case, move the frequently changing part into a separate context or store.

---

### REACT-114 — Context vs. external store with selectors

**Difficulty:** Hard

**Category:** Context

**Question:**

When should you replace context with an external store (Zustand, Redux, Jotai)?

**Answer:**

Switch when the state is large or changes often, and many components need different pieces of it.

A store lets each component subscribe to a selected slice, and re-render only when that slice changes. Context can't do that, because every consumer updates when the value changes.

Context is still a good fit for values that change rarely and are needed across the app, like theme, locale, or the signed-in user.

These stores are built on `useSyncExternalStore`, so they work safely with concurrent rendering.

**Trade-offs:**

Selectors give precision but add a dependency and a different mental model.

**Follow-up:**

What breaks if a selector returns a new object each time?

Answer: The component re-renders on every store update, because the new object always looks different. Use shallow equality, or select primitive values.

---

### REACT-115 — List virtualization

**Difficulty:** Medium

**Category:** Lists

**Question:**

What is list virtualization and when do you need it?

**Answer:**

Virtualization means rendering only the rows that are visible in the viewport, plus a few extra, instead of thousands of DOM nodes.

This keeps the DOM size, memory use, layout work, and render cost roughly constant, no matter how long the list is.

You need it for lists with hundreds or thousands of rows, like tables, feeds, or logs. Common libraries are `react-window`, `react-virtuoso`, and TanStack Virtual.

For smaller lists, pagination or CSS `content-visibility: auto` is often enough.

**Follow-up:**

How is the scrollbar kept accurate?

Answer: A spacer element has the total height, or an estimate, and the visible rows are positioned or translated inside it.

---

### REACT-116 — Virtualization trade-offs

**Difficulty:** Hard

**Category:** Lists

**Question:**

What are the downsides of virtualizing a list?

**Answer:**

Rows with different heights need to be measured or estimated, which can make the scroll position jump.

Because off-screen rows are not in the DOM, browser find-in-page, anchor links, and printing may not work, and screen readers only see the rows that are mounted. Fast scrolling can show blank areas.

Focus and state in unmounted rows are lost, so keep row state outside the row. For accessibility, add attributes like `aria-rowcount` and `aria-setsize`.

**Trade-offs:**

Big render and memory wins vs. complexity and accessibility cost.

**Follow-up:**

Alternatives for moderate lists?

Answer: Pagination, a "load more" button, or CSS `content-visibility: auto` with `contain-intrinsic-size`.

---

### REACT-117 — Keys and list performance

**Difficulty:** Medium

**Category:** Lists

**Question:**

How do keys affect performance and correctness?

**Answer:**

Keys tell React which item is which between renders. With stable, unique keys, React can move existing DOM nodes and keep their state when the list reorders, instead of recreating them.

Index keys cause problems in lists that reorder, insert, or delete items. State gets attached to the wrong item, and React does extra DOM work.

Random keys, like `Math.random()`, are the worst case. Every row is remounted on every render, which is very expensive.

**Follow-up:**

When are index keys acceptable?

Answer: For static lists that never reorder or filter, and where items have no state of their own.

---

### REACT-118 — React DevTools Profiler

**Difficulty:** Easy

**Category:** Profiling

**Question:**

How do you use the React DevTools Profiler to find slow renders?

**Answer:**

Record the interaction you care about. Then look at the flamegraph or ranked chart to find components with long render times, and check the list of commits for slow ones.

Turn on "Record why each component rendered" to see which props, state, or hooks changed.

Profile a production or profiling build when you can. Development mode and Strict Mode make renders look slower than they really are.

Focus on interactions that users actually notice.

**Follow-up:**

What does "did not render" (gray) mean?

Answer: React skipped that component in the commit. That is the result you want from memoization.

---

### REACT-119 — The `<Profiler>` component

**Difficulty:** Medium

**Category:** Profiling

**Question:**

What is the `<Profiler>` API and what does its callback give you?

**Answer:**

`<Profiler id onRender>` measures how long rendering takes for the part of the tree it wraps, and reports it to your code.

The `onRender` callback gets the id, the phase (`mount`, `update`, or `nested-update`), `actualDuration`, and `baseDuration`, plus start and commit times. `actualDuration` is the time spent rendering in this commit. `baseDuration` is the estimated cost of rendering everything without any memoization.

It is disabled in production unless you use a profiling build, and it adds a small overhead.

**Follow-up:**

How do actualDuration and baseDuration help?

Answer: If `actualDuration` is much smaller than `baseDuration`, memoization is working. If they are close, little is being skipped.

---

### REACT-120 — Measure before optimizing

**Difficulty:** Easy

**Category:** Profiling

**Question:**

Describe your approach to a "the app feels slow" report.

**Answer:**

First I reproduce the problem. Then I find out what kind of slowness it is: slow renders, too many renders, a big commit or layout, the network, or the bundle size.

I use the browser's Performance panel to find long tasks and check INP, and the React Profiler to see component costs.

Then I fix the biggest and cheapest cause first, such as colocating state, virtualizing a list, or splitting code. I measure again afterward, and add a check so it doesn't regress.

I avoid adding memoization everywhere.

**Follow-up:**

Which metric reflects interaction slowness?

Answer: INP, Interaction to Next Paint. The usual cause is a long task over 50 ms on the main thread.

---

### REACT-121 — startTransition

**Difficulty:** Medium

**Category:** Concurrent rendering

**Question:**

What does `startTransition` do and what problem does it solve?

**Answer:**

`startTransition` marks a state update as non-urgent. React renders it in the background at a lower priority. If something urgent happens, like typing or a click, React can interrupt the transition and handle the urgent update first. The UI stays responsive, and the old screen stays visible until the new one is ready.

It does not make the work faster. It makes it interruptible and lower priority.

`useTransition` also gives you `isPending`, so you can show that an update is in progress.

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

Answer: No. The input's value must be an urgent update, or typing will lag.

---

### REACT-122 — useDeferredValue

**Difficulty:** Medium

**Category:** Concurrent rendering

**Question:**

What does `useDeferredValue` do and when do you prefer it over `startTransition`?

**Answer:**

`useDeferredValue` gives you a copy of a value that can lag behind the latest one. React first renders using the old value, so the urgent update stays fast. Then it re-renders in the background with the new value, and that background render can be interrupted.

Prefer it over `startTransition` when the value comes in as a prop, or when you can't wrap the code that sets it.

Wrap the slow child in `memo`, so the first quick render skips it. Compare `value !== deferred` to show a stale indicator.

**Code:**

```jsx
const deferred = useDeferredValue(query);
<SlowList query={deferred} />  // SlowList is memo()
```

**Follow-up:**

Why does it need memo on the child?

Answer: Without `memo`, the urgent render with the old value would still re-render the slow child.

---

### REACT-123 — Transition vs. debounce

**Difficulty:** Medium

**Category:** Concurrent rendering

**Question:**

How do transitions/deferred values differ from debouncing?

**Answer:**

Debouncing adds a fixed delay. When the delay ends, the heavy render still runs on the main thread and can block the UI.

Transitions start right away and adapt to the device. On a fast device the update appears quickly. On a slow one, React yields to user input, so the UI stays responsive.

Use debounce to reduce network requests or other expensive side effects. Use transitions or deferred values for render work.

**Follow-up:**

Do they combine?

Answer: Yes. Debounce the fetch, and defer the rendering of the resulting list.

---

### REACT-124 — Transitions and Suspense

**Difficulty:** Hard

**Category:** Concurrent rendering

**Question:**

How do transitions interact with Suspense boundaries?

**Answer:**

If an update inside a transition suspends, React keeps showing the UI that is already visible instead of switching to the fallback. `isPending` becomes true while it waits.

Without a transition, an urgent update that suspends does show the fallback.

This avoids jarring spinners when the user navigates or switches tabs. Only boundaries that are newly revealed during the transition can show their fallbacks. Content that is already on screen stays.

**Follow-up:**

Can a transition be interrupted by a new one?

Answer: Yes. The newer transition replaces the older pending one.

---

### REACT-125 — React.lazy and code splitting

**Difficulty:** Easy

**Category:** Code splitting

**Question:**

How do `React.lazy` and `Suspense` reduce initial load?

**Answer:**

`lazy(() => import("./Heavy"))` puts a component into its own separate chunk of JavaScript. That chunk is only downloaded the first time the component renders.

Wrap it in `<Suspense fallback>` to show a placeholder while the chunk loads.

Good places to split are routes, and heavy widgets that users rarely see, like editors, charts, and modals.

The initial JavaScript becomes smaller, so the page downloads and parses faster.

**Code:**

```jsx
const Chart = lazy(() => import("./Chart"));
<Suspense fallback={<Spinner />}><Chart /></Suspense>
```

**Follow-up:**

Does lazy support named exports?

Answer: Not directly. The module needs a default export, or you can re-export the component as default in a wrapper.

---

### REACT-126 — Suspense waterfalls

**Difficulty:** Hard

**Category:** Code splitting

**Question:**

What is a Suspense/data waterfall and how do you avoid it?

**Answer:**

A waterfall happens when loading steps are chained one after another. For example, a parent loads its chunk, renders, and only then starts loading the child's chunk or data, and so on. The total time is the sum of all steps.

To avoid it, start loading as early as possible: use route-level loaders, preload on hover, fetch in parallel, and move data requirements higher up. Server Components and streaming can help too.

Siblings that suspend inside the same boundary resolve together.

**Follow-up:**

Does render-as-you-fetch fix it?

Answer: Yes. Start the request before rendering, and let components read the promise that is already running.

---

### REACT-127 — Preloading lazy components

**Difficulty:** Medium

**Category:** Code splitting

**Question:**

How can you hide the latency of a lazily loaded chunk?

**Answer:**

Start the dynamic `import()` before the user needs the component. Good moments are when the user hovers or focuses a link, when the browser is idle after the first load, or when a route is likely to come next.

The module is then cached, so when `lazy` runs later it resolves right away.

You can also use `<link rel="modulepreload">` or bundler hints like `webpackPrefetch`.

Be careful on mobile, where preloading too much wastes bandwidth.

**Code:**

```jsx
const load = () => import("./Settings");
const Settings = lazy(load);
<a onMouseEnter={load} href="/settings">Settings</a>
```

**Follow-up:**

Risk of preloading everything?

Answer: You lose the bundle savings and spend extra data. Preload only the targets users are likely to need.

---

### REACT-128 — Where to put Suspense boundaries

**Difficulty:** Medium

**Category:** Code splitting

**Question:**

How granular should Suspense boundaries be?

**Answer:**

Put boundaries around independent parts of the UI, so one slow part does not block the rest of the page. But avoid too many, or the screen will show many spinners popping in at different times.

A common layout is one boundary per route, plus boundaries around slow widgets.

Nested boundaries let content appear progressively. With streaming server rendering, they let the shell render first.

Fallbacks that match the real layout size reduce layout shift.

**Follow-up:**

What goes wrong with one global boundary?

Answer: Any suspension replaces the whole page with the fallback, which makes the page feel slower.

---

### REACT-129 — Layout thrashing

**Difficulty:** Hard

**Category:** Layout & effects

**Question:**

What is layout thrashing and how can it occur in React code?

**Answer:**

Layout thrashing happens when code alternates between reading layout values, like `offsetHeight` or `getBoundingClientRect`, and writing styles. Each read after a write forces the browser to recalculate layout right away, which is called forced synchronous layout. Doing that repeatedly is slow.

In React, it often appears in effects or loops that measure many elements and update each one.

Avoid it by reading all measurements first and writing afterward in one step. Also use `ResizeObserver`, `IntersectionObserver`, or CSS instead of polling.

**Code:**

```js
const rects = nodes.map(n => n.getBoundingClientRect()); // all reads
nodes.forEach((n, i) => (n.style.top = rects[i].y + "px")); // then writes
```

**Follow-up:**

How to spot it?

Answer: In the browser's Performance panel, look for purple "Layout" blocks with "Forced reflow" warnings.

---

### REACT-130 — useLayoutEffect vs. useEffect

**Difficulty:** Medium

**Category:** Layout & effects

**Question:**

When do you use `useLayoutEffect` instead of `useEffect`?

**Answer:**

`useLayoutEffect` runs right after React updates the DOM and before the browser paints. That lets you measure the DOM and update state without the user seeing a flicker, for example when positioning a tooltip or popover.

`useEffect` runs after paint, which is the better default for most side effects.

Layout effects block painting, so keep them short and avoid heavy work. Overusing them hurts responsiveness.

**Trade-offs:**

No flash of wrong layout vs. delayed first paint.

**Follow-up:**

Does a state update in useLayoutEffect cause two paints?

Answer: No. React re-renders synchronously before the browser paints, so the user only sees the final result.

---

### REACT-131 — useLayoutEffect on the server

**Difficulty:** Medium

**Category:** Layout & effects

**Question:**

Why does `useLayoutEffect` warn during SSR and what do you do?

**Answer:**

Effects don't run on the server, so a layout effect cannot affect the HTML the server sends. React warned that the UI might look different before hydration. That warning was removed in React 19, but the concern still applies.

Your options: render a fallback on the server and measure after mount, use `useEffect` if a small flicker is acceptable, or write a hook that picks the right effect based on `typeof window`.

Where possible, use CSS-based layouts so you don't need to measure at all.

**Follow-up:**

How do you avoid hydration mismatch with measurements?

Answer: Render the same initial markup on the server and the client, then measure and update after hydration.

---

### REACT-132 — Web Workers for heavy compute

**Difficulty:** Medium

**Category:** Off-main-thread

**Question:**

How do you keep heavy computation from freezing the React UI?

**Answer:**

React renders on the main thread, and transitions cannot split up one long synchronous function. So if a function takes a long time, the UI freezes.

Move CPU-heavy work, such as parsing, search indexing, image processing, or crypto, into a Web Worker. Send the input with `postMessage`, and set state when the result comes back. The main thread stays free for input and painting.

A library like Comlink lets you call the worker with promises.

**Code:**

```js
const worker = new Worker(new URL("./w.js", import.meta.url), { type: "module" });
worker.postMessage(data);
worker.onmessage = e => setResult(e.data);
```

**Follow-up:**

Can the worker touch the DOM?

Answer: No. A worker has no DOM access. It only communicates with the main thread through messages.

---

### REACT-133 — Worker communication costs

**Difficulty:** Hard

**Category:** Off-main-thread

**Question:**

What overhead should you consider when using workers?

**Answer:**

`postMessage` copies data using the structured clone algorithm. For large payloads, copying can cost more than the computation itself.

To avoid copying, use transferable objects, like `ArrayBuffer` or `OffscreenCanvas`, which are moved instead. `SharedArrayBuffer` shares memory but needs cross-origin isolation.

Also consider worker startup time, cancelling old work, handling stale results, and bundling.

Workers are worth it for tasks that take tens of milliseconds or more, not for trivial ones.

**Follow-up:**

How do you handle out-of-order results?

Answer: Give each request an id, and ignore any response that isn't for the latest one.

---

### REACT-134 — useSyncExternalStore

**Difficulty:** Hard

**Category:** External state

**Question:**

What is `useSyncExternalStore` and why does it exist?

**Answer:**

It is a hook for reading state that lives outside React, such as a store, `window.matchMedia`, or `navigator.onLine`. You give it `subscribe`, `getSnapshot`, and optionally `getServerSnapshot`.

It makes sure every component reads a consistent value during concurrent rendering, which avoids tearing. When the store changes, it forces a synchronous update.

State libraries like Redux and Zustand use it internally.

`getSnapshot` must return a cached value that stays the same reference until the data really changes.

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

Answer: React sees a changed snapshot every time, so it can loop infinitely or re-render constantly.

---

### REACT-135 — Tearing

**Difficulty:** Hard

**Category:** External state

**Question:**

What is tearing and why does concurrent rendering make it possible?

**Answer:**

Tearing is when different components in the same render show different values of the same external data. It happens because rendering was paused partway through, and the store changed in the meantime.

With synchronous rendering, this can't happen, because a render never pauses. With interruptible rendering, it can.

`useSyncExternalStore` checks for store changes during render and re-renders synchronously, so the screen stays consistent.

React's own state is designed to be free of tearing.

**Follow-up:**

Does this affect `useState`?

Answer: No. Only mutable stores that are read outside React state are affected.

---

### REACT-136 — Selecting slices with useSyncExternalStore

**Difficulty:** Hard

**Category:** External state

**Question:**

How do you avoid re-rendering on every store change?

**Answer:**

Make `getSnapshot` return only the part you need, such as a primitive value or a stable reference. React compares snapshots with `Object.is`, so components skip re-rendering when their slice has not changed.

If you need a derived object, memoize the selector's result, or use `useSyncExternalStoreWithSelector` with an equality function.

Avoid subscribing to the entire state object when you only need one field. Otherwise any change to the store re-renders your component.

**Follow-up:**

Why select primitives where possible?

Answer: They are compared by value with `Object.is`, so there is no re-render unless the value really changes.

---

### REACT-137 — Impure render costs

**Difficulty:** Medium

**Category:** Render purity

**Question:**

Why is doing side effects or mutations in render a performance (and correctness) problem?

**Answer:**

React may call render more than once, pause it, or throw the result away. Strict Mode double-calls it, and concurrent features can restart it.

If render mutates outside variables, reads `Date.now()` or `Math.random()`, or fetches data, the output becomes inconsistent. Memoization also breaks, because values are new every time. It can cause extra re-render loops.

Keep render a pure function of props, state, and context. Put side effects in event handlers or `useEffect`.

**Follow-up:**

Is a local mutation OK?

Answer: Yes. Changing objects that you created during that same render, such as local variables, is safe.

---

### REACT-138 — StrictMode double render

**Difficulty:** Easy

**Category:** Render purity

**Question:**

Why does StrictMode render twice in development, and is it a performance bug?

**Answer:**

In development, Strict Mode deliberately calls component bodies, state initializers, and reducers twice. It also mounts, unmounts, and remounts effects once. The goal is to reveal impure code and missing cleanup.

It only happens in development, so it has no cost in production. The logs from the second render appear dimmed.

So don't treat slowness you see in development with Strict Mode as a real problem. Measure a production build instead.

**Follow-up:**

Name a bug it reveals.

Answer: An effect that has no cleanup, such as a subscription or timer, leaks after the simulated remount.

---

### REACT-139 — Expensive work in render and lazy init

**Difficulty:** Easy

**Category:** Render purity

**Question:**

How do you avoid re-running an expensive initializer on every render?

**Answer:**

`useState(compute())` calls `compute()` on every render, even though React only uses the result from the first one.

Pass a function instead: `useState(() => compute())`. React calls it only once, when it creates the state.

For `useRef`, there is no lazy form, so create the value only when needed, for example by checking if `ref.current` is empty.

For values derived from props or state, use `useMemo`. For values only needed in an event, compute them inside the handler.

**Code:**

```jsx
const [data] = useState(() => parseHuge(raw)); // lazy init, runs once
```

**Follow-up:**

Does `useMemo` guarantee a single run?

Answer: No. React may recompute it, so it is a hint, not a guarantee.

---

### REACT-140 — Inline objects, arrays, and functions

**Difficulty:** Easy

**Category:** Memoization

**Question:**

Are inline `{}`/`() => {}` in JSX always bad?

**Answer:**

No. Creating them is cheap. They only matter when they are passed to a memoized component or used as a hook dependency, because a new identity each render defeats the optimization.

For plain DOM elements and non-memoized children, it makes no difference.

Move constants outside the component, and only stabilize values where identity matters.

**Follow-up:**

How do you remove a function dependency without useCallback?

Answer: Define the function inside the effect, or use the latest-ref pattern, or a `useEffectEvent`-style approach.

---

### REACT-141 — Derived state vs. effects

**Difficulty:** Medium

**Category:** Render purity

**Question:**

Why is syncing derived state through `useEffect` + `setState` slow?

**Answer:**

With an effect, the component first renders with stale data and commits it. Then the effect runs and sets state, and React renders a second time. That means two passes and possibly a visible flash of wrong content.

Instead, calculate derived values during render, and use `useMemo` if it is expensive.

To reset state when a prop changes, use a `key`, or store the previous value and adjust the state during render.

**Code:**

```jsx
const fullName = first + " " + last; // not useEffect + setState
```

**Follow-up:**

How can a key reset state?

Answer: When the `key` changes, React unmounts the component and mounts it again with fresh state.

---

### REACT-142 — Automatic batching

**Difficulty:** Medium

**Category:** Rendering fundamentals

**Question:**

What changed with batching in React 18?

**Answer:**

React 18 batches updates everywhere when you use `createRoot`. That includes event handlers, promises, `setTimeout`, and native event handlers. Several `setState` calls in the same tick lead to one re-render.

In React 17, batching only happened inside React's own event handlers.

This reduces renders without any code changes.

Reading state right after setting it still gives you the old value in that same closure.

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

`flushSync` forces React to apply the updates and update the DOM immediately. Use it when you must read the updated DOM right away, such as scrolling to a newly added item or moving focus.

The cost is that it skips batching and concurrency, which can hurt performance. React also warns if you call it during render or in a lifecycle method.

Use it sparingly. In most cases, `useLayoutEffect`, or a ref with an effect, is a better choice.

**Code:**

```jsx
flushSync(() => setItems(next));
listRef.current.lastElementChild.scrollIntoView();
```

**Follow-up:**

Alternative that avoids it?

Answer: A layout effect that depends on the list, and scrolls after the DOM has been committed.

---

### REACT-144 — Fast typing in large forms

**Difficulty:** Medium

**Category:** State colocation

**Question:**

A form with 200 fields lags on each keystroke. What are your options?

**Answer:**

If the form keeps all values in one parent's state, every keystroke re-renders the whole form.

There are several options. Colocate the state per field or section. Use uncontrolled inputs and read the values with refs or `FormData` on submit. Use a form library with subscription-based fields, like React Hook Form. Memoize field components. Or defer expensive validation with `useDeferredValue`.

Keep costly validation off the keystroke path.

**Follow-up:**

Trade-off of uncontrolled inputs?

Answer: You get less live control, such as formatting or instant validation, but renders are much cheaper.

---

### REACT-145 — Bundle size and tree shaking

**Difficulty:** Medium

**Category:** Code splitting

**Question:**

How do you keep a React bundle small?

**Answer:**

Start by measuring with a bundle visualizer to see what is large.

Then split routes with `lazy`. Import only the modules you need, such as `lodash-es` with named imports, instead of whole libraries. Replace heavy dependencies with lighter ones, for example moment with date-fns or Temporal. Defer third-party scripts, and compress with gzip or brotli.

Where available, use Server Components to keep server-only code out of the client bundle.

Set size budgets and check them in CI.

**Follow-up:**

Why can tree shaking fail?

Answer: CommonJS modules, imports with side effects, or barrel files without `sideEffects: false` stop the bundler from removing unused code.

---

### REACT-146 — React Compiler

**Difficulty:** Medium

**Category:** React Compiler

**Question:**

What is React Compiler and how does it change memoization practice?

**Answer:**

React Compiler is a build-time tool that analyzes your components and hooks, and automatically adds memoization where it helps. It works at a fine level, even after early returns and conditionals, which manual hooks can't do.

That removes most of the need to write `useMemo`, `useCallback`, and `memo` by hand.

It assumes you follow the Rules of React: pure rendering and no mutation of props or state.

Existing manual memoization can stay. `useMemo` is still useful when you need precise control over effect dependencies.

**Follow-up:**

What does it not fix?

Answer: Architectural problems, like too much state at the top, huge lists without virtualization, or genuinely expensive computation.

---

### REACT-147 — Compiler constraints and adoption

**Difficulty:** Hard

**Category:** React Compiler

**Question:**

How do you adopt React Compiler safely?

**Answer:**

Start with the ESLint rules, such as `eslint-plugin-react-compiler`, and fix any violations of the Rules of React. The compiler skips components it cannot prove safe, which is called a bailout.

Then roll it out gradually. Use `compilationMode: "annotation"` with `"use memo"` directives, or enable it by directory. Compare Profiler results and run your tests.

Use `"use no memo"` to opt a component out.

Don't remove existing manual memoization without checking first.

**Follow-up:**

Which patterns cause bailouts?

Answer: Mutating props or state, reading refs during render, or other impure patterns the compiler can't analyze.

---

### REACT-148 — Server Components and performance

**Difficulty:** Medium

**Category:** Rendering architecture

**Question:**

How do React Server Components help performance?

**Answer:**

Server Components run only on the server. Their code and heavy dependencies, like markdown parsers or database clients, are never sent to the browser. That makes the bundle smaller and reduces hydration work.

They can also fetch data close to its source, which avoids client-side waterfalls, and they can stream through Suspense.

Interactive parts stay as Client Components.

The costs are more load on the server, and stricter rules about where the boundary between server and client code goes.

**Follow-up:**

Can a Server Component hold state?

Answer: No. Hooks like `useState` and `useEffect` need a Client Component.

---

### REACT-149 — Streaming SSR and selective hydration

**Difficulty:** Hard

**Category:** Rendering architecture

**Question:**

What does React 18 streaming SSR with selective hydration improve?

**Answer:**

With streaming, `renderToPipeableStream` or `renderToReadableStream` sends the HTML shell right away. Parts wrapped in Suspense are streamed as their data becomes ready. This improves time to first byte and first paint.

Hydration also happens per Suspense boundary and does not block the page. React hydrates boundaries in priority order, and gives priority to the one the user interacts with.

So slow components no longer stop the rest of the page from becoming interactive.

**Follow-up:**

What breaks it?

Answer: A single top-level boundary, or data fetching that is not streamed and forces the whole page to wait.

---

### REACT-150 — Resetting and unmounting costs: key and conditional rendering

**Difficulty:** Medium

**Category:** Rendering fundamentals

**Question:**

Should you hide heavy components with CSS or unmount them conditionally?

**Answer:**

It depends on how often the content is toggled and how costly it is.

Unmounting frees memory and stops effects, but it loses the component's state, and showing it again pays the full mount cost.

Hiding with CSS, like `display: none`, keeps the state and mounts only once, but React still renders it and runs its effects, and it still holds DOM nodes.

Frequently toggled, expensive content may be better hidden. Rarely shown content should be unmounted. React's `<Activity>` (experimental, 19.x) hides content while lowering its priority and keeping its state.

**Trade-offs:**

Mount cost and lost state vs. memory and background work.

**Follow-up:**

Does `display: none` stop re-renders?

Answer: No. React still renders the component when its state or props change. Hiding only avoids layout and paint.
