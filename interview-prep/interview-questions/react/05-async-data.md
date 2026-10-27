# React Interview Handbook — 05 Async Data (REACT-201–REACT-250)

React 18+. Compact format. Covers effects, races, server-state caches, Suspense, Server Components, SSR, pagination, and mutation UX.

---

### REACT-201 — Fetching in useEffect: the basic pattern and its pitfalls
**Difficulty:** Junior
**Category:** Async data / Effects
**Question:** How do you fetch data in `useEffect`, and what usually goes wrong with the naive version?
**Answer:** Start the request in the effect, store the result in state, and list every input in the dependency array. The naive version has no cleanup (races, setState after unmount), no error or loading state, no caching or deduping, and it starts only after first paint, which creates waterfalls. It works for small apps but you re-implement server-state concerns by hand.
**Code:**
```jsx
useEffect(() => {
  fetch(`/api/users/${id}`).then(r => r.json()).then(setUser);
}, [id]);
```
**Follow-up:** What does this code not handle?

Answer: Errors, non-2xx responses, loading UI, cancellation, and out-of-order responses when `id` changes.

---

### REACT-202 — Why the effect callback cannot be async
**Difficulty:** Junior
**Category:** Async data / Effects
**Question:** Why can't you write `useEffect(async () => {...})`?
**Answer:** An async function returns a Promise, but React expects the effect to return either nothing or a cleanup function. A Promise would be treated as an invalid cleanup, and React warns about it. Define an async function inside the effect and call it, or use `.then`. The cleanup must stay synchronous so React can run it before the next effect or on unmount.
**Code:**
```jsx
useEffect(() => {
  async function load() { setData(await getData(id)); }
  load();
}, [id]);
```
**Follow-up:** How do you still return a cleanup?

Answer: Return it from the outer effect callback, not from the inner async function.

---

### REACT-203 — Race conditions in fetch effects
**Difficulty:** Intermediate
**Category:** Async data / Race conditions
**Question:** What is a race condition in a fetch effect, and how does it occur?
**Answer:** When `id` changes quickly, request A (old) and request B (new) are both in flight. Responses can arrive out of order, so A may resolve last and overwrite B's data, and the UI shows data for the wrong input. The effect re-ran, but nothing told the old request that it no longer matters. The fix is to cancel or ignore stale requests in cleanup, or to use a library that keys results by input.
**Follow-up:** Is this only a network problem?

Answer: No. Any async work with variable latency, such as debounced search or slow endpoints, can resolve out of order.

---

### REACT-204 — Cancelling requests with AbortController
**Difficulty:** Intermediate
**Category:** Async data / Abort
**Question:** How do you use `AbortController` in an effect, and what must you handle?
**Answer:** Create a controller in the effect, pass `signal` to `fetch`, and call `controller.abort()` in cleanup. This cancels the network request and rejects the promise with an `AbortError`. You must ignore that error so it is not shown as a failure. Aborting saves bandwidth and prevents stale updates, but the server may still process the request, so it is not a substitute for idempotent endpoints.
**Code:**
```jsx
useEffect(() => {
  const ac = new AbortController();
  fetch(url, { signal: ac.signal }).then(r => r.json()).then(setData)
    .catch(e => { if (e.name !== 'AbortError') setError(e); });
  return () => ac.abort();
}, [url]);
```
**Follow-up:** Does abort stop a POST on the server?

Answer: Not reliably. The server may already have received it, so use idempotency keys for writes.

---

### REACT-205 — The ignore-flag pattern
**Difficulty:** Intermediate
**Category:** Async data / Race conditions
**Question:** When would you use an `ignore` flag instead of `AbortController`?
**Answer:** When the async API cannot be aborted, such as a third-party SDK or a plain promise, use a closure variable set to true in cleanup and check it before calling `setState`. It prevents stale writes but doesn't cancel the work. Each effect run gets its own flag, so the latest run is the only one allowed to commit. Prefer `AbortController` when supported since it also saves network.
**Code:**
```jsx
useEffect(() => {
  let ignore = false;
  load(id).then(d => { if (!ignore) setData(d); });
  return () => { ignore = true; };
}, [id]);
```
**Follow-up:** Why is a per-effect flag correct but a ref flag risky?

Answer: A shared ref is overwritten by the next run, so an older response can pass the check. A closure flag is isolated per run.

---

### REACT-206 — Stale closures in async callbacks
**Difficulty:** Intermediate
**Category:** Async data / Closures
**Question:** What is a stale closure in async code, and how does it cause bugs?
**Answer:** Each render creates new functions that capture that render's props and state. A timer, event listener, or promise callback created in an earlier render still sees the old values after they change. For example, `setInterval(() => setCount(count + 1))` keeps using the initial `count`. Fix it with functional updates, correct dependencies, or a ref holding the latest value when you intentionally need non-reactive access.
**Code:**
```jsx
useEffect(() => {
  const t = setInterval(() => setCount(c => c + 1), 1000);
  return () => clearInterval(t);
}, []);
```
**Follow-up:** When is a "latest ref" appropriate?

Answer: For callbacks that must read current values without re-subscribing, like an event handler registered once.

---

### REACT-207 — Dependency arrays and fetch effects
**Difficulty:** Intermediate
**Category:** Async data / Effects
**Question:** Why shouldn't you silence the exhaustive-deps lint rule on a fetch effect?
**Answer:** The rule finds values the effect reads but doesn't declare, which means the effect won't re-run when they change and will use stale values. Typical symptoms: filters change but the list doesn't, or a request uses an old token. If a dependency causes too many runs, fix the cause: move functions inside the effect, memoize object inputs, or use primitives. Suppressing the rule hides real bugs.
**Follow-up:** What if an inline object dep re-triggers the effect every render?

Answer: Depend on its primitive fields, or memoize it with `useMemo` so identity is stable.

---

### REACT-208 — Strict Mode double-invoking effects
**Difficulty:** Intermediate
**Category:** Async data / Strict Mode
**Question:** In development, my fetch effect runs twice. Is it a bug?
**Answer:** No. In React 18 Strict Mode, development mounts, unmounts, and re-mounts each component to expose missing cleanup. Production runs once. The correct response is to make the effect resilient: abort or ignore the first request in cleanup so the second wins. Do not add a "has fetched" ref to hide it, since that breaks real remounts, such as Offscreen or fast refresh. A query library dedupes naturally.
**Follow-up:** Why simulate unmount/remount?

Answer: React may preserve state while hiding and re-showing UI, so effects must be safely repeatable.

---

### REACT-209 — Modeling loading, error, and success states
**Difficulty:** Intermediate
**Category:** Async data / State modeling
**Question:** How should you model request state to avoid impossible combinations?
**Answer:** Avoid separate `loading`, `error`, and `data` booleans that can disagree, such as loading and error both true. Use a single status field with a discriminated union: idle, loading, success with data, or error with error. Render by switching on status. This makes states exhaustive and TypeScript can enforce it. Libraries expose the same idea with `status`, `isPending`, and `isError`.
**Code:**
```ts
type State<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: T };
```
**Follow-up:** Where does "refetching" fit?

Answer: It's a separate flag (`isFetching`) layered on success, since you still have data to show.

---

### REACT-210 — isLoading vs isFetching
**Difficulty:** Intermediate
**Category:** Async data / UX states
**Question:** What is the difference between initial loading and background fetching, and why does the UI care?
**Answer:** Initial loading means there is no data yet, so a skeleton or spinner replaces the content. Background fetching means data exists but is being revalidated, so keep showing it, optionally with a subtle indicator. Treating both as "loading" flashes spinners on every refocus or refetch and hurts perceived performance. Libraries expose them separately, for example `isPending` versus `isFetching` in TanStack Query.
**Follow-up:** What about a failed background refetch?

Answer: Keep the stale data visible and show a non-blocking error or retry affordance.

---

### REACT-211 — Empty state vs loading vs error
**Difficulty:** Junior
**Category:** Async data / UX states
**Question:** Why must "no results" be distinct from "still loading" and "failed"?
**Answer:** `data.length === 0` is only meaningful after a successful response. If you check emptiness before loading completes, users briefly see "No results" and then the list pops in. If a failure is shown as empty, users believe nothing exists. Render in order: error, loading, then empty versus content. Each state needs different copy and actions: retry for errors, a call to action for empty.
**Follow-up:** What default value for `data` causes this bug?

Answer: Defaulting to `[]` makes unloaded data look like an empty list.

---

### REACT-212 — Errors in async code and error boundaries
**Difficulty:** Intermediate
**Category:** Async data / Error handling
**Question:** Do error boundaries catch errors thrown in promises or event handlers?
**Answer:** No. Boundaries catch errors during render, lifecycle, and constructors of their subtree. Errors in event handlers, effects' async callbacks, and timers are not caught. Handle them in `try/catch` or `.catch`, store them in state, and render the error. To route an async error to a boundary, rethrow it during render, for example `setState(() => { throw err; })`. Suspense-based data libraries throw errors during render by design.
**Follow-up:** Where do you place boundaries?

Answer: Around independent regions so one failing widget doesn't blank the whole page.

---

### REACT-213 — Designing query keys
**Difficulty:** Intermediate
**Category:** Async data / Cache keys
**Question:** What makes a good cache key for server data?
**Answer:** The key must uniquely identify the data and include every variable the request depends on: resource, ids, filters, sort, page. When the key changes, the cache treats it as a different entry and fetches or reuses it. Use stable, serializable, hierarchical arrays like `['todos', { status, page }]` so you can invalidate by prefix. Leaving out a variable returns wrong data from cache; including unrelated values fragments the cache.
**Code:**
```js
useQuery({ queryKey: ['todos', { status, page }], queryFn: () => getTodos({ status, page }) });
```
**Follow-up:** Why arrays instead of strings?

Answer: Hierarchical arrays support prefix invalidation and structured params without string concatenation.

---

### REACT-214 — Keys as dependency arrays
**Difficulty:** Intermediate
**Category:** Async data / Cache keys
**Question:** How is a query key similar to an effect dependency array?
**Answer:** Both declare what the async work depends on. In an effect, changing a dep re-runs it; with a query, changing the key switches to another cache entry and fetches if missing or stale. The key also gives caching, deduping, and race safety, because each response is stored under its own key, so a late response cannot overwrite a different key's data. Anything used in `queryFn` should appear in the key.
**Follow-up:** What bug appears if `queryFn` uses a variable that is not in the key?

Answer: Different inputs share one cache entry, so users see stale or wrong data.

---

### REACT-215 — Server state vs client state
**Difficulty:** Intermediate
**Category:** Async data / State architecture
**Question:** What distinguishes server state from client state?
**Answer:** Server state lives remotely, is shared and owned elsewhere, can be changed by others, and is therefore always potentially stale. It needs caching, revalidation, deduping, retries, and invalidation. Client state, such as modal open or form draft, is synchronous, local, and owned by the UI. Mixing them in one store (Redux or context) forces you to hand-write loading flags and sync logic. Use a server-state library for the first and `useState` or a small store for the second.
**Follow-up:** Where does URL state fit?

Answer: It's client state that is shareable and bookmarkable, and often forms part of the query key.

---

### REACT-216 — Why context is the wrong tool for server state
**Difficulty:** Senior
**Category:** Async data / State architecture
**Question:** Why is putting fetched data in React Context usually a mistake?
**Answer:** Context only distributes values; it provides no caching, deduping, invalidation, or retry. You still write the fetch logic, and every consumer re-renders when the value changes, even if it uses one field. Data is tied to the provider's lifetime, so navigation often drops it and refetches. Components can't select slices, and multiple providers duplicate requests. Context fits low-frequency, truly global client values like theme or auth user.
**Trade-offs:** Context is simple for tiny apps; a query cache scales with shared data and reduces boilerplate.
**Follow-up:** Can you fix re-renders with memoization?

Answer: Partly by splitting contexts, but you still lack cache lifecycle and revalidation.

---

### REACT-217 — staleTime
**Difficulty:** Intermediate
**Category:** Async data / TanStack Query
**Question:** What does `staleTime` control?
**Answer:** It's how long fetched data is considered fresh. While fresh, the cache serves it without refetching, even on mount or window focus. After it elapses the data becomes stale: it's still shown instantly, but triggers a background refetch on the next trigger. The default is 0, so data is stale immediately. Increase it for rarely changing data (config, lists), and set it to `Infinity` for static data.
**Follow-up:** Does stale mean removed from cache?

Answer: No. Stale data is still returned and displayed; it's just eligible for revalidation.

---

### REACT-218 — gcTime (formerly cacheTime)
**Difficulty:** Intermediate
**Category:** Async data / TanStack Query
**Question:** What does `gcTime` do, and how does it differ from `staleTime`?
**Answer:** `gcTime` is how long an unused query's data stays in memory after its last observer unmounts, defaulting to 5 minutes. After that it's garbage collected. `staleTime` decides when to refetch; `gcTime` decides when to discard. Keeping `gcTime` greater than `staleTime` lets users navigate back and instantly see cached data while it revalidates. It was renamed from `cacheTime` in v5 to reduce confusion.
**Follow-up:** What happens on return after gc?

Answer: There is no cached data, so the UI shows a loading state until the fetch completes.

---

### REACT-219 — Invalidation
**Difficulty:** Intermediate
**Category:** Async data / TanStack Query
**Question:** What does invalidating a query do, and when do you use it?
**Answer:** Invalidation marks matching cache entries as stale and immediately refetches those that are currently being observed. Inactive ones refetch on next use. Call it after a mutation changes server data, for example invalidating `['todos']` after creating a todo, which also matches `['todos', {page}]` by prefix. It is the simplest way to keep the UI consistent with the server because it uses the server as the source of truth.
**Code:**
```js
queryClient.invalidateQueries({ queryKey: ['todos'] });
```
**Follow-up:** Why not just update the cache by hand?

Answer: You can, but it duplicates server logic and risks drift; invalidation is simpler and safer.

---

### REACT-220 — Automatic refetch triggers
**Difficulty:** Intermediate
**Category:** Async data / Revalidation
**Question:** When do query libraries refetch stale data automatically?
**Answer:** Typically on component mount, window refocus, network reconnect, and optionally on an interval (polling). These triggers match the moments when users are likely to see outdated data. Because only stale data refetches, `staleTime` throttles them. Disable or tune them per query for expensive endpoints, and use `refetchInterval` only when near-real-time updates are required, ideally with a pause when the tab is hidden.
**Follow-up:** Why can refocus refetching be annoying?

Answer: It can cause flicker or overwrite in-progress UI, so it's often paired with a larger `staleTime`.

---

### REACT-221 — Stale-while-revalidate
**Difficulty:** Intermediate
**Category:** Async data / Revalidation
**Question:** What is the stale-while-revalidate strategy?
**Answer:** Return cached data immediately, then fetch fresh data in the background and update when it arrives. The user sees content instantly, and correctness is restored shortly after. It trades guaranteed freshness for responsiveness. HTTP has the same idea in `Cache-Control: stale-while-revalidate`, and SWR and TanStack Query implement it in the client. It fits data where brief staleness is acceptable, not balances or inventory at checkout.
**Follow-up:** When is SWR a poor fit?

Answer: When showing outdated values is harmful, such as payments or stock at purchase time.

---

### REACT-222 — SWR-style hooks
**Difficulty:** Intermediate
**Category:** Async data / Revalidation
**Question:** What does an SWR-style hook give you over a hand-rolled effect?
**Answer:** A key-based shared cache, request deduping across components, revalidation on focus and reconnect, retries with backoff, and race safety. You write `useSWR(key, fetcher)` and get `data`, `error`, and `isLoading`. Components using the same key share one request and update together. It removes most boilerplate, but you still design keys, error handling, and mutation flows.
**Code:**
```jsx
const { data, error, isLoading } = useSWR(['user', id], () => getUser(id));
```
**Follow-up:** How do SWR and TanStack Query differ conceptually?

Answer: Mostly in API breadth; TanStack Query has richer mutation, pagination, and devtools features, while SWR is smaller.

---

### REACT-223 — Mutations
**Difficulty:** Intermediate
**Category:** Async data / Mutations
**Question:** How do mutations differ from queries?
**Answer:** Queries read and are declarative, cached, and auto-refetched. Mutations write (create, update, delete) and are imperative: you trigger them from an event, they are not cached, and they usually aren't retried by default because they may not be idempotent. A mutation exposes pending, error, and success state and callbacks. After success you typically invalidate or update related queries.
**Code:**
```js
const m = useMutation({ mutationFn: createTodo,
  onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }) });
```
**Follow-up:** Why no auto-retry for mutations?

Answer: A retried non-idempotent write could duplicate side effects.

---

### REACT-224 — Optimistic updates
**Difficulty:** Senior
**Category:** Async data / Optimistic UI
**Question:** What is an optimistic update and what steps does it require?
**Answer:** You update the UI as if the mutation had succeeded, before the server responds, then reconcile with the real result. Steps: cancel in-flight queries for that key, snapshot the previous cache, write the optimistic value, run the mutation, roll back from the snapshot on error, and invalidate on settle to sync with the server. It makes UI feel instant but adds complexity and risk of flicker or inconsistency.
**Trade-offs:** Great for likes, toggles, reorder; avoid for payments or actions with likely validation failure.
**Follow-up:** Why cancel in-flight queries first?

Answer: A pending refetch could resolve afterward and overwrite the optimistic value with old data.

---

### REACT-225 — Rolling back failed optimistic updates
**Difficulty:** Senior
**Category:** Async data / Optimistic UI
**Question:** How do you handle failure of an optimistic mutation?
**Answer:** Save the previous data in context during `onMutate`, and restore it in `onError`. Always invalidate in `onSettled` so the cache converges to server truth whether it failed or succeeded. Tell the user: show an error toast and, if needed, preserve their input. With concurrent mutations, rolling back a snapshot can erase other optimistic changes, so prefer invalidation or scope updates to the specific item.
**Follow-up:** What about multiple rapid optimistic edits?

Answer: Serialize them or key mutations per entity, so rollbacks don't clobber newer edits.

---

### REACT-226 — Invalidate vs setQueryData after a mutation
**Difficulty:** Senior
**Category:** Async data / Mutations
**Question:** After a mutation, should you invalidate queries or write the response into the cache?
**Answer:** Invalidate when the server may change other derived data (lists, counts, sorting) because refetching guarantees correctness at the cost of an extra request. Write directly with `setQueryData` when the response returns the full updated entity and only that entry is affected, saving a round trip and avoiding flicker. Often combine both: set the detail entry from the response, invalidate lists.
**Follow-up:** Risk of manual writes?

Answer: Client logic can diverge from server rules like ordering, filters, or computed fields.

---

### REACT-227 — Request deduping
**Difficulty:** Intermediate
**Category:** Async data / Caching
**Question:** What is request deduping and how do query libraries achieve it?
**Answer:** When several components request the same key at roughly the same time, only one network request is made and all subscribers share the result. The cache stores the in-flight promise under the key. This lets components fetch their own data locally without prop drilling or fear of duplicate calls. Raw `useEffect` fetching has no deduping, so N components trigger N requests.
**Follow-up:** How does deduping interact with Strict Mode?

Answer: The remount's request reuses the in-flight one, so you don't see double fetches in the network tab.

---

### REACT-228 — Request waterfalls
**Difficulty:** Senior
**Category:** Async data / Performance
**Question:** What is a fetch waterfall and why is it common in React?
**Answer:** A waterfall occurs when requests run sequentially because each starts only after the previous one finishes. In React it arises when a child component fetches in an effect: the child doesn't mount until the parent finishes loading and renders, so its request starts late. Nested components multiply latency. Fixes: hoist fetches, start requests in parallel, prefetch in route loaders, or fetch on the server.
**Follow-up:** Is every sequential fetch a waterfall problem?

Answer: No. Truly dependent data, like needing a user id to fetch their posts, must be sequential; the problem is accidental sequencing.

---

### REACT-229 — Parallel fetching
**Difficulty:** Intermediate
**Category:** Async data / Performance
**Question:** How do you fetch independent data in parallel?
**Answer:** Start all requests at the same time instead of waiting for each. In plain code use `Promise.all`. With a query library, call several `useQuery` hooks in the same component or use `useQueries`, so they all fire on mount. For route-level data, kick off requests in a loader before rendering. Parallel loading reduces total time to the slowest request instead of the sum.
**Code:**
```js
const [user, posts] = await Promise.all([getUser(id), getPosts(id)]);
```
**Follow-up:** What does `Promise.all` do if one rejects?

Answer: It rejects immediately; use `Promise.allSettled` if you want partial results.

---

### REACT-230 — Dependent queries
**Difficulty:** Intermediate
**Category:** Async data / Query control
**Question:** How do you handle a query that depends on another query's result?
**Answer:** Disable it until its inputs exist using an `enabled` flag, for example `enabled: !!userId`. It stays idle, then fires once the prerequisite data arrives. Put the dependency in the key. This is a legitimate waterfall, so consider whether the backend could return the combined data in one call or expose the needed id earlier to avoid the extra round trip.
**Code:**
```js
useQuery({ queryKey: ['projects', userId], queryFn: () => getProjects(userId), enabled: !!userId });
```
**Follow-up:** What status does a disabled query report?

Answer: It remains pending but not fetching; check `fetchStatus` to distinguish idle from loading.

---

### REACT-231 — Prefetching
**Difficulty:** Intermediate
**Category:** Async data / Performance
**Question:** What is prefetching, and where is it useful?
**Answer:** Prefetching loads data into the cache before the user needs it, so navigation feels instant. Typical triggers: hovering a link, route transitions, or after loading a list item's neighbors. In TanStack Query, `queryClient.prefetchQuery` fills the cache under the same key the page will use. Choose triggers carefully: aggressive prefetch wastes bandwidth and server load, and prefetched data needs a `staleTime` or it refetches on mount.
**Follow-up:** Why does `staleTime` matter here?

Answer: With the default of 0, prefetched data is immediately stale and the page refetches anyway.

---

### REACT-232 — Suspense for data fetching
**Difficulty:** Senior
**Category:** Async data / Suspense
**Question:** How does Suspense support data fetching?
**Answer:** A component can suspend by throwing a pending promise during render (or using `use`). React shows the nearest `<Suspense fallback>` and retries when the promise resolves. This replaces manual `isLoading` checks and lets you declare loading boundaries independently of the data code. React doesn't provide a fetching or caching API itself; you need a Suspense-compatible library or framework that caches the promise.
**Code:**
```jsx
<Suspense fallback={<Skeleton />}>
  <Profile id={id} />
</Suspense>
```
**Follow-up:** Why can't I just `throw fetch()` in render?

Answer: A new promise per render never resolves into a cached value, causing an infinite suspend loop.

---

### REACT-233 — The use hook
**Difficulty:** Senior
**Category:** Async data / Suspense
**Question:** What does `use(promise)` do in React 19, and what are its rules?
**Answer:** `use` reads a promise (or context) during render. If the promise is pending, the component suspends; if rejected, the nearest error boundary handles it; if fulfilled, it returns the value. Unlike hooks, it can be called conditionally or in loops. The promise must be stable across renders, so create it outside render, in a cache, or in a Server Component and pass it down.
**Code:**
```jsx
function Comments({ promise }) {
  const comments = use(promise);
  return comments.map(c => <p key={c.id}>{c.text}</p>);
}
```
**Follow-up:** Why must the promise be stable?

Answer: A fresh promise each render restarts suspending and never settles into stable output.

---

### REACT-234 — Promises created during render
**Difficulty:** Senior
**Category:** Async data / Suspense
**Question:** What's wrong with `use(fetch(url))` inside a Client Component?
**Answer:** Each render creates a new promise, so React suspends on it, re-renders when it resolves, creates another new promise, and loops. React warns that uncached promises are unsupported in Client Components. Create the promise in a Server Component, a router loader, or a cache keyed by input (for example via `cache` or a library), then pass it down. Libraries wrap this to make it safe.
**Follow-up:** Does Server Component promise creation have this problem?

Answer: No. Server render runs once per request, so the promise is created once and serialized to the client.

---

### REACT-235 — Suspense plus error boundaries
**Difficulty:** Intermediate
**Category:** Async data / Suspense
**Question:** How do you structure loading and error handling with Suspense?
**Answer:** Suspense handles the pending state and error boundaries handle failures, so you wrap data-reading components in both. The boundary catches thrown errors, and you offer a retry that resets it and refetches (for example, `QueryErrorResetBoundary` with `react-error-boundary`). Place pairs around independent regions so each can load or fail on its own, avoiding a single page-wide spinner or crash.
**Follow-up:** How granular should boundaries be?

Answer: Group content that should appear together; separate parts that can stream independently.

---

### REACT-236 — Transitions and deferred values with data
**Difficulty:** Senior
**Category:** Async data / Concurrent rendering
**Question:** How do `startTransition` and `useDeferredValue` improve data-driven UIs?
**Answer:** When a state change causes a suspending component to render, React normally replaces the UI with the fallback. Wrapping the update in `startTransition` marks it non-urgent, so React keeps the old UI visible until the new one is ready and exposes `isPending`. `useDeferredValue` does similar for a value: the input stays responsive while lists or results render with the lagging value. Both avoid jarring spinners on navigation or search.
**Follow-up:** How do you signal "updating" with deferred value?

Answer: Compare the deferred value with the current one; if they differ, the view is stale.

---

### REACT-237 — Data fetching in Server Components
**Difficulty:** Senior
**Category:** Async data / Server Components
**Question:** How do Server Components change data fetching?
**Answer:** Server Components can be `async`, so they `await` data directly (database, internal API) during server render, with no effect, client state, or API round trip from the browser. Only the rendered output is sent, so fetching code and secrets stay off the client and bundle size drops. They can't use state or effects. Fetching near the component that needs it is fine because frameworks dedupe and cache requests.
**Code:**
```jsx
export default async function Page({ params }) {
  const post = await db.posts.get(params.id);
  return <Post post={post} />;
}
```
**Follow-up:** Do Server Components remove the need for client data libraries?

Answer: Not entirely; interactive, frequently changing, or user-driven data still benefits from client caching.

---

### REACT-238 — Server vs client data placement
**Difficulty:** Staff
**Category:** Async data / Server Components
**Question:** How do you decide what data to fetch on the server versus in the client?
**Answer:** Fetch on the server for initial, SEO-relevant, or secret-dependent data to avoid waterfalls and keep tokens private. Fetch on the client for user-triggered, real-time, or frequently refreshed data, plus mutations. A hybrid is common: the server fetches initial data and passes it to a client component, or passes a promise that the client reads with `use`. Watch the serialization boundary: only serializable props cross it.
**Trade-offs:** Server fetch improves first paint but ties to request latency; client fetch gives interactivity but costs another round trip.
**Follow-up:** How do you pass server data to a client cache?

Answer: Dehydrate it on the server and hydrate it into the client query cache, or use it as initial data.

---

### REACT-239 — SSR and data
**Difficulty:** Senior
**Category:** Async data / SSR
**Question:** How is data handled across server rendering and hydration?
**Answer:** On the server you fetch data, render HTML with it, and serialize that data into the page. On the client, React hydrates the HTML and must render the same output on first pass, so the client state must start from the serialized data, not refetch and render a loading state. Effects don't run on the server, so effect-fetching never produces SSR data. Use a framework loader, Server Components, or a hydrated query cache.
**Follow-up:** Why doesn't `useEffect` fetching work for SEO?

Answer: Effects run only in the browser, so the initial HTML has no data for crawlers or first paint.

---

### REACT-240 — Hydration mismatches from data
**Difficulty:** Senior
**Category:** Async data / Hydration
**Question:** What causes data-related hydration mismatches, and how do you fix them?
**Answer:** The client's first render differs from the server HTML. Common causes: `Date.now()`, random ids, locale or timezone formatting, reading `localStorage` or `window` during render, and the client starting with empty data while the server rendered populated data. Fix by serializing the server's values, rendering deterministic output first and updating in an effect, using `useId`, or marking an element `suppressHydrationWarning` for harmless text only.
**Follow-up:** What happens on mismatch in React 18?

Answer: React logs an error and falls back to client-rendering the affected Suspense boundary or tree, hurting performance.

---

### REACT-241 — Dehydrate and hydrate a query cache
**Difficulty:** Staff
**Category:** Async data / SSR
**Question:** How do you share server-prefetched data with a client query cache?
**Answer:** On the server, create a query client per request, prefetch the needed queries, and dehydrate the cache into serializable state. Send it to the client and wrap the app in a hydration boundary. The client cache starts populated using the same keys, so components render immediately without a loading state, then follow normal `staleTime` rules. Create the client per request, never a module singleton, to avoid leaking data between users.
**Follow-up:** Why per-request clients?

Answer: A shared server-side cache would expose one user's data to another.

---

### REACT-242 — Page-based pagination
**Difficulty:** Intermediate
**Category:** Async data / Pagination
**Question:** How do you implement paginated lists without UI flashing between pages?
**Answer:** Put the page in the query key so each page is cached separately. When the key changes, there is no data for the new page, which would flash a loading state. Keep the previous page's data visible while the next loads using `placeholderData: keepPreviousData` (v5) and show `isPlaceholderData` to dim the list. Prefetch the next page for snappier navigation, and disable "next" while placeholder data is shown.
**Code:**
```js
useQuery({ queryKey: ['items', page], queryFn: () => getItems(page), placeholderData: keepPreviousData });
```
**Follow-up:** Why disable "next" on placeholder data?

Answer: The shown page isn't the requested one yet, so counts or `hasMore` could be wrong.

---

### REACT-243 — Infinite queries
**Difficulty:** Senior
**Category:** Async data / Pagination
**Question:** How does an infinite query differ from a normal paginated query?
**Answer:** An infinite query stores all loaded pages under one key as an ordered list. You supply `getNextPageParam` (a cursor or page number derived from the last page) and call `fetchNextPage` to append. Refetching refetches pages sequentially, so keep `maxPages` and page size sensible. Render by flattening pages. It suits feeds and endless lists, while discrete pages with URLs suit navigation and shareability.
**Follow-up:** Why can refetching many pages be expensive?

Answer: Each loaded page is refetched in order to keep the list consistent, so cost grows with depth.

---

### REACT-244 — Offset vs cursor pagination
**Difficulty:** Senior
**Category:** Async data / Pagination
**Question:** Why do infinite feeds usually use cursor pagination rather than offset?
**Answer:** Offset (`page=3`) breaks when items are inserted or deleted between requests: you get duplicates or skip rows. It also gets slower on large tables. Cursor pagination asks for items after a stable marker, like an id or timestamp, which stays consistent under changes and scales with indexes. The downside is no random jump to page N. React clients should treat the cursor as opaque and pass it via `pageParam`.
**Follow-up:** When is offset fine?

Answer: For small, mostly static data where users jump to specific page numbers.

---

### REACT-245 — Infinite scroll trigger
**Difficulty:** Intermediate
**Category:** Async data / Pagination
**Question:** How do you trigger loading the next page on scroll?
**Answer:** Place a sentinel element at the end of the list and observe it with `IntersectionObserver`, calling `fetchNextPage` when it enters the viewport and there is a next page. Guard against duplicate calls with `isFetchingNextPage`. Avoid scroll listeners, which fire constantly. For very long lists, add virtualization so DOM size stays bounded, and provide a visible error and retry control if loading fails.
**Follow-up:** Why also virtualize?

Answer: Thousands of rendered rows slow layout and memory regardless of how efficiently data loads.

---

### REACT-246 — Form submit with a mutation
**Difficulty:** Intermediate
**Category:** Async data / Forms
**Question:** What UX states should a form submitting through a mutation handle?
**Answer:** Disable the submit button and show pending feedback while the request runs to prevent double submits. Surface field-level validation errors from the server next to inputs, and general failures in an accessible alert. Preserve user input on error. On success, reset or navigate and invalidate affected queries. Prevent default, keep the form usable by keyboard, and consider idempotency keys for safe retries.
**Code:**
```jsx
<form onSubmit={e => { e.preventDefault(); mutate(values); }}>
  <button disabled={isPending}>{isPending ? 'Saving…' : 'Save'}</button>
</form>
```
**Follow-up:** Is disabling the button enough to prevent duplicates?

Answer: Not alone; the server should also be idempotent since users can retry or double-submit across tabs.

---

### REACT-247 — useActionState and useFormStatus
**Difficulty:** Senior
**Category:** Async data / Forms
**Question:** What do `useActionState` and `useFormStatus` provide in React 19?
**Answer:** Forms accept a function as `action`. `useActionState(action, initial)` returns the latest result state, a wrapped action, and a pending flag, which suits returning validation errors from the server. `useFormStatus` lets a child, like a submit button, read the parent form's pending state without prop drilling. Actions run inside transitions, and uncontrolled inputs reset after success. They simplify progressive enhancement with Server Actions.
**Code:**
```jsx
const [state, formAction, pending] = useActionState(save, { error: null });
return <form action={formAction}>...</form>;
```
**Follow-up:** Does `useFormStatus` work in the same component as the form?

Answer: No. It must be called from a component rendered inside the form.

---

### REACT-248 — useOptimistic
**Difficulty:** Senior
**Category:** Async data / Optimistic UI
**Question:** What does `useOptimistic` do?
**Answer:** It returns a temporary state derived from real state plus pending optimistic changes. Inside an action or transition you call its setter to show the expected result immediately; when the action finishes, React discards the optimistic layer and renders the real state. If the action fails, the UI reverts automatically, with no manual rollback. It's built for form and Server Action flows; cache libraries use their own mechanisms.
**Follow-up:** What if the server returns a different result than expected?

Answer: Once the action settles, the UI shows the real state, replacing the optimistic guess.

---

### REACT-249 — Retries and error classification
**Difficulty:** Senior
**Category:** Async data / Error handling
**Question:** How should a data layer decide when to retry a failed request?
**Answer:** Retry transient failures: network errors, timeouts, 502/503/504, and 429 honoring `Retry-After`. Use exponential backoff with jitter and a low cap. Do not retry 4xx client errors like 400, 401, 403, or 404, since results won't change; handle 401 via re-auth. Reads can retry freely; writes only if idempotent. Surface a manual retry after automatic attempts are exhausted.
**Trade-offs:** More retries hide blips but delay error feedback and can amplify load during outages.
**Follow-up:** Why add jitter?

Answer: It spreads retries over time so many clients don't hit the server simultaneously.

---

### REACT-250 — Debounced search with async data
**Difficulty:** Intermediate
**Category:** Async data / Search UX
**Question:** How do you build a search box that doesn't spam the API or show stale results?
**Answer:** Keep the input state immediate and derive a debounced value (or use `useDeferredValue`) that goes into the query key. Only the settled value triggers requests. Keyed caching handles races, so a slow earlier response can't replace the current one. Use `enabled` to skip empty queries, keep previous data to avoid flashing, and cancel in-flight requests via the signal passed to `queryFn`. Handle empty and error states distinctly.
**Follow-up:** Debounce vs `useDeferredValue`?

Answer: Debounce reduces network calls with a time delay; `useDeferredValue` reduces render work but doesn't limit requests.
