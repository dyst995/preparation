# Essential React — Important

3-day essential set. 30 questions in preparation order. Full handbook remains under `react/`.

### REACT-007 — Updates in one batch run in order

**Difficulty:** Senior

**Category:** State

**Question:**

`count` is `5`. Three click handlers: `plain` does `setCount(count + 1)` twice; `functional` does `setCount(c => c + 1)` twice; `mixed` does updater, then `setCount(count + 1)`, then updater. What is `count` after each?

**Answer:**

React queues updates and applies them in order on the next render. A plain value replaces whatever result is pending. An updater function receives the pending result and returns the next one.

`plain` ends at `6`, because both calls compute from the same `5`. `functional` ends at `7`, because the second updater starts from `6`.

`mixed` goes to `6` with the first updater, then the plain value `count + 1` replaces it with `6` again, and the last updater makes it `7`. Plain values use this render's snapshot. Updaters use the pending state.

**Follow-up:**

If `mixed` used two different slots, does one see the other's pending value?

Answer: No. Each state slot has its own queue. They are processed in the same batch and commit together, but one does not feed into the other. If one value depends on another, derive it during render.

### REACT-014 — Two conditional slots are two positions

**Difficulty:** Senior

**Category:** State preservation

**Question:**

`Editor` drafts from `doc.text`. Compare ternary switching `docA`/`docB`, two `&&` editors, and one `<Editor doc={tab === "a" ? docA : docB} />` when switching A→B→A.

**Answer:**

With the ternary or the single `<Editor doc={...}>`, there is only one position, so React keeps the same instance. The draft was initialized from A, so it stays even after the props describe B.

With two `&&` editors, there are two separate positions. Switching unmounts one and mounts the other. When you return to A, it re-reads `docA.text`, and whatever you typed is gone.

To remount per document, use `key={doc.id}`. To keep drafts, lift a map of drafts by id above the switch.

**Code:**

```tsx
<Editor key={tab} doc={tab === "a" ? docA : docB} />
```

**Trade-offs:**

CSS-hidden dual editors keep both drafts (and effects). Parent `Record<id, draft>` keeps drafts without a hidden tree.

**Follow-up:**

`Editor` moves from under `TabPanelA` to under `TabPanelB`. Does the draft move?

Answer: No. State belongs to the instance at a specific place in the tree. Moving it under a different parent destroys the old instance and creates a new one. Lift the state above both panels if it must survive.

### REACT-059 — The in-flight request has to be dropped

**Difficulty:** Senior

**Category:** Effects

**Question:**

`userId` goes `"a"` → `"b"` before `"a"` resolves. Effect lists `[userId]` with no cleanup. Both responses arrive, `"a"` last. What shows? What does cleanup change? What does Strict Mode add?

**Answer:**

React does not cancel a fetch when the dependency changes. If the response for `"a"` arrives last, it overwrites the state, and the screen shows user A while the page is on user B. This is a race condition.

A cleanup function fixes it. It runs before the next effect and can abort the old request or set an ignore flag so the old response is dropped. Aborting is better when the API supports a signal.

In development, Strict Mode runs the first mount's cleanup, so the first request is aborted too. Do POSTs in handlers, not effects.

**Code:**

```tsx
useEffect(() => {
  const c = new AbortController();
  fetch(`/users/${userId}`, { signal: c.signal })
    .then((r) => r.json())
    .then(setUser)
    .catch((e) => {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e);
    });
  return () => c.abort();
}, [userId]);
```

**Follow-up:**

Ignore-flag cleanup: can `"a"`’s `then` still run after `"b"` wrote state?

Answer: Yes, the callback still runs, so it must check the flag and return without calling `setUser` or `setError`. Aborting and ignoring `AbortError` is cleaner when the API supports the signal.

### REACT-002 — Props are owned by the parent

**Difficulty:** Intermediate

**Category:** Props

**Question:**

Who owns a prop value? What happens if the child writes `props.title = "Edited"`, or if it does `const [title, setTitle] = useState(props.title)` and the parent later passes a new title?

**Answer:**

The parent owns a prop. The child only reads it on each render. If the child tries to assign `props.title`, React throws an error in development because props are frozen, and the parent never sees the change. Mutating a nested object inside props can still leak back, so avoid that too.

`useState(props.title)` only uses the prop as the starting value. When the parent later passes a new title, the state keeps the old one until you call `setTitle` or remount the component with a different `key`. Use that pattern only when the prop is meant to be an initial value.

**Code:**

```tsx
function Field({ title }: { title: string }) {
  const [draft, setDraft] = useState(title); // stays at first title
  return <input value={draft} onChange={(e) => setDraft(e.target.value)} />;
}
```

**Trade-offs:**

Controlled `value`/`onChange` when the parent must see every change; keyed remount when a new entity should discard the draft.

**Follow-up:**

When is storing a prop in state a real API, rather than a stale copy?

Answer: When the prop is clearly documented as an initial value, like `defaultValue`. If callers need live updates, make the component controlled with `value` and `onChange`, or change its `key` to reset it.

### REACT-063 — A ref keeps the latest value for a later callback

**Difficulty:** Senior

**Category:** Refs

**Question:**

Socket effect depends on `[roomId]`. Parent passes a new `onMessage` often. How keep the socket for `roomId` yet call the latest handler? What’s stale if you list `onMessage`, or update the ref only in an effect with `[]`?

**Answer:**

Keep the socket effect depending only on `[roomId]`, and store the latest `onMessage` in a ref. Update that ref on every commit. The socket's listener calls `onMessageRef.current`, so it always uses the newest handler without reconnecting.

If you put `onMessage` in the dependency list, the socket reconnects whenever the parent passes a new function.

If you update the ref in an effect with `[]`, it stays frozen at the first handler.

React 18 has no stable `useEffectEvent`, so this ref pattern is the usual approach.

**Code:**

```tsx
const onMessageRef = useRef(onMessage);
useEffect(() => { onMessageRef.current = onMessage; });
useEffect(() => {
  const c = createConnection(roomId);
  c.on("message", (t) => onMessageRef.current(t));
  return () => c.disconnect();
}, [roomId]);
```

**Follow-up:**

`memo(ChatRoom)` gets inline `onMessage`, same `roomId`. Does the ref update?

Answer: Yes. A new function fails the `memo` comparison, so the component renders and the ref gets updated. But if the parent wraps the handler in `useCallback([])`, `ChatRoom` can skip rendering and keep a stale handler.

### REACT-085 — Cleanup must remove the listener it added

**Difficulty:** Senior

**Category:** Effects

**Question:**

`shortcut` `"a"` → `"b"`. Cleanup does `removeEventListener("keydown", () => {})`. How many listeners remain, which keys call `run`, and what must corrected cleanup close over?

**Answer:**

The cleanup passes a brand new empty function, which was never added, so nothing is removed. After the shortcut changes, two listeners remain, and both `"a"` and `"b"` still call `run`.

`removeEventListener` only works when you pass the exact same function that was added.

The fix is to create `onKey` in the effect, use it in `addEventListener`, and return a cleanup that removes that same `onKey`. It closes over the old shortcut on purpose, so it removes the right listener.

**Code:**

```tsx
return () => window.removeEventListener("keydown", onKey);
```

**Follow-up:**

Two effects both register `keydown` correctly. Order when `shortcut` changes?

Answer: React runs all cleanups first, in declaration order, and then all setups, in declaration order. Each cleanup removes only its own previous listener.

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

### REACT-170 — Context re-render design
**Difficulty:** Senior
**Category:** State sharing
**Question:** How do you structure context to avoid unnecessary re-renders?
**Answer:** The key fact is that every consumer re-renders when the provider's value changes. So I split contexts by how often they update, such as state versus dispatch, or theme versus user. I memoize the value object, keep providers as low in the tree as possible, and avoid putting fast-changing data in context. If the state is large and updates frequently, I'd use an external store with selectors instead.
**Code:** `<StateCtx.Provider value={state}><DispatchCtx.Provider value={dispatch}>…`
**Follow-up:** Why separate dispatch?

Answer: `dispatch` is stable and never changes. So components that only trigger actions won't re-render when the state changes.

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

### REACT-072 — Reset the draft when the entity changes, without an effect

**Difficulty:** Advanced

**Category:** Derived state

**Question:**

`Form` keeps a draft; effect syncs `setDraft(email)` on `[email]`. Parent may refetch same user or change `userId`. What’s wrong? Which resets are honest: controlled parent, `key`, or adjust during render?

**Answer:**

The effect runs after paint, so it can overwrite what the user is typing, and it only runs when `email` changes. If the user changes but two users have the same email string, nothing resets.

There are three better options. A controlled parent owns every keystroke. `key={userId}` remounts the form when the entity changes. Or adjust during render: if `userId` changed, set both the previous id and the draft before returning, so no stale frame appears.

Syncing props into state with effects is usually the wrong tool for inputs.

**Code:**

```tsx
if (userId !== prevUserId) {
  setPrevUserId(userId);
  setDraft(email);
}
```

**Follow-up:**

`key={userId}` remounts; form effect fetches avatar the parent already has. What repeated?

Answer: The remount re-runs the effect, so the avatar is fetched again. Pass the avatar from the parent as a prop, and keep effects for data that only this form loads.

### REACT-204 — Cancelling requests with AbortController
**Difficulty:** Intermediate
**Category:** Async data / Abort
**Question:** How do you use `AbortController` in an effect, and what must you handle?
**Answer:** In the effect, I create a controller, pass its `signal` to `fetch`, and call `controller.abort()` in the cleanup. That cancels the request, and the promise rejects with an `AbortError`. I must ignore that specific error so it isn't shown as a real failure. Aborting saves bandwidth and prevents stale updates. But the server may still process the request, so it doesn't replace designing writes to be safe to repeat.
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

Answer: Not reliably. The server may have already received it, so use idempotency keys for writes.

---

### REACT-224 — Optimistic updates
**Difficulty:** Senior
**Category:** Async data / Optimistic UI
**Question:** What is an optimistic update and what steps does it require?
**Answer:** You update the UI as if the mutation already succeeded, before the server responds, then reconcile with the real result. The steps are: cancel any in-flight queries for that key, save a snapshot of the current cache, write the optimistic value, run the mutation, restore the snapshot if it fails, and invalidate when it settles to sync with the server. It makes the UI feel instant, but adds complexity and a risk of flicker or inconsistency.
**Trade-offs:** Great for likes, toggles, reorder; avoid for payments or actions with likely validation failure.
**Follow-up:** Why cancel in-flight queries first?

Answer: A pending refetch could finish afterward and overwrite the optimistic value with old data.

---

### REACT-164 — Controlled vs uncontrolled ownership
**Difficulty:** Intermediate
**Category:** State ownership
**Question:** Explain controlled vs uncontrolled components as an ownership question.
**Answer:** It's about who owns the value. In a controlled component, the parent owns it. The parent passes `value` and `onChange`, and React state is the source of truth. In an uncontrolled component, the component or the DOM owns the value, and the parent reads it through a ref, a `defaultValue`, or on submit. I choose controlled when the parent needs to validate, derive, or sync the value. I choose uncontrolled for simple forms where only the final value matters.
**Follow-up:** Why is switching between them a bug?

Answer: If `value` goes from undefined to defined, or the other way, the component changes mode mid-life. React warns and state can be lost. Pick one mode for the component's lifetime.

---

### REACT-216 — Why context is the wrong tool for server state
**Difficulty:** Senior
**Category:** Async data / State architecture
**Question:** Why is putting fetched data in React Context usually a mistake?
**Answer:** Context only passes values around. It doesn't cache, de-duplicate, invalidate, or retry. You still write the fetch logic yourself. Every consumer also re-renders when the value changes, even if it uses one field. The data lives only as long as the provider, so navigating away often drops it and forces a refetch. Several providers can also duplicate requests. Context is better for rarely changing global client values, such as the theme or the signed-in user.
**Trade-offs:** Context is simple for tiny apps; a query cache scales with shared data and reduces boilerplate.
**Follow-up:** Can you fix re-renders with memoization?

Answer: Partly, by splitting the context into smaller ones. But you'd still lack cache lifetime management and revalidation.

---

### REACT-228 — Request waterfalls
**Difficulty:** Senior
**Category:** Async data / Performance
**Question:** What is a fetch waterfall and why is it common in React?
**Answer:** A waterfall is when requests run one after another, because each one starts only after the previous one finishes. In React it often happens when a child fetches inside an effect. The child doesn't mount until the parent finishes loading and renders, so its request starts late. With nested components, the delays add up. Fixes include moving fetches up, starting independent requests in parallel, prefetching in route loaders, or fetching on the server.
**Follow-up:** Is every sequential fetch a waterfall problem?

Answer: No. If one request truly depends on another, like needing a user id before fetching their posts, it must be sequential. The problem is accidental sequencing.

---

### REACT-185 — Loaders vs component-level fetching
**Difficulty:** Senior
**Category:** Routing
**Question:** What is the architectural difference between fetching in route loaders and in components?
**Answer:** A route loader starts fetching as soon as navigation begins, in parallel with loading the page's code. That avoids a render-then-fetch waterfall, and the data requirements are declared next to the route. Fetching in components keeps data close to where it's used and is more flexible, but requests can chain down the tree. Many apps combine them: the loader prefetches into a query cache, and components read from the same cache.
**Follow-up:** What does a loader prefetch into a cache give you?

Answer: The page renders instantly when the cache is warm, requests are shared, and components can still use the same cache hooks for later updates.

---

### REACT-191 — Suspense boundaries as architecture
**Difficulty:** Senior
**Category:** Suspense
**Question:** How do you decide where to put Suspense boundaries?
**Answer:** A Suspense boundary decides how detailed the loading experience is. I place one where a meaningful partial screen can show a placeholder: around the whole page for route-level loading, and around independent sections so fast content isn't held back by slow content. With too few boundaries you get full-page spinners, and with too many you get content popping in piece by piece. I nest them so inner ones refine outer ones, and keep fallbacks the same size as the content.
**Follow-up:** What happens with no boundary above a suspending component?

Answer: The nearest parent boundary handles it. If there is none, React throws an error. In client rendering, you need at least a root-level boundary.

---

### REACT-162 — Compound components
**Difficulty:** Senior
**Category:** Component patterns
**Question:** What are compound components and what problem do they solve?
**Answer:** Compound components are a group of components that work together as one widget and share hidden state. `Tabs`, `Tabs.List`, and `Tabs.Panel` are a good example. The parent owns the state and shares it through context, and the children read from it. Consumers get flexible markup and ordering without passing props between the pieces. Meanwhile the parent can still guarantee accessibility and keyboard behavior, because it controls how the parts connect.
**Follow-up:** How do children get the shared state?

Answer: Through a context that the parent creates. `React.Children.map` with `cloneElement` can also work, but it breaks when children are wrapped, so context is the better choice.

---

### REACT-308 — Hydration mismatches

**Difficulty:** Intermediate
**Category:** Hydration

**Question:**
What is a hydration mismatch, and why is it more than a console warning?

**Answer:**
A hydration mismatch happens when the HTML from the server does not describe the same tree React renders on the client during hydration. React then warns, and in development it may patch the DOM or discard the server markup and render again. Users can see a flicker, broken attributes, or a full client re-render that throws away the benefit of server HTML. This matters because the bug often hides in code that "works" after load. The first paint was already wrong, so the recovery is expensive and confusing.

**Follow-up:**
React Strict Mode runs render twice in development. Does that by itself cause a mismatch?

Answer: A pure render can run twice and still match. A mismatch means the server HTML and the client render disagreed. Strict Mode makes impure renders easier to notice, which is useful when the impurity is what diverged.

### REACT-318 — When to mark `use client`

**Difficulty:** Intermediate
**Category:** Server Components

**Question:**
When do you add the `'use client'` directive, and where should it sit in the tree?

**Answer:**
I add `'use client'` when the module needs state, effects, event handlers, or a browser API. The directive marks that file and the modules it imports as part of the client graph. I keep it off the page root, because a root directive pushes the whole page into the bundle just to make one widget interactive. I push the directive down to the smallest component that actually needs it, and I leave data fetching and layout in Server Components above it. The signal is a hook or a DOM dependency.

**Code:**

```jsx
"use client";

export function AddToCart({ productId }) {
  return <button onClick={() => add(productId)}>Add</button>;
}
```

**Follow-up:**
A page file only renders an `AddToCart` client component. Does the page file itself need `'use client'`?

Answer: No. A Server Component page can render `AddToCart` and pass a product id. The directive belongs on the button module, which is the file that uses the event handler.

### REACT-302 — Server-side rendering

**Difficulty:** Junior
**Category:** Rendering strategies

**Question:**
What is server-side rendering in a React app, and what do you get in exchange for the extra server work?

**Answer:**
Server-side rendering means the server runs React for the request, produces HTML for that page, and sends it down so the user can read content before JavaScript finishes. The browser then hydrates that HTML so clicks and state start working. You get a faster first view and HTML that crawlers can read. You also take on server CPU, caching decisions, and the requirement that the first client render matches the markup exactly. It fits public pages and any screen where waiting on a bundle would feel broken.

**Follow-up:**
Does server-rendered HTML mean the page is interactive as soon as it paints?

Answer: No. The user can read the markup immediately, but event handlers attach during hydration. Until that finishes for a control, the control looks ready and still ignores input.

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

### REACT-260 — Validation timing UX
**Difficulty:** Intermediate
**Category:** Validation UX
**Question:** When should validation errors appear: onChange, onBlur, or onSubmit?
**Answer:** Showing an error while the user is still typing, like "invalid email" after one character, is frustrating. A common pattern is to validate on blur for first-time feedback, then re-validate on every change once the field has shown an error. People call this "reward early, punish late." I always validate on submit and focus the first invalid field. Some checks, like password strength or character count, are helpful live. I match the timing to the field and the user's intent.
**Follow-up:** What's RHF's `mode` option?

Answer: It sets when validation first runs: `onSubmit`, `onBlur`, `onChange`, or `onTouched`. `reValidateMode` controls when it runs again after the first submit.

### REACT-274 — Labels and `useId`
**Difficulty:** Junior
**Category:** Accessibility
**Question:** How do you correctly associate labels with inputs in React, and why use `useId`?
**Answer:** I use `<label htmlFor={id}>` with a matching `id` on the input, or I wrap the input inside the label. The label gives the control its accessible name and makes the click target bigger. `useId` generates unique ids that are stable between server and client, so reusable components don't collide or cause hydration mismatches. I never generate ids with `Math.random()`.
**Code:**
```jsx
const id = useId();
<label htmlFor={id}>Email</label><input id={id} type="email" />
```
**Follow-up:** Can I use `useId` output for CSS selectors?

Answer: Not reliably, because it contains colons. Use it for ids and ARIA references, and use classes for styling.

### REACT-355 — getByRole and the accessible name

**Difficulty:** Intermediate
**Category:** Queries

**Question:**
Why is `getByRole` the query React Testing Library wants you to reach for first?

**Answer:**
`getByRole` looks through the accessibility tree, the same information a browser exposes to assistive technology. A button has the button role, a text field has the textbox role, and a heading can be filtered by level. The `name` option matches the accessible name, which comes from the visible text, a label, or `aria-label`. If the query cannot find a name, a screen reader user is likely stuck as well. The test therefore checks behavior and a basic access contract in one step. You are not searching for a div that happens to look like a button.

**Code:**

```jsx
screen.getByRole('heading', { level: 1, name: 'Billing' })
screen.getByRole('button', { name: 'Pay now' })
```

**Follow-up:**
What does the `hidden` option change?

Answer: By default, role queries skip elements that are not exposed, such as a closed disclosure. Pass `{ hidden: true }` only when you intentionally need something that is in the accessibility tree as hidden.

### REACT-352 — Leaving implementation details out of the test

**Difficulty:** Intermediate
**Category:** Testing philosophy

**Question:**
Why do senior engineers avoid asserting on state, props, or CSS class names when they test a React UI?

**Answer:**
An implementation detail is anything a user cannot see or operate, such as a `useState` name, a private function, or a generated class string. A test that reaches into those pieces locks the current design. The next person who moves logic into a hook, or switches a class to a different styling approach, has to edit the test even though the feature still works. Assert on the heading, the error text, or the enabled button instead. The test then fails when the product breaks, which is the signal you actually want.

**Follow-up:**
When is reading `container.firstChild` or a style class acceptable?

Answer: It is a last resort for something with no accessible handle, such as a purely visual canvas. Prefer a role or text query first, and leave a short comment explaining why the escape hatch is there.

### REACT-423 — Discriminated unions for UI state
**Difficulty:** Intermediate
**Category:** UI state
**Question:**
How do you type a screen that can be idle, loading, successful, or failed?

**Answer:**
A discriminated union is one object type per status, joined with `|`, and each object shares a literal `status` field. Loading has no user, success has a user, and error has a message. That is more honest than optional user and error fields plus a boolean, which allows impossible combinations. Store one whole variant in state, not a patchwork of flags. Each render branch then sees only the fields that exist for that status. Impossible screens cannot be represented, so they cannot be rendered by accident.

**Code:**
```tsx
type ViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; user: User }
  | { status: "error"; message: string };
```

**Follow-up:**
Where should this union live?

Answer: Next to the component if only one screen uses it. Export it from the feature module when a hook, a reducer, and a view all share the same states.

### REACT-471 — XSS via dangerouslySetInnerHTML

**Difficulty:** Intermediate

**Category:** security client

**Question:**

Why is `dangerouslySetInnerHTML` risky in production React, and how do you use it safely if you must?

**Answer:**

It injects raw HTML, bypassing React’s usual text escaping, so unsanitized user or CMS content becomes XSS in the browser. If you must render HTML, sanitize with a maintained library on a strict allowlist, prefer server-side sanitization, and never concatenate untrusted strings into the HTML. Pair with CSP as defense in depth. Result: rich content without script execution. Trade-off: sanitizers can strip needed markup or miss novel vectors if misconfigured. Failure mode: “trusting” CMS authors or only filtering `<script>` tags while leaving `onerror` attributes intact.

**Follow-up:**

Is Markdown rendering automatically safe?

Answer: No—Markdown-to-HTML pipelines still need sanitization because raw HTML or dangerous links can pass through converters.
