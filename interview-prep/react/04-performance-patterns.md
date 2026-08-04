
# 04 - Performance Patterns

> Goal: Move beyond "wrap it in `useMemo`" and build a principled, measurement-first approach to React performance - memoization tradeoffs, list virtualization, code splitting, avoiding request/render waterfalls, and profiling methodology.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this chapter you should be able to:

1. State the golden rule of performance work: measure first, never guess.
2. Explain exactly what `React.memo`, `useMemo`, and `useCallback` do, their costs, and when they help vs hurt.
3. Diagnose "why does this re-render" using React DevTools Profiler methodology.
4. Explain list virtualization conceptually and know when a plain `.map()` becomes a real problem.
5. Explain code splitting (`React.lazy` + `Suspense`, route-based splitting) and its tradeoffs.
6. Identify and fix request waterfalls and render waterfalls.
7. Explain bundle-size thinking: what to lazy-load, what to tree-shake, what to avoid importing wholesale.
8. Use `useTransition`/`useDeferredValue` to keep UI responsive under expensive updates.
9. Explain the difference between perceived performance and raw computation time, and techniques for improving the former.

---

## 0. The golden rule: measure first

Every senior-level answer about performance should start here. Premature memoization is a real cost (it adds code complexity, an extra comparison on every render, and can silently mask correctness bugs like stale closures inside a wrongly-scoped `useMemo`), and it very often optimizes something that was never the bottleneck.

### The methodology

1. **Identify a real, observed symptom** - janky scroll, slow typing, slow navigation, high Time to Interactive - not a hypothetical.
2. **Profile** (React DevTools Profiler, Chrome Performance tab) to find *which* component/work is actually expensive.
3. **Form a hypothesis** about the cause (unnecessary re-renders? expensive computation? too much DOM? network waterfall?).
4. **Apply the smallest targeted fix.**
5. **Re-measure** to confirm the fix actually helped - and didn't just move the problem.

### Interview question

**Q: How do you approach a performance problem in a React app?**

> "I don't guess - I profile first. I reproduce the specific symptom, use the React DevTools Profiler or the browser's Performance tab to see what's actually expensive - excessive re-renders, a slow computation, layout thrashing, or a network waterfall - and only then apply a targeted fix. Then I re-measure to confirm it actually helped. Sprinkling `useMemo`/`useCallback` everywhere upfront usually adds complexity without addressing the real bottleneck, and can even hurt readability and introduce stale-closure bugs."

---

## 1. `React.memo` - what it does and its real cost

### What it does

Wraps a component so React **skips calling its render function entirely** if its props are shallow-equal to the previous render (or equal per a custom comparator you supply as the second argument).

```jsx
const ExpensiveRow = React.memo(function ExpensiveRow({ item }) {
  // expensive rendering logic
  return <li>{item.name}</li>;
});
```

### The shallow-equality trap

`memo`'s default comparison is **shallow** - it compares each prop with `Object.is`. A new object/array/function reference (even with identical contents) counts as "different," defeating the memoization.

```jsx
function Parent() {
  const [count, setCount] = useState(0);
  // New object literal + new arrow function on EVERY Parent render -> memo is defeated every time.
  return <ExpensiveRow item={{ name: 'Static' }} onClick={() => console.log('click')} />;
}
```

Fixing this requires the *parent* to keep those references stable (`useMemo` for the object, `useCallback` for the function) - **`memo` on the child alone accomplishes nothing** if the parent keeps recreating its props from scratch. This is a very common "why doesn't `memo` work" bug.

### When `memo` is worth it

- The component is **expensive to render** (large subtree, expensive computation in render) AND
- It **re-renders often with unchanged props** (e.g., a list row when the parent re-renders for unrelated reasons, or a sibling of frequently-changing state).

### When `memo` is a waste (or actively harmful)

- The component is cheap to render (a `<span>{text}</span>`) - the shallow comparison itself costs more than just re-rendering would.
- Its props change on every render anyway (memoization can never pay off).
- It leads developers to "fix" a `memo` that isn't working by memoizing unrelated things upstream, spreading complexity for no measured benefit.

### Interview question

**Q: You wrapped a component in `React.memo` but it still re-renders every time. Why?**

> "Almost always because at least one prop is a new reference every render - an inline object, array, or arrow function created in the parent's render body. `memo`'s default comparison is shallow, so a new reference is 'different' even with identical contents. The fix is making the parent pass stable references via `useMemo`/`useCallback`, or restructuring so that prop isn't necessary at all - for example, moving state closer to where it's used instead of passing a callback down."

---

## 2. `useMemo` - memoizing computed values

### What it does

Recomputes a value only when its dependency array changes; otherwise returns the cached value from the previous render.

```jsx
const sortedItems = useMemo(() => {
  return [...items].sort((a, b) => a.value - b.value);
}, [items]);
```

### Two distinct reasons to use `useMemo` (know both - they're often conflated)

1. **Avoid expensive recomputation** - the naive reason most people learn first. Only matters if the computation is *actually* expensive (sorting/filtering thousands of items, heavy math) - for trivial computations, `useMemo`'s own bookkeeping overhead can exceed the cost of just recomputing.
2. **Preserve referential identity** - even for a *cheap* computation, if the resulting object/array is passed as a prop to a `memo`-wrapped child (or used as another hook's dependency), a new reference every render defeats that downstream memoization regardless of how "expensive" the computation itself is.

```jsx
// Here, `useMemo` isn't about computation cost (trivial) - it's about keeping the SAME array
// reference across renders so <List items={visibleItems} /> (wrapped in memo) doesn't
// re-render every time Parent re-renders for unrelated reasons.
const visibleItems = useMemo(() => items.filter(i => i.visible), [items]);
```

### Interview question

**Q: Is `useMemo` only for expensive computations?**

> "No - there are two separate reasons. One is avoiding recomputation cost for genuinely expensive work. The other, often more impactful in practice, is preserving referential equality so a memoized child component or another hook's dependency array doesn't see a 'new' value every render even when the underlying data hasn't logically changed. A cheap `.filter()` call might still deserve `useMemo` purely to keep the resulting array's reference stable for a `memo`-wrapped consumer."

---

## 3. `useCallback` - memoizing function references

`useCallback(fn, deps)` is exactly `useMemo(() => fn, deps)` - it exists as a named convenience for the extremely common case of memoizing a function.

```jsx
const handleSelect = useCallback((id) => {
  setSelectedId(id);
}, []);   // stable reference forever, since it doesn't close over anything that changes
```

### The most common mistake: using `useCallback` without a `memo`-wrapped consumer

```jsx
// Pointless - Child isn't memoized, so it re-renders with Parent regardless of whether
// onClick's reference is stable. useCallback here adds overhead for zero benefit.
function Parent() {
  const onClick = useCallback(() => {...}, []);
  return <Child onClick={onClick} />;   // Child is a plain function component, not memo()
}
```

`useCallback` only pays off when the function is:
- Passed to a `memo`-wrapped component (to avoid defeating its shallow comparison), **or**
- Used as a dependency of another hook (`useEffect`, `useMemo`) where a fresh reference every render would cause that hook to re-run unnecessarily.

### Interview question

**Q: When does `useCallback` actually make a measurable difference?**

> "Only when the function's referential stability matters to something downstream - either it's passed as a prop to a `memo`-wrapped child, where a new reference every render would defeat that memoization, or it's a dependency of another hook like `useEffect`, where a fresh reference would cause that effect to re-run every render. If the function isn't consumed by anything reference-sensitive, `useCallback` just adds a dependency-array comparison for no benefit."

---

## 4. Profiling with React DevTools

### The Profiler tab workflow

1. Open React DevTools -> Profiler tab.
2. Click record, perform the interaction you're investigating (a click, a scroll, a keystroke), stop recording.
3. Inspect the **flame graph** / **ranked chart**:
   - Each bar is a component that rendered during that commit.
   - Bar width/color intensity indicates render duration.
   - Gray bars = component **did not re-render** in that commit (bailed out, e.g. via `memo`).
4. Click a component to see **why it rendered** (React DevTools can show "props changed," "state changed," "hooks changed," or "parent re-rendered" as the reason, depending on version).
5. Look for: components rendering far more often than expected, components taking disproportionate time, or a cascade where one state update re-renders a huge subtree unnecessarily.

### What to look for specifically

| Symptom in Profiler | Likely cause | Typical fix |
|---|---|---|
| A component renders on every keystroke in an unrelated input | State is too high in the tree (search input state lives in a shared parent above unrelated siblings) | Move state down; colocate it closer to where it's used |
| A large subtree re-renders every time a single leaf's local counter changes | No memoization boundary + non-memoized intermediate components pass through re-renders | Add `React.memo` at a strategic boundary; verify props passed are stable |
| One commit takes a long time in a single component | Expensive synchronous computation in render (no memoization) or a huge unvirtualized list | `useMemo` the computation; virtualize the list |
| Many small commits in rapid succession | Multiple `setState` calls not batching as expected (e.g., across microtask boundaries in older React, or from multiple independent sources) | Investigate batching; consolidate state updates or verify React 18's automatic batching applies to the context you're in |

### Interview question

**Q: Walk me through how you'd investigate "this page feels slow" using React DevTools.**

> "First I reproduce the specific interaction that feels slow with the Profiler recording. I look at the flame graph for that commit - which components rendered, how long each took, and whether components that shouldn't have re-rendered did. If I see a big subtree re-rendering because of an unrelated state change, I look at where that state lives and whether it should be colocated lower in the tree, or whether a `memo` boundary with stable props would stop the cascade. If instead one component itself is slow (not a re-render count problem, but a duration problem), I look inside it for expensive unmemoized computation, or check the Chrome Performance tab for layout thrashing or a huge unvirtualized list."

---

## 5. List virtualization

### The problem

Rendering a `.map()` over thousands of DOM nodes means the browser must create, layout, and paint *all* of them, even the 30 currently visible in the viewport - this is expensive both on initial render and on every subsequent update (scroll-triggered re-renders, data changes).

### The solution: windowing/virtualization

Render only the DOM nodes for items **currently visible (plus a small buffer/"overscan")**, and recycle/reposition nodes as the user scrolls, using absolute positioning (or transforms) to place each rendered row where it would appear in the full (unrendered) list.

### Libraries (web ecosystem)

- **`react-window`** - lightweight, minimal API, good default choice for fixed or variable-size lists/grids.
- **`react-virtualized`** - older, more feature-rich, heavier; largely superseded by `react-window` (same author, leaner successor) for most use cases.
- **`@tanstack/react-virtual`** - headless virtualization primitive (from the TanStack team, same org as React Query) - gives you the scroll/measurement logic without prescribing markup, good fit if you're already using other TanStack tools.

```jsx
import { FixedSizeList } from 'react-window';

function VirtualizedList({ items }) {
  return (
    <FixedSizeList height={600} width={'100%'} itemCount={items.length} itemSize={48}>
      {({ index, style }) => (
        <div style={style}>{items[index].name}</div>   // `style` positions this row absolutely
      )}
    </FixedSizeList>
  );
}
```

### When you actually need it

- Lists in the hundreds-to-thousands+ of rows, especially with any per-row complexity (images, interactive controls).
- NOT needed for small, bounded lists (tens of items) - virtualization adds its own complexity (fixed/estimated row heights, harder to implement natural browser find-in-page/SEO/accessibility patterns) and isn't worth it below a real threshold you should verify by profiling, not assuming.

### RN overlap note

You already know this pattern from React Native's `FlatList`/`FlashList` (see `../react-native/06-performance.md`) - web virtualization is the same core idea (windowing + recycling), just implemented via absolute-positioned `<div>`s instead of native recycler views. This is a good cross-reference to mention in interviews to show depth across both platforms.

### Interview question

**Q: When would you virtualize a list, and what's the tradeoff?**

> "When the list is large enough that rendering every row costs more than the benefit - typically hundreds of rows or more, especially with non-trivial row content. Virtualization only mounts visible rows plus a small overscan buffer, dramatically cutting DOM node count and render/layout cost. The tradeoff is complexity: you often need known or estimated row heights, native browser behaviors like Ctrl+F find-in-page or plain scrollbar-drag-to-position become harder to preserve perfectly, and it's one more moving part to maintain - so I only reach for it once profiling shows the unvirtualized list is the actual bottleneck, not preemptively for every list in the app."

---

## 6. Code splitting

### Why bundle size matters

Every KB of JS shipped to the browser must be downloaded, parsed, compiled, and executed before the app is interactive. A large single bundle delays **Time to Interactive (TTI)**, especially on slower networks/devices.

### `React.lazy` + `Suspense`

```jsx
const SettingsPage = React.lazy(() => import('./SettingsPage'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <SettingsPage />
    </Suspense>
  );
}
```

`React.lazy` defers loading a component's code (and its own dependencies) until it's actually rendered, splitting it into a separate chunk that bundlers (Webpack/Vite/etc.) emit and fetch on demand. `Suspense` provides the fallback UI to show while that chunk loads.

### Route-based splitting (the highest-leverage default)

The single most common and highest-value application of code splitting: lazy-load each route/page, so users only download the code for the page they're actually visiting, not the entire app upfront.

```jsx
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Settings = React.lazy(() => import('./pages/Settings'));

<Routes>
  <Route path="/dashboard" element={<Suspense fallback={<Spinner />}><Dashboard /></Suspense>} />
  <Route path="/settings" element={<Suspense fallback={<Spinner />}><Settings /></Suspense>} />
</Routes>
```

### Component-level splitting for heavy, conditionally-shown UI

Good candidates: rich text editors, charting libraries, modal-only flows (e.g., a heavy "export to PDF" dialog), anything behind a feature flag or a rarely-used admin panel.

### Tradeoffs to mention

- Every lazy boundary needs a `Suspense` fallback - too many small boundaries can create a "waterfall of spinners" that feels worse than a single upfront load; group sensibly (usually per-route is the sweet spot before going finer-grained).
- Splitting too aggressively increases the *number* of network requests, which has its own overhead - balance against measured wins, not intuition.
- Preloading is often worth pairing with lazy loading (e.g., preload the next likely route on hover/intent) to hide the network latency the split introduces.

### Interview question

**Q: How would you reduce a React app's initial bundle size?**

> "Start by measuring - a bundle analyzer shows what's actually large. The highest-leverage default is route-based code splitting with `React.lazy` and `Suspense`, so users only download the JS for the page they're on. Beyond that, I look for heavy, conditionally-used components - rich editors, charting libraries, rarely-used admin UI - and split those individually. I also check for accidental full-library imports (e.g., importing an entire icon set or utility library instead of the specific exports) that defeat tree-shaking. I'd pair aggressive splitting with preloading likely-next routes on hover/intent so the extra network request doesn't show up as added latency to the user."

---

## 7. Avoiding waterfalls

### Request waterfalls

A waterfall happens when requests that *could* run in parallel instead run **sequentially**, because each one only starts after a previous one resolves - usually because a component only fetches its own data *after* mounting, and it only mounts after a parent's fetch resolves and renders it.

```jsx
// BAD: waterfall - Profile fetches after User resolves, Posts fetches after Profile resolves,
// even though none of these actually depend on each other's DATA, just on render order.
function Page({ userId }) {
  const { data: user } = useQuery({ queryKey: ['user', userId], queryFn: () => fetchUser(userId) });
  if (!user) return <Spinner />;
  return <Profile userId={userId} />;   // Profile's own query only starts once Page re-renders past this point
}

function Profile({ userId }) {
  const { data: profile } = useQuery({ queryKey: ['profile', userId], queryFn: () => fetchProfile(userId) });
  if (!profile) return <Spinner />;
  return <Posts userId={userId} />;   // same problem again
}
```

Each query key only needs `userId`, which is known from the very first render - there's no real data dependency forcing sequential fetches, just an *accidental* one from component structure.

**Fix - fetch in parallel at a common ancestor, or let each independent query fire immediately regardless of nesting:**

```jsx
// GOOD: all three queries fire immediately in parallel since none actually depend on
// another's *response data* - only render composition was accidentally serializing them before.
function Page({ userId }) {
  const userQuery = useQuery({ queryKey: ['user', userId], queryFn: () => fetchUser(userId) });
  const profileQuery = useQuery({ queryKey: ['profile', userId], queryFn: () => fetchProfile(userId) });
  const postsQuery = useQuery({ queryKey: ['posts', userId], queryFn: () => fetchPosts(userId) });

  if (userQuery.isLoading || profileQuery.isLoading || postsQuery.isLoading) return <Spinner />;
  return <PageContent user={userQuery.data} profile={profileQuery.data} posts={postsQuery.data} />;
}
```

If one query *genuinely* depends on another's result (e.g., you need `user.organizationId` to fetch the organization), that's a **real** dependency and sequential fetching (React Query's `enabled` option gating the dependent query) is correct - the key skill is telling apart *accidental* waterfalls (structural) from *necessary* ones (data-dependent).

```jsx
const { data: user } = useQuery({ queryKey: ['user', userId], queryFn: () => fetchUser(userId) });
const { data: org } = useQuery({
  queryKey: ['org', user?.organizationId],
  queryFn: () => fetchOrg(user.organizationId),
  enabled: !!user?.organizationId,   // correctly gated - this IS a real data dependency
});
```

### Render waterfalls

A related but distinct issue: a component renders, discovers it needs more data, fetches, re-renders, discovers it needs *more* data based on the first fetch's result, fetches again, etc. - multiple round trips of render-fetch-render instead of fetching everything needed for a view up front (or in parallel where possible).

### Interview question

**Q: What's a request waterfall, and how do you spot/fix one?**

> "It's when requests that could run in parallel run sequentially instead, usually because of how components are nested rather than because of a real data dependency - a child component's query doesn't start until its parent's query resolves and the child mounts. I'd spot it in the Network tab as requests starting one after another instead of together. The fix is either fetching in parallel at a shared point using the params already available up front, or, if one query *does* genuinely need another's result, explicitly gating it with something like React Query's `enabled` option rather than accidentally serializing everything through component mount order."

---

## 8. `useTransition` and `useDeferredValue` - keeping UI responsive under load

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

## 9. Perceived performance beyond raw computation

Interviewers value candidates who understand that **perceived** speed often matters more than raw milliseconds:

- **Skeleton screens / optimistic UI** - show a plausible layout or optimistic result immediately, rather than a blank screen or spinner, even if the real data takes the same time to arrive.
- **Progressive rendering** - render what you have as soon as it's available (e.g., stream in above-the-fold content) instead of waiting for everything.
- **Avoiding layout shift** - reserve space for images/async content so the page doesn't jump around as things load (also a Core Web Vitals concern - Cumulative Layout Shift).
- **Instant feedback on interaction** - disable a button and show a spinner immediately on click, even before the network request resolves, so the app never feels unresponsive to input.

### Interview question

**Q: Is a faster raw computation always the right performance fix?**

> "Not necessarily - perceived performance often matters more to users than raw computation time. Showing a skeleton screen or optimistic result immediately, giving instant feedback on click before a request resolves, and avoiding layout shift as content loads can make an app *feel* dramatically faster without changing a single millisecond of actual work. I treat 'make it feel fast' and 'make it compute fast' as related but distinct goals, and profile/measure user-perceived metrics (like Largest Contentful Paint, Cumulative Layout Shift, Time to Interactive) alongside raw render timings."

---

## Interview question bank (performance)

1. **What's your general methodology for approaching a React performance problem?**
2. **What exactly does `React.memo` do, and why might it fail to prevent a re-render even when applied correctly?**
3. **Give two distinct reasons to use `useMemo`, not just "expensive computation."**
4. **When does `useCallback` provide zero benefit despite "looking" like an optimization?**
5. **How do you use the React DevTools Profiler to diagnose unnecessary re-renders?**
6. **When do you actually need list virtualization, and what's the tradeoff?**
7. **What's the difference between `React.lazy` component splitting and route-based splitting - which is usually higher leverage?**
8. **What's a request waterfall, and how do you tell an accidental one from a necessary one?**
9. **What problem do `useTransition`/`useDeferredValue` solve that debouncing doesn't?**
10. **Explain the difference between perceived performance and raw computation performance, with an example technique for each.**
11. **Why can premature memoization be actively harmful, not just neutral?**
12. **How would you detect if a large bundle is hurting your app's load time, and what's your first fix?**

---

## Hands-on drills (do these)

- [ ] Build a parent with a counter and a child rendering a large list of rows; wrap the child in `React.memo`; pass an inline object/array prop and observe it still re-renders on counter increments; fix with `useMemo` in the parent.
- [ ] Record a React DevTools Profiler session of a page with an obviously unnecessary re-render cascade; identify the culprit; fix it; re-record to confirm.
- [ ] Render a 10,000-row list with plain `.map()`, observe scroll jank in the Chrome Performance tab; swap in `react-window`'s `FixedSizeList`; confirm the improvement.
- [ ] Convert a single-bundle app's routes to `React.lazy` + `Suspense`; inspect the Network tab to confirm separate chunks load per route.
- [ ] Build a page with 3 independent React Query calls nested so they accidentally waterfall (each inside the previous one's loading gate); flatten them to fire in parallel; confirm via Network tab timing.
- [ ] Build a search input that filters a large in-memory list on every keystroke; observe typing lag; fix with `useTransition`, confirming typing stays responsive while results lag slightly behind.

---

## Senior red flags / green flags

### Green flags interviewers love
- "I profile before optimizing" stated and demonstrated with a concrete methodology, not just as a slogan.
- Correctly diagnosing that `memo` failed because of an unstable prop reference from the parent, not blaming `memo` itself.
- Distinguishing accidental (structural) waterfalls from necessary (data-dependent) ones.
- Bringing up perceived performance techniques unprompted (skeletons, optimistic UI, avoiding layout shift).

### Red flags
- Wrapping every component in `memo`/`useMemo`/`useCallback` "just in case," with no measurement.
- Treating virtualization as something every list needs by default.
- Not knowing the difference between route-based and component-level code splitting.
- Confusing debouncing with `useTransition` as interchangeable solutions to the same problem.

---

## Senior-Level Best Practices

### Decision frameworks & tradeoffs

**How much to invest in performance work, relative to other priorities.** Not every measured slowness is worth fixing immediately - the decision framework is impact (how many users, how severe) times frequency, against the engineering cost of the fix and the risk of introducing bugs (memoization in particular is a common source of stale-data bugs when done carelessly). A 200ms delay on a rarely-used admin export button is a very different priority than a 200ms delay on every keystroke in the primary search box. Seniors are expected to make and defend this prioritization call explicitly, not treat "performance" as uniformly urgent.

**Virtualization vs. pagination vs. "just don't fetch that much."** Virtualization solves "I have to render many rows efficiently," but doesn't solve "I fetched 10,000 rows from the server unnecessarily" - if the underlying data volume itself is the problem, server-side pagination (fetching only the visible page/window from the API) is often the better fix, avoiding both the network cost of an oversized payload and the client-side virtualization complexity. The decision hinges on whether the *data volume* or the *DOM node count* is actually the bottleneck - profile both the network tab and the render Profiler before choosing.

**Code-splitting granularity - route-level default vs. finer-grained.** Start with route-level splitting as the default (highest leverage, lowest complexity per the chapter). Only go finer-grained (component-level) when a specific route still has a measurably large, conditionally-used chunk (a rich text editor, a charting library) that most visitors to that route never trigger - going finer everywhere upfront, before measuring, tends to produce a "waterfall of spinners" UX regression that's often worse than the bundle-size problem it was meant to solve.

### Production checklists

- [ ] A bundle analyzer (`source-map-explorer`, `webpack-bundle-analyzer`, or the Vite equivalent) is run as part of the release process (or at least periodically), not only when someone anecdotally complains about load time.
- [ ] Every `React.memo`-wrapped component's props are verified stable at the parent (no unmemoized inline objects/arrays/functions passed through) - checked with the Profiler after adding `memo`, not assumed to "just work" once added.
- [ ] Large lists (hundreds+ rows) have been profiled to confirm virtualization is actually warranted before adding a virtualization library's complexity - documented as a deliberate decision either way (virtualized, or "measured, not needed yet") so the choice doesn't get silently re-litigated.
- [ ] Route-based code splitting is applied to every top-level route by default in any app with more than a handful of routes - treated as a baseline setup task, not an opt-in optimization added later.
- [ ] Any `useTransition`/`useDeferredValue` usage has been verified with the Profiler to actually improve perceived responsiveness (typing test under throttled CPU), not added speculatively based on the pattern "looking right" for the situation.
- [ ] Performance-sensitive PRs include a before/after Profiler screenshot or a brief written note in the PR description - this creates institutional memory and makes performance regressions in review much easier to catch than relying on reviewers to notice silently.

### Anti-patterns

- **Sprinkling `useMemo`/`useCallback` on every value and function "as a habit" across a codebase**, without measurement - covered directly in the chapter as a red flag, worth restating as the single most common performance anti-pattern seen in real code review, and one that actively harms readability and can introduce stale-closure bugs when a dependency is later added to the wrapped logic but forgotten in the array.
- **Adding `React.memo` to fix a slow list without checking whether the actual bottleneck is the list's *own* render cost vs. re-render *frequency*** - if a single row's render is inherently expensive (heavy computation, not just "gets called often unnecessarily"), `memo` does nothing for the cost of the renders that do need to happen; the fix there is `useMemo`-ing the expensive computation itself or virtualizing, not blocking re-renders.
- **Debouncing a value used purely for a React state update/render** when `useTransition`/`useDeferredValue` would let React interleave the work adaptively - defaulting to a fixed-timer debounce for every "expensive render on input change" scenario, even when it's specifically a rendering-cost problem React's own scheduler is built to handle.
- **Treating a single Profiler session as the final verdict** rather than a starting hypothesis - performance characteristics can differ meaningfully between a fast development machine and a real user's mid-range device/network, and a fix verified only on a fast machine can fail to actually help (or even regress) on the devices/conditions that matter most, especially for consumer-facing apps with a wide device range.

### Failure modes

- **A `useMemo`'d value silently going stale because a dependency was added to the computation but not to the dependency array** - since JavaScript doesn't statically enforce this the way TypeScript enforces a function's parameter list, this bug compiles and runs fine, producing subtly wrong (stale) computed values that can be very hard to notice unless the discrepancy is visually or functionally obvious.
- **A virtualized list's "jump to item" or "scroll to bottom" feature breaking after adopting virtualization**, because code that previously relied on `scrollIntoView`/DOM queries against every rendered row no longer works when most rows aren't actually in the DOM - a common regression introduced by bolting virtualization onto an existing feature-rich list without auditing every DOM-dependent behavior first.
- **A code-split chunk failing to load in production due to a stale deployed asset URL** (a classic "chunk load error" after a new deployment invalidates the old chunk hashes while a user's tab is still open with references to them) - a real, common production failure mode of aggressive code splitting that needs an explicit handling strategy (prompting a reload, or a retry-with-cache-bust) rather than leaving users stuck on a broken lazy-load.
- **`useTransition`'s `isPending` state being ignored in the UI**, so a user sees no feedback that a low-priority update is still catching up, and perceives the app as "broken" or unresponsive during the (intentional) lag window - the feature's benefit (keeping urgent input responsive) can backfire into a *worse* perceived experience if the pending state isn't surfaced clearly.

### Observability

- Track Core Web Vitals (Largest Contentful Paint, Interaction to Next Paint, Cumulative Layout Shift) via real user monitoring (not just synthetic lab tests like Lighthouse), since lab tests run on a single, often fast, reference device/network and can miss regressions that only affect a meaningful segment of real users on slower devices/connections.
- Set up a bundle-size budget check in CI (e.g., failing the build if a route's chunk exceeds a threshold) so bundle bloat is caught at the PR that introduces it, rather than discovered weeks later during an unrelated performance audit when it's much harder to attribute to a specific change.
- For a suspected re-render cascade in production (not reproducible easily in dev), consider a sampled, opt-in Profiler recording via the `react-dom` Profiler API (`<Profiler onRender={...}>`) wired to your analytics/logging pipeline, rather than relying solely on anecdotal user reports of "it feels slow."

### Team/scale practices

- Require a stated methodology (symptom -> profile -> hypothesis -> fix -> re-measure) in the PR description for any change whose primary purpose is "performance," so reviewers can verify the fix actually targets a measured bottleneck rather than approving based on trust that memoization is inherently good.
- Maintain a small, reviewed set of internal performance utilities/patterns (a standard virtualized list wrapper, a standard `useTransition`-based search pattern) so engineers reach for a vetted, consistent implementation instead of independently reinventing similar patterns with varying quality across features.
- Periodically re-run the bundle analyzer and Profiler on key user flows as a scheduled task (not only reactively), since performance regresses gradually and invisibly as features accumulate - a "boiling frog" problem that's much cheaper to catch incrementally than to fix in one large effort after users start complaining.

### Senior follow-up Q&A

**Q1: You've profiled a slow page and found the bottleneck is a single component taking 400ms to render, not a re-render-count problem. Walk through your options, in order of preference.**
> "First, I'd check if the 400ms is legitimately necessary work or accidental - is it recomputing something on every render that could be `useMemo`'d, or doing synchronous work that could be deferred? If it's a genuinely large, unavoidable computation (e.g., processing a big dataset for a chart), I'd look at whether it can move off the main thread entirely (a Web Worker) or whether the *data* itself can be reduced (pre-aggregate on the server, paginate, or only compute what's actually visible). If none of that's feasible and the work must happen client-side and synchronously, `useTransition` at least keeps the rest of the UI responsive while it happens, even though the total work time is unchanged - it's a perceived-performance mitigation, not a fix for the underlying cost, which I'd say explicitly rather than presenting it as if it solved the root problem."

**Q2: A code-split route occasionally shows a 'ChunkLoadError' for some users after every deployment. How do you handle this at the application level?**
> "This happens because a lazy-loaded chunk's hashed filename changes on each deploy, and a user with the app already open in their browser can attempt to lazy-load a chunk reference that no longer exists on the server after a new deploy has gone out. I'd wrap lazy route boundaries in an error boundary that specifically detects a chunk-load failure and prompts (or automatically triggers) a full page reload to fetch the latest deployed assets, rather than showing a generic broken error screen. Some teams also mitigate this by keeping old chunk versions available on the CDN for a rolling window after each deploy, reducing how often users actually hit a missing chunk in the first place."

**Q3: Your team wants to add `useDeferredValue` to a component but a colleague argues 'it's the same as debouncing the input, why bother with a newer API.' How do you push back with a concrete, demonstrable difference?**
> "I'd demonstrate it with a slow device simulation: debouncing waits a fixed time regardless of whether the device could have kept up sooner, so on a fast machine you're adding artificial latency that didn't need to exist, and on a slow machine, a fixed debounce delay might still not be long enough to avoid jank once the deferred render actually kicks in. `useDeferredValue` instead lets React's scheduler interleave the expensive render with the browser's actual capacity in real time - on a fast device it can catch up almost immediately, and on a slow device it naturally lags further behind without janking the input, adapting either way rather than guessing a delay upfront. I'd show this side by side with CPU throttling in DevTools rather than just asserting it, since the difference is genuinely hard to appreciate without seeing it under load."

**Q4: How would you decide whether a slow list of 500 rows needs virtualization, or whether the 500-row count itself is the actual problem to solve?**
> "I'd ask whether a user genuinely needs to see, scroll through, and interact with all 500 rows in one continuous list, or whether that's an artifact of an API returning everything at once when the UI could reasonably paginate, filter, or search instead. Virtualization solves 'render this list efficiently,' but if 500 rows of raw, unfiltered data isn't actually a good user experience regardless of render performance (nobody scrolls through 500 rows manually to find something), the better fix might be adding search/filtering that reduces the *effective* list size for the user, with virtualization as a secondary safety net rather than the primary solution to what's really an information-architecture problem."

**Q5: A `React.memo`-wrapped component with a custom comparator function is causing a bug where it fails to re-render when it actually should. How do you approach debugging this class of bug?**
> "A custom comparator returning `true` (meaning 'props are equal, skip re-render') when they're actually meaningfully different is the most common cause - I'd start by logging both the previous and next props inside the comparator function to see exactly what it's comparing and why it's concluding they're equal. A frequent root cause is the comparator checking only some of the props (missing a newly-added prop after the component was extended) or doing a shallow comparison on a prop that's actually a deeply-nested object where a meaningful change happened several levels down. The fix is either updating the comparator to cover the new/nested prop correctly, or reconsidering whether a custom comparator is worth maintaining at all versus the default shallow comparison plus restructuring props to be shallowly comparable in the first place."

**Q6: Why might aggressive `useMemo` usage across a codebase make a *future* refactor riskier, beyond the immediate readability cost?**
> "Every `useMemo` dependency array is an implicit contract: 'this value only needs to be recomputed when these specific things change.' When a codebase has `useMemo` everywhere, a future refactor that changes what a computation actually depends on (adding a new input) requires correctly updating every affected dependency array, and missing even one introduces a silent stale-value bug rather than an obvious error - the more `useMemo` calls exist, the larger this surface area of 'things a refactor could silently break' becomes. This is exactly why the chapter's 'measure first' discipline matters longer-term, not just at the moment of writing the code: every unnecessary `useMemo` is a permanent, compounding maintenance liability, not a one-time cost paid once and forgotten."

---

## Mastery checklist

- [ ] I can explain exactly why `React.memo` sometimes "doesn't work" and fix it live.
- [ ] I can articulate two distinct justifications for `useMemo` beyond "it's expensive."
- [ ] I can walk through a React DevTools Profiler session methodology from memory.
- [ ] I can explain list virtualization's mechanism and its real tradeoffs, not just "it's faster."
- [ ] I can spot an accidental request waterfall in a code sample and fix it.
- [ ] I can explain `useTransition`/`useDeferredValue` and when they beat plain debouncing.
- [ ] I have at least 2 concrete, numbers-backed performance stories ready from real projects (even if approximate) to cite when asked "tell me about a performance problem you solved."
