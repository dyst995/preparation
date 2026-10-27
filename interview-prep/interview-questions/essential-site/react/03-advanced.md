# Essential React — Advanced

3-day essential set. 20 questions in preparation order. Full handbook remains under `react/`.

### REACT-017 — Render can yield; commit runs through

**Difficulty:** Advanced

**Category:** Fiber

**Question:**

Under concurrent rendering, a transition render is in progress and the user clicks. What happens to the in-progress render? Mid-commit? Do effect cleanups run for a thrown-away render?

**Answer:**

While a transition render is in progress, React can pause it and handle the urgent click first. It may then throw away the partial work and start over later. The screen keeps showing the last committed result.

Once React starts a commit, it does not yield. DOM updates, refs, and layout effects finish in one go.

A discarded render never reached commit, so its effects never ran, and there is nothing to clean up. But anything you started inside the component body, like a fetch, has no cleanup. That is another reason to keep render pure.

**Follow-up:**

Why does Strict Mode remount effects on mount if discarded renders never run effects?

Answer: It is a separate mechanism. In development, Strict Mode mounts, cleans up, and mounts again, to catch missing cleanups. It has nothing to do with the scheduler abandoning work. Production mounts once.

### REACT-044 — An urgent update and a transition are two passes

**Difficulty:** Senior

**Category:** Scheduling

**Question:**

`setQuery(event.target.value)` then `startTransition(() => setResults(filter(...)))`. One render like two ordinary setters? What can the screen show? If `setQuery` moves inside the transition?

**Answer:**

No, these are not one batch, because the two updates have different priorities. `setQuery` is urgent, and `setResults` is a transition. React can commit the input first and render the list afterward. For a moment, the screen may show the new query with the old results. A newer keystroke can abandon the in-progress list render.

Both lines read the same `event.target.value`, so they see the same string.

If you move `setQuery` into the transition, the input itself becomes laggy. `isPending` only reflects the transition, not any network request.

**Code:**

```tsx
const next = event.target.value;
setQuery(next);
startTransition(() => setResults(filter(next)));
```

**Follow-up:**

Transition list throw after input already committed. Input revert? Where does error surface?

Answer: The input stays as typed. React retries the failed transition synchronously and reports the error. A boundary around the list can show a fallback without undoing the query.

### REACT-095 — startTransition does not follow an await

**Difficulty:** Senior

**Category:** Scheduling

**Question:**

`startTransition(async () => { setQuery(next); const rows = await search(next); setRows(rows); })`. When is `isPending` true, and which `setRows` is a transition?

**Answer:**

Only state updates made synchronously inside the callback are part of the transition. `setQuery` is. After the `await`, `setRows` runs outside the callback, so it is a normal urgent update.

`isPending` only tracks the transition render, not network time, so it can become false while the search is still running.

For a loading spinner, use a separate status state. If the list update should be interruptible, wrap `setRows` in another `startTransition` after the await.

If the input must respond immediately, set the query outside the transition.

**Code:**

```tsx
setQuery(next);
setStatus("loading");
const rows = await search(next);
startTransition(() => setRows(rows));
setStatus("ready");
```

**Follow-up:**

`setStatus("ready")` urgent, `setRows` in transition, slow list—what can the user see?

Answer: The status says "ready" while the previous rows are still showing, until the transition commits. If those should change together, put both updates in the same transition.

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

### REACT-196 — Composing server into client
**Difficulty:** Staff
**Category:** Server Components
**Question:** How can a Client Component render Server Component content?
**Answer:** A Client Component can't import a Server Component. But a parent Server Component can pass one in as `children` or another prop. The Client Component then renders the already-prepared server output in that slot. This lets me wrap server-rendered content with client features, like modals, tabs, or context providers, without moving that content into the client bundle.
**Code:** `<ClientTabs><ServerPanel /></ClientTabs>`
**Follow-up:** How do client-only providers fit in a server layout?

Answer: Put them inside a small client component, such as `Providers`, that the server layout uses and that passes `children` through.

---

### REACT-238 — Server vs client data placement
**Difficulty:** Staff
**Category:** Async data / Server Components
**Question:** How do you decide what data to fetch on the server versus in the client?
**Answer:** I fetch on the server for initial data, SEO-relevant data, or anything needing secrets. That avoids waterfalls and keeps tokens private. I fetch on the client for user-triggered, real-time, or frequently refreshed data, and for mutations. A hybrid is common: the server fetches the initial data and passes it to a client component, or passes a promise that the client reads with `use`. I also watch the serialization boundary, since only serializable props can cross it.
**Trade-offs:** Server fetch improves first paint but ties to request latency; client fetch gives interactivity but costs another round trip.
**Follow-up:** How do you pass server data to a client cache?

Answer: Dehydrate it on the server and hydrate it into the client query cache, or use it as the initial data.

---

### REACT-234 — Promises created during render
**Difficulty:** Senior
**Category:** Async data / Suspense
**Question:** What's wrong with `use(fetch(url))` inside a Client Component?
**Answer:** Every render creates a new promise. React suspends on it, re-renders when it resolves, then creates another new promise, and the cycle repeats. React warns that uncached promises aren't supported in Client Components. The promise should be created in a Server Component, a router loader, or a cache keyed by input, for example with `cache` or a library, and then passed down. Libraries wrap this to make it safe.
**Follow-up:** Does Server Component promise creation have this problem?

Answer: No. Server rendering runs once per request, so the promise is created once and sent to the client.

---

### REACT-086 — The aborted request's finally clears the next loading flag

**Difficulty:** Senior

**Category:** Effects

**Question:**

`userId` `"a"` → `"b"` mid-flight. `"b"` started; `"b"` not resolved yet. What is `loading`, and which callback set it, if `finally` always `setLoading(false)`?

**Answer:**

`loading` ends up as `false` while request `"b"` is still running. When `"b"` started, it set loading to `true`. Then the aborted request for `"a"` finished, and its `finally` block set loading to `false`.

Catching `AbortError` does not skip `finally`.

Fix it by skipping the update in `finally` when `controller.signal.aborted` is true. Or derive loading from the data, such as `snapshot?.userId !== userId`, so there is no flag to clear.

Also create a new `AbortController` for each effect run.

**Follow-up:**

`useRef(new AbortController())` aborted on every cleanup. What does `"b"` fetch do?

Answer: It starts already aborted, because an `AbortController` cannot be reset after `abort()`. Create a new controller inside each effect run.

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

### REACT-047 — A portal moves the DOM node, not the fiber

**Difficulty:** Advanced

**Category:** Portals

**Question:**

`createPortal(<Dialog />, document.body)`. Dialog state/context? Parent `onClick` vs native listener on the React root DOM node? Parent re-render—state kept?

**Answer:**

A portal changes where the DOM nodes are placed, not where the component sits in the React tree. The dialog's React parent is still the component that rendered the portal, so context and error boundaries work as usual. State survives parent re-renders as long as the type and key stay the same.

React events bubble through the React tree, so a parent's `onClick` still fires.

Native DOM listeners behave differently. A listener on the React root container will not see clicks from `body`, but a listener on `document` will.

**Code:**

```tsx
return createPortal(children, document.body);
```

**Follow-up:**

Same element rendered through portal and as a normal child. Shared state?

Answer: No. They are in two different positions in the tree, so React creates two separate instances. The portal only changes the DOM parent of its own position.

### REACT-225 — Rolling back failed optimistic updates
**Difficulty:** Senior
**Category:** Async data / Optimistic UI
**Question:** How do you handle failure of an optimistic mutation?
**Answer:** In `onMutate`, I save the previous data and return it as context. In `onError`, I restore it. In `onSettled`, I always invalidate, so the cache ends up matching the server whether the mutation succeeded or failed. I also tell the user, for example with an error toast, and keep their input if needed. With several mutations at once, restoring a snapshot can erase other optimistic changes, so I'd prefer invalidation or limit updates to the specific item.
**Follow-up:** What about multiple rapid optimistic edits?

Answer: Run them one at a time, or key mutations per item, so a rollback doesn't wipe out newer edits.

---

### REACT-319 — How the client boundary spreads

**Difficulty:** Senior
**Category:** Server Components

**Question:**
You add `'use client'` to one file and the bundle jumps. What happened?

**Answer:**
`'use client'` marks a module boundary. It is wider than the single component in that file. Once a file is in the client graph, every module it imports joins that graph unless you keep those imports on the server side of the boundary. That is why a convenience import of a date formatter or a design-system barrel can accidentally ship a large dependency to the browser. I check the import direction when I add the directive. Shared pure helpers can be imported from both sides if they avoid pulling in server-only or client-only code.

**Follow-up:**
How would you confirm the boundary is the cause?

Answer: I inspect the client bundle for that route and look for modules that should have stayed on the server. If a data-formatting package appears there, an import crossed the boundary and needs to move back above it.

### REACT-198 — Custom hook design
**Difficulty:** Senior
**Category:** Refactoring
**Question:** What makes a custom hook a good architectural unit?
**Answer:** A good hook has one clear job, a small and stable return value, no hidden global dependencies, and a name that describes intent, like `useCheckoutForm` rather than `useStuff`. It should hide implementation details, such as which library or endpoint is used, behind domain terms. It takes parameters instead of reading hidden state, so it's easy to test with `renderHook`. I avoid hooks that bundle unrelated concerns.
**Follow-up:** Do hooks share state between components?

Answer: No. Each call creates its own state. To share state, you need context, a store, or a cache.

---

### REACT-050 — The sort wrote through the state array

**Difficulty:** Staff-Level

**Category:** State

**Question:**

Render mutates `people.sort(...)` when `sort === "name"`; `people` is the module `initial` array. Toggle sort to name then back to id; Reset with `setPeople(initial)`. Why list stuck? Why keys aren’t the bug? Fix?

**Answer:**

`Array.prototype.sort` sorts in place. Since `people` is the shared `initial` array, sorting during render rewrites that array itself. Switching the flag back does not restore the original order, because the data is already changed.

Reset also does nothing: `setPeople(initial)` passes the same reference, so React bails out, and there is no untouched copy left.

Keys are not the problem, because rows have no state to mix up.

Fix it by sorting a copy: `[...people].sort(...)`, initialize with a copy, and reset with a fresh copy. Never mutate state during render.

**Code:**

```tsx
const shown =
  sort === "name"
    ? [...people].sort((p, q) => p.name.localeCompare(q.name))
    : people;
```

**Follow-up:**

Handler does `setPeople([...people].sort(...))` but the render `people.sort` block remains. Still wrong?

Answer: Yes. The render still mutates whatever is in state when the flag is `"name"`. Remove the mutation in the body. Either derive a sorted copy from the flag, or let the handler own the order, but not both.

### REACT-296 — Custom widgets: combobox, select, tabs
**Difficulty:** Staff
**Category:** ARIA patterns
**Question:** Should you build custom comboboxes/selects/tabs yourself? How do you approach it?
**Answer:** Rarely. These widgets need exact roles and states, keyboard behavior, focus handling, and screen reader testing. A combobox, for example, needs `role="combobox"`, `aria-expanded`, `aria-controls`, and `aria-activedescendant`. I prefer a native `<select>` when possible. Otherwise I use a headless library, such as React Aria, Radix, Headless UI, or Ariakit, that follows the WAI-ARIA Authoring Practices and lets me style it. If I do build one, I follow those practices exactly and test with VoiceOver or NVDA.
**Trade-offs:** Libraries cost dependency/bundle and some design constraints but remove a large class of accessibility bugs.
**Follow-up:** Why is native `<select>` often still best?

Answer: It's accessible, mobile-friendly, and works fully with the keyboard out of the box. The cost is limited styling.

### REACT-445 — Mutually exclusive props
**Difficulty:** Senior
**Category:** Props
**Question:**
How do you type props that cannot be combined, such as `href` together with `onClick` for two different kinds of control?

**Answer:**
Use a union of object types, with one member for each valid combination. A link member has a `kind` of `"link"` and a required `href`. A button member has a `kind` of `"button"` and a required `onClick`. Shared fields such as `label` go on both members. TypeScript then rejects a call that sets `href` and `onClick` together. One interface full of optional fields would allow that mix. The pattern stays readable for two or three modes. Past that, smaller components are easier to explain than a long union.

**Code:**
```tsx
type ControlProps =
  | { kind: "link"; href: string; label: string }
  | { kind: "button"; onClick: () => void; label: string };
```

**Follow-up:**
Can you omit `kind` and still tell the variants apart?

Answer: Sometimes, if one side has `href: string` and the other omits `href`. A shared literal such as `kind` is easier to narrow and produces clearer errors.

### REACT-473 — Storing tokens: memory vs cookie

**Difficulty:** Senior

**Category:** security client

**Question:**

Where should a React SPA store auth tokens in production, and what are the trade-offs?

**Answer:**

Memory (in-app state) reduces persistence XSS theft after refresh but forces silent re-auth or refresh flows. HttpOnly Secure SameSite cookies keep tokens off `document.cookie` and pair well with BFF patterns, though CSRF must be handled deliberately. localStorage is convenient and commonly stolen via XSS. Prefer cookies plus backend session, or short-lived access tokens in memory with rotating refresh. Trade-off: SPA purity versus security posture. Failure mode: long-lived JWTs in localStorage with a single XSS becoming full account takeover across devices.

**Follow-up:**

Why are HttpOnly cookies resistant to XSS token theft?

Answer: JavaScript cannot read HttpOnly cookies, so injected scripts cannot exfiltrate the token via `document.cookie`.

### REACT-493 — Long tasks and INP in React UIs

**Difficulty:** Senior

**Category:** performance ops

**Question:**

How do long tasks on the main thread hurt INP in production React apps, and what do you do?

**Answer:**

INP suffers when click handlers or heavy renders block input for hundreds of milliseconds on real devices. Profile with the Performance panel, split work with `startTransition`, defer non-urgent updates, virtualize huge lists, and move pure computation off-thread when warranted. Result: buttons feel instant even if secondary data continues loading. Trade-off: transitions add pending UI states you must design for. Failure mode: JSON-parsing a huge payload synchronously in a click handler on every filter keystroke, freezing the UI for mid-tier phones.

**Follow-up:**

When is `startTransition` the wrong tool?

Answer: When the update is truly urgent user feedback—typing into an input—where deferring the value itself feels broken.
