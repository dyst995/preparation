# R02 — Hooks and state management

React 18. Questions REACT-051–REACT-100.

### REACT-051 — Each hook slot stores a different thing

**Difficulty:** Intermediate

**Category:** Hooks

**Question:**

A function component calls `useState`, `useReducer`, `useRef`, `useMemo`, `useCallback`, `useEffect`, and `useContext` in that order every render. What does React keep for each call, and which may do work again on the next render?

**Answer:**

React matches one slot per call by order. `useState`/`useReducer` store value plus stable setter/`dispatch`; initializers/`init` run only on create. `useRef` returns the same `{ current }` object. `useMemo`/`useCallback` recompute when deps fail `Object.is`. `useEffect` stores setup and deps; it runs after commit, not during render. `useContext` reads the nearest provider and subscribes—no private copy. Same hook sequence every render is your job.

**Trade-offs:**

Several `useState` for independent fields; one `useReducer` for one transition; refs for non-painting values; memo/callback only when identity matters.

**Follow-up:**

`useState(expensive())` vs `useRef(expensive())` on the second render?

Answer: Both evaluate `expensive()` every render. `useState` ignores the value after create (use `() => expensive()` to lazy-init). `useRef` has no lazy form; it keeps the first `current` and still returns the original object.

### REACT-052 — The setter replaces the object

**Difficulty:** Intermediate

**Category:** State

**Question:**

From `{ title: "", body: "" }`, what is `draft` after `onTitle`, after `onBody`, and after `applyBoth`? Each runs as its own click.

```tsx
setDraft({ title: "A" });
setDraft((prev) => ({ ...prev, body: "B" }));
setDraft({ ...draft, title: "A" });
setDraft({ ...draft, body: "B" });
```

**Answer:**

`onTitle` replaces with `{ title: "A" }`—`body` is gone; `useState` does not shallow-merge. `onBody` merges via updater → `{ title: "", body: "B" }`. `applyBoth` queues two replaces from this render’s `draft`; the second wins → `{ title: "", body: "B" }`. Use a functional updater for the second call to build on the pending object.

**Code:**

```tsx
setDraft((prev) => ({ ...prev, title: "A", body: "B" }));
```

**Follow-up:**

Nested `author.city`: spread new `author` vs reuse `prev.author` then mutate—which leaves previous state unchanged?

Answer: The nested spread. Reusing `prev.author` shares the object; later mutation pollutes both previous and next state.

### REACT-053 — The updater reads the pending state

**Difficulty:** Intermediate

**Category:** State

**Question:**

`count` is `0`, `history` is `[]`. `onSave` runs twice; both `await save()` before either setter. Compare bare setters vs functional `setCount` with `setHistory` still using closed-over `count + 1`. Why is nested `setHistory` inside the count updater a bad fix?

**Answer:**

Both handlers close over `0`/`[]`. After await, bare setters both write `1` and `[1]`—one save lost. Functional `setCount` yields `2`, but `setHistory` still appends closed-over `1` twice → `[1, 1]`. Updaters must stay pure; nested setters inside them can run twice under Strict Mode. Prefer one reducer for “increment and append that number.”

**Code:**

```tsx
setCount((c) => c + 1);
setHistory((h) => [...h, h.length + 1]);
```

**Follow-up:**

How do you store a function in `useState` and replace it with one that returns `1`?

Answer: Initializer needs `() => () => 0`. `setFn(() => 1)` stores `1` (updater). Use `setFn(() => () => 1)` to store the function.

### REACT-054 — The interval keeps the first render's values

**Difficulty:** Senior

**Category:** Effects

**Question:**

`<Ticker step={1} />` later gets `step={5}` without remounting. With `useEffect(..., [])` calling `setCount(count + step)`, what does `count` do? What if deps are `[count, step]`? What if `setCount((c) => c + step)` with `[step]`?

**Answer:**

Empty deps: interval closes over mount `count=0`, `step=1`; ticks call `setCount(1)` and bail out—stays `1`; never sees `5`. `[count, step]` restarts every tick (timer resets) but uses fresh values. Updater + `[step]` increments without resetting on count, and recreates when `step` changes. Strict Mode double-mounts the interval in development.

**Code:**

```tsx
useEffect(() => {
  const id = setInterval(() => setCount((c) => c + step), 1000);
  return () => clearInterval(id);
}, [step]);
```

**Follow-up:**

With `[step]` and functional setCount, what does `console.log(count)` next to it print after three ticks?

Answer: `0`, `0`, `0`—closure from the effect’s render. Committed count is `3`. Log inside the updater or a `count` effect for the latest value.

### REACT-055 — An empty dependency list freezes the closure

**Difficulty:** Senior

**Category:** Effects

**Question:**

`query` is state; the fetch effect lists `[]`. A teammate deletes the exhaustive-deps warning so it “runs only on mount.” The user types. What runs, what is stale, and when is `[]` honest?

**Answer:**

Setup closes over the first `query` and never re-runs. New query on screen; only request used the mount string—stale results. `[]` is honest only when the body reads no changing props/state/context, or reads latest handlers via a ref and depends on values that should restart the subscription. Fix fetch with `[query]` plus abort/ignore cleanup.

**Follow-up:**

Effect calls `load(query)`; `load` is defined in the component and passed to a child. Adding `load` refetches every keystroke even when `query` is unchanged. What dependency is changing?

Answer: `load`’s identity—new function every render. Define `load` inside the effect and depend on `[query]`, or `useCallback` with `[query]`.

### REACT-056 — Passive effects run after the paint opportunity

**Difficulty:** Senior

**Category:** Effects

**Question:**

A component commits a new `userId`. It has `useEffect([userId])` and a previous cleanup. When do cleanup and setup run relative to DOM update and paint? What does Strict Mode do on first mount, and what runs on the server?

**Answer:**

Commit updates DOM → layout effects → paint opportunity → passive effects. Cleanup for `"a"` then setup for `"b"`. `useEffect` does not run on the server. Strict Mode (React 18) setup→cleanup→setup on mount in development. Effects after paint: user can see `"b"` before the fetch starts. Put one-shot POSTs in event handlers.

**Follow-up:**

Effect calls `setUser` and `setLoading(false)` in the same setup. How many extra renders, and can the user see loading from the render that started the fetch?

Answer: One batched extra render. The committed `userId` render already had a paint chance with its loading flag; the effect’s `setLoading(false)` updates a later render.

### REACT-057 — Layout effects run before the browser paints

**Difficulty:** Senior

**Category:** Layout effects

**Question:**

A tooltip measures with `getBoundingClientRect` then `setTop`. What does the user see with `useEffect` vs `useLayoutEffect`? Why is layout effect wrong for a fetch?

**Answer:**

`useLayoutEffect` runs after DOM write, before paint—`setTop` flushes so the user sees the corrected position. `useEffect` can paint the old `top` first (flash). Layout effects block paint; a fetch still finishes later, so use `useEffect` for network. Layout effects don’t run on the server; client corrects before paint after hydration.

**Code:**

```tsx
useLayoutEffect(() => {
  const next = anchorRef.current?.getBoundingClientRect().bottom ?? 0;
  setTop((prev) => (prev === next ? prev : next));
}, [anchorRect]);
```

**Follow-up:**

Layout effect always `setTop({ y: measured })` with a new object even when the pixel is unchanged. What happens?

Answer: Endless nested updates before paint (max update depth). Store a number or bail out when unchanged.

### REACT-058 — The effect writes a new object into its own dependency

**Difficulty:** Advanced

**Category:** Effects

**Question:**

Mount with `filters = { q: "", page: 1 }`. Effect does `setFilters({ q: filters.q, page: 1 })` with `[filters]`. Nothing typed. What happens, and which dependency stops the loop without an extra render?

**Answer:**

Effect allocates a new object; `Object.is` fails; re-render; deps change; loop until max depth. Prefer deleting the effect—`onChange` already sets `page: 1`. If needed, depend on `[filters.q]` and bail out: `setFilters(prev => prev.page === 1 ? prev : { ...prev, page: 1 })`.

**Code:**

```tsx
useEffect(() => {
  setFilters((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
}, [filters.q]);
```

**Follow-up:**

Deps stay `[filters]` but body uses the bailout updater. Does mount still loop?

Answer: No—same reference → skip render → effect doesn’t re-run. Still better owned by the click handler.

### REACT-059 — The in-flight request has to be dropped

**Difficulty:** Senior

**Category:** Effects

**Question:**

`userId` goes `"a"` → `"b"` before `"a"` resolves. Effect lists `[userId]` with no cleanup. Both responses arrive, `"a"` last. What shows? What does cleanup change? What does Strict Mode add?

**Answer:**

Screen can show user A under id B—React doesn’t cancel fetch. Cleanup aborts or sets an ignore flag before `"b"` setup. Abort prefers when the API accepts a signal. Strict Mode aborts the first mount request when cleanup exists. Put POSTs in handlers, not effects.

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

Answer: Yes—it must return without `setUser`/`setError`. Abort+Ignore AbortError is cleaner when the API honors the signal.

### REACT-060 — A reducer returns the next state for one slot

**Difficulty:** Intermediate

**Category:** Reducers

**Question:**

`count` and `history` must change together on `"saved"` / `"reset"`. Why is `useReducer` better than two `useState` setters? What about `dispatch`, the reducer, and `init`?

**Answer:**

One action returns both fields together—two updaters can’t share pending values safely. `dispatch` is stable. React uses the reducer from the render processing the update. `init(initialArg)` runs only when the slot is created. Strict Mode may double-call init/reducer; keep them pure.

**Code:**

```tsx
case "saved": {
  const count = state.count + 1;
  return { count, history: [...state.history, count] };
}
```

**Follow-up:**

Reducer inside the component reads `props.step`. Effect with `[]` dispatches once. Which `step` applies if the parent already passed a new step?

Answer: The step from the render that processes the dispatch—not frozen in the empty effect. Pass step on the action when the event means “step at click time.”

### REACT-061 — Mutating and returning the same state skips the render

**Difficulty:** Senior

**Category:** Reducers

**Question:**

Reducer does `state.items.push(item); return state`. User dispatches once with `"a"`. What does the screen show in production? What does Strict Mode add? What should it return?

**Answer:**

Same reference → `Object.is` bailout → no re-render; button stays empty while the array was mutated. Strict Mode double-invokes → `"a"` twice in the mutated array, still no render. Return `{ items: [...state.items, item] }`. Returning `state` unchanged on purpose is the correct “no-op” bailout.

**Code:**

```tsx
function reducer(state: State, item: string): State {
  return { items: [...state.items, item] };
}
```

**Follow-up:**

Pure reducer returns `state` when item exists. Parent re-renders with a new `title`. Does this component run, and does the list reset?

Answer: It runs because the parent rendered it. Bailout only skips the dispatch update. List doesn’t reset; `memo` is what can skip on props.

### REACT-062 — The ref object is stable and writes do not render

**Difficulty:** Intermediate

**Category:** Refs

**Question:**

`const ref = useRef(0)` across re-renders. What’s stable? Click does `ref.current += 1` with no setter—what shows, and what does a later render see? When does React write `current`?

**Answer:**

Same object for the slot’s life; initial arg only on create. Mutating `current` doesn’t schedule a render; a later state-driven render sees the new value. With `<div ref={ref}>`, React assigns the node (then `null`) during commit—still no render. Don’t branch JSX on `ref.current` during render.

**Follow-up:**

Inline `ref={(node) => { nodeRef.current = node }}` while parent re-renders. Does React clear the node?

Answer: Yes—new callback identity → previous called with `null`, then new with the node. Prefer `ref={nodeRef}` or a stable `useCallback`.

### REACT-063 — A ref keeps the latest value for a later callback

**Difficulty:** Senior

**Category:** Refs

**Question:**

Socket effect depends on `[roomId]`. Parent passes a new `onMessage` often. How keep the socket for `roomId` yet call the latest handler? What’s stale if you list `onMessage`, or update the ref only in an effect with `[]`?

**Answer:**

Depend on `[roomId]`; store `onMessage` in a ref updated every commit (or during render / layout effect for a tighter gap). Listing `onMessage` reconnects every parent render. `[]` ref write freezes the mount handler. React 18 uses this ref pattern; `useEffectEvent` isn’t a stable 18 export.

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

Answer: Yes—new function fails `memo`, so it renders and the ref effect writes. A stale parent `useCallback([])` can skip `ChatRoom` and leave a stale ref.

### REACT-064 — useMemo caches a result while dependencies compare equal

**Difficulty:** Senior

**Category:** Memoization

**Question:**

When does `useMemo(() => filter(items, query), [items, query])` recompute vs reuse? When is it the wrong fix? Does it make the child skip rendering?

**Answer:**

Recomputes when deps fail `Object.is`; else returns the same reference. Doesn’t skip children—only stabilizes the value. Add it for expensive work (profiled), a hook dep, `memo` child prop, or context value. Missing a dep → stale UI. A new `items` array every render defeats the cache. Keep the factory pure (Strict Mode may double-call).

**Follow-up:**

Memoized `visible` is an effect dep. `query` changes every keystroke. How often does the effect run vs without `useMemo`?

Answer: Once per keystroke either way when query changes. Without memo, unrelated re-renders also allocate a new array and resubscribe.

### REACT-065 — useCallback preserves the closure from the render that created it

**Difficulty:** Senior

**Category:** Callbacks

**Question:**

`SaveButton` uses `useCallback(() => save(docId)..., [])`. Prop becomes `docId="b"`, then click. Which id is sent? What does `[docId]` change? What doesn’t `useCallback` do?

**Answer:**

Empty deps keep the mount closure → saves `"a"`. `[docId]` recreates when the prop changes so the click sends `"b"`. It doesn’t defer, batch, or deep-compare bodies—it’s `useMemo` for a function. Prefer an inline handler when nothing needs stable identity.

**Code:**

```tsx
const onClick = useCallback(() => {
  save(docId).then(() => setSaved(true));
}, [docId]);
```

**Follow-up:**

List is `[docId]`; handler uses closed-over `saved` omitted from deps. After first save, second click—what does it see?

Answer: Still `saved === false` from the render that created the callback (if `docId` unchanged). Use `setSaved(true)`, include `saved`, or a functional update.

### REACT-066 — The memoized child still sees a new callback

**Difficulty:** Advanced

**Category:** Memoization

**Question:**

`memo(Row)` gets `onSelect` from `useCallback(..., [ids])`. Same `ids` ref, then `setSelected`. Which Rows run? Fresh parent `ids` array? Without `useCallback`?

**Answer:**

Same `ids` → same callback → `memo` skips Rows. New `ids` reference (unused by the callback) mints a new `onSelect` → every Row renders. Without `useCallback`, every `List` render creates a new function → all Rows render. Honest deps: `[]` (`setSelected` is stable). Pair `memo` + `useCallback`.

**Code:**

```tsx
const onSelect = useCallback((id: string) => setSelected(id), []);
```

**Follow-up:**

Functional toggle `setSelected(curr => curr === id ? null : id)` with `[]`. Why no `selected` dep?

Answer: Updater reads pending state; callback doesn’t close over `selected`. Reading `selected` with `[]` would stick on the first value.

### REACT-067 — useContext reads the nearest value by identity

**Difficulty:** Intermediate

**Category:** Context

**Question:**

Provider passes `value={theme}` (`"dark"`). `Title` calls `useContext(ThemeContext)`. What returns, when does it re-render, and what if value is `{ theme, user }` but Title only needs `theme`?

**Answer:**

Returns nearest provider value (`"dark"`); default only with no provider. Re-renders when value fails `Object.is`. React 18 has no selector—new `{ theme, user }` wakes Title even if `theme` is unchanged. `memo` compares props, not context fields.

**Follow-up:**

`memo(Title)`, stable props, same string `"dark"` vs `value={{ theme: "dark" }}` each render?

Answer: Same string → no context notify. New object every provider render → Title runs.

### REACT-068 — Values that change at different rates need different providers

**Difficulty:** Senior

**Category:** Context

**Question:**

One value `{ theme, cursor }`. Theme rare; cursor every move. `ThemeLabel` and `CursorDot` both `useContext` that object. What re-renders on a move, and how structure providers so the label doesn’t?

**Answer:**

Every consumer re-renders on a new object. Split `ThemeContext` / `CursorContext`. Hold state in a component that renders both providers and receives the heavy tree as `children` so a cursor update doesn’t recreate the page element. Stable identities still matter per context.

**Code:**

```tsx
<ThemeContext.Provider value={theme}>
  <CursorContext.Provider value={cursor}>{children}</CursorContext.Provider>
</ThemeContext.Provider>
```

**Follow-up:**

`{ state, dispatch }` in one context; toolbar only needs `dispatch`. Does it re-render on keystrokes?

Answer: Yes—new state object. Put stable `dispatch` in its own context (or pass as a prop).

### REACT-069 — Each custom hook call has its own state

**Difficulty:** Intermediate

**Category:** Custom hooks

**Question:**

`Panel` calls `useToggle()` twice. Toggle `a`—what happens to `b`? Why no shared boolean? What if `useToggle` runs only when `enabled`?

**Answer:**

`a` flips; `b` stays. Each call owns its own `useState`/`useCallback` slots in the caller’s list—hooks share logic, not state. Conditional calls change hook count/order → rules-of-hooks failure. Unmount a child that owns the hook instead.

**Follow-up:**

Module `Map` keyed by string plus `useState` for first value. Two Panels call `useToggle("power")`. Do they share?

Answer: Map can share data, but each `useState` is separate and Map writes don’t re-render the other. Need context/store subscription—or don’t share.

### REACT-070 — The hook's effect belongs to the caller

**Difficulty:** Senior

**Category:** Custom hooks

**Question:**

`useDocumentTitle(title)` sets `document.title` and restores on cleanup. Two mounted callers, different titles—who wins? What does the hook guarantee vs a plain helper? What belongs in deps?

**Answer:**

Each caller has its own effect; last setup in tree order wins the single browser title. Parent effects run after child. Cleanup restores that setup’s previous title—can overwrite another owner. Hook gives slot lifecycle + lint; not a title stack. Depend on `[title]`. Document one owner or build an explicit stack.

**Code:**

```tsx
useEffect(() => {
  const previous = document.title;
  document.title = title;
  return () => { document.title = previous; };
}, [title]);
```

**Follow-up:**

Also takes inline `onChange`. How avoid fighting callback identity?

Answer: Effect depends on `[title]`; keep `onChange` in a ref. Listing `onChange` rewrites the title every parent render.

### REACT-071 — Derived data is computed during render

**Difficulty:** Intermediate

**Category:** Derived state

**Question:**

`visible` is state seeded from `items`, then an effect filters by `query`. What can the user see between commits, and why is the effect wrong? Where would `useMemo` belong?

**Answer:**

First paint can show unfiltered `items`; effect filters after paint—one frame late every query change. Derive during render: `items.filter(...)`. `useMemo` only if profiled expensive or identity needed for deps/`memo`—still during render, so no flash.

**Code:**

```tsx
const visible = items.filter((item) => item.name.includes(query));
```

**Follow-up:**

“Hide row” removes an id without changing `items`/`query`. What’s state vs derived?

Answer: Hidden ids are state. `visible` stays derived: filter by query, then exclude hidden ids—don’t patch a stored filtered array.

### REACT-072 — Reset the draft when the entity changes, without an effect

**Difficulty:** Advanced

**Category:** Derived state

**Question:**

`Form` keeps a draft; effect syncs `setDraft(email)` on `[email]`. Parent may refetch same user or change `userId`. What’s wrong? Which resets are honest: controlled parent, `key`, or adjust during render?

**Answer:**

Effect overwrites typed drafts after paint and won’t reset on `userId` change if email string matches. Controlled parent owns every keystroke. `key={userId}` remounts for a new entity. Or during render: if `userId !== prevUserId`, set both before returning—no stale paint. Effects for syncing props→state are usually wrong for inputs.

**Code:**

```tsx
if (userId !== prevUserId) {
  setPrevUserId(userId);
  setDraft(email);
}
```

**Follow-up:**

`key={userId}` remounts; form effect fetches avatar the parent already has. What repeated?

Answer: Remount re-fetches. Render avatar from the prop; keep effects for data only this form loads.

### REACT-073 — State sits at the lowest common owner

**Difficulty:** Staff-Level

**Category:** State architecture

**Question:**

Canvas + word count need the draft; modal open is local; theme is rare and distant; pointer is one decoration and high-frequency. Where does each live, and what’s the cost of one context for all four?

**Answer:**

Draft: lowest parent of both readers (props). Modal flag: beside button/menu until a second reader. Theme: context (stable string, rare). Pointer: local to the decoration. One mega-context makes every write wake every reader—pointer moves re-render themed trees. Placement first; memoization after.

**Follow-up:**

Word count is slow, canvas cheap, both need draft. Cut render without duplicating draft?

Answer: One draft in the parent. `memo(WordCount)` if parent renders for other reasons; or debounce a derived preview. Don’t duplicate the source of truth.

### REACT-074 — A fetched user and a draft are different facts

**Difficulty:** Staff-Level

**Category:** State architecture

**Question:**

Detail and list each `useState` a fetched user; list stays stale after detail saves. Detail also copies `user.email` into a draft via effect. What owns the server fact vs draft? Why is one context of the whole response a weak fix?

**Answer:**

Server user: one cache keyed by id (`useSyncExternalStore`); PUT writes once, both screens subscribe. Draft: editor-owned, init/reset by `key` or during-render—don’t always sync from fetch. Context covering both routes still fans out on every field; prefer per-id store snapshots. `getSnapshot` must return a stable reference until data changes.

**Follow-up:**

PUT body omits `displayName` the cache had. What if you store the body as the whole record?

Answer: List loses `displayName`. Merge fields per API contract in one `writeUser`, not per screen.

### REACT-075 — The handler ref was frozen on mount

**Difficulty:** Advanced

**Category:** Effects

**Question:**

`useWindowEvent` updates `handlerRef` in an effect with `[]`, subscription with `[type]`. Parent passes a new handler; `type` stays `"resize"`. Which handler runs, and what’s the smallest fix that keeps the listener and calls the latest?

**Answer:**

Mount handler stays in the ref—stale draft. Remove the assignment effect’s deps so it runs every commit (declare above subscription); keep `[type]` on the listener. Or assign `handlerRef.current = handler` during render / layout effect for a tighter gap. Don’t list `handler` on the subscription.

**Code:**

```tsx
useEffect(() => { handlerRef.current = handler; });
useEffect(() => {
  const listener = (e: Event) => handlerRef.current(e);
  window.addEventListener(type, listener);
  return () => window.removeEventListener(type, listener);
}, [type]);
```

**Follow-up:**

Subscription deps `[type, handlerRef]`—rebind every render? Does the linter want `handler`?

Answer: No—`handlerRef` is stable. Linter wants `type`, not `handler`, if the effect only reads `handlerRef.current` later.

### REACT-076 — One save action returns the status and the error together

**Difficulty:** Senior

**Category:** Reducers

**Question:**

Separate `status` / `error` slots. Handler sets `"saving"`, on success `"saved"`, on catch only `setError`. Which illegal screens can commit, and how does one reducer fix pairs?

**Answer:**

Can paint `"saving"` with an old error, or `"saving"` forever after catch, or `"saved"` with a leftover message. Reducer returns complete pairs: `saveRequested` → `{ saving, null }`, success/fail clear or set error together. Keep draft in separate state. Await between dispatches is fine for showing saving.

**Follow-up:**

After `saveSucceeded`, user typed during the request. What about the draft?

Answer: Leave the keystroke draft alone. Freeze sent text at `saveRequested` if you need that snapshot.

### REACT-077 — The second dispatch is applied to the pending state

**Difficulty:** Senior

**Category:** Reducers

**Question:**

`items` starts `[]`. One click: dispatch `"a"`, then dispatch item based on `state.items.length === 0 ? "first" : "later"`. What’s committed, what does the second reducer receive, and what’s `state.items` after the first `dispatch` returns?

**Answer:**

One batch → `["a", "first"]`. Second reducer sees pending `["a"]`, but the action already chose `"first"` from this render’s empty `state`. `dispatch` returns void—handler’s `state` binding is unchanged. Decide from pending state inside the reducer, or use one action with both items.

**Follow-up:**

`await save()` between the two dispatches. What does the second reducer receive?

Answer: First batch can commit `["a"]`; after await, reducer sees that state. Handler’s `state` binding is still the old render—don’t build payloads from it after await.

### REACT-078 — useId is stable for one mount and matches hydration

**Difficulty:** Intermediate

**Category:** Hooks

**Question:**

`EmailField` uses `useId` for `htmlFor`/`id`. It re-renders on typing; a second field mounts; page SSR+hydrates. What’s stable/unique, and why not `Math.random()`?

**Answer:**

Same string for this slot while mounted; unique per position/slot. Server and client walk the same tree → matching ids. Random ids mismatch hydration and can break labels. Not a DB key or cross-visit stable id. Call unconditionally so slot counts match.

**Follow-up:**

Two React roots both call `useId`. How avoid collisions?

Answer: Distinct `identifierPrefix` on each `createRoot`/`hydrateRoot`, matching the server output for hydrated roots.

### REACT-079 — useId is not a list key

**Difficulty:** Senior

**Category:** Hooks

**Question:**

Contacts have stable `contact.id`. Teammate wants React `key`, checkbox `id`, and `querySelector` from `useId`. Which is valid?

**Answer:**

Checkbox/label id in the row component is valid. List `key` must be `contact.id`—`useId` tracks instance position, not data identity. `querySelector` breaks on colons; use `getElementById` or `CSS.escape`, prefer a ref. Never call `useId` inside the parent’s `map`.

**Code:**

```tsx
function ContactRow({ contact }: { contact: { id: string; name: string } }) {
  const labelId = useId();
  return (
    <li>
      <input id={labelId} type="checkbox" />
      <label htmlFor={labelId}>{contact.name}</label>
    </li>
  );
}
```

**Follow-up:**

Error message needs `aria-describedby`. Second `useId`?

Answer: One call + suffix `` `${labelId}-error` `` is enough.

### REACT-080 — useImperativeHandle assigns the handle before paint

**Difficulty:** Senior

**Category:** Refs

**Question:**

Parent holds `inputRef` for `forwardRef` `FancyInput`. When is `inputRef.current` assigned, what’s it during parent render, and which deps keep `getValue` current?

**Answer:**

`useImperativeHandle` assigns in a layout effect (after DOM, before paint); cleanup sets `null`. During parent render on mount it’s still `null`—read in click/layout effect. `[]` freezes `getValue`’s closure; list `value` to replace the handle, or read `value` from a ref inside `create` with `[]` for stable handle identity.

**Code:**

```tsx
valueRef.current = value;
useImperativeHandle(ref, () => ({
  focus() { nodeRef.current?.focus(); },
  getValue() { return valueRef.current; },
}), []);
```

**Follow-up:**

Parent sometimes passes `ref={null}`. What does the child do?

Answer: Handle isn’t assigned; child still renders. Methods are optional parent access.

### REACT-081 — The menu's open flag stays in the menu

**Difficulty:** Intermediate

**Category:** State architecture

**Question:**

`Page` holds `open` for a menu and also renders expensive `Editor`. Toggle re-renders `Editor`. Where should `open` live? What if a distant shortcut must toggle the same menu?

**Answer:**

Colocate in `MenuWidget` that owns button+menu so `Page`/`Editor` don’t re-render. Lift only when a second reader (shortcut) appears; pass `Editor` as `children` from a parent that doesn’t hold `open` so the owner’s toggle doesn’t recreate the editor element. `memo` is a patch, not placement.

**Code:**

```tsx
function Page() {
  return (<><MenuWidget /><Editor /></>);
}
```

**Follow-up:**

Panel is in a portal; button is a sibling of `Editor`. Does the portal force `open` to `Page`?

Answer: No—state can stay in the component that renders button and portaled panel. Shortcuts lift state; portals don’t.

### REACT-082 — The shared query is lifted to the parent

**Difficulty:** Intermediate

**Category:** State architecture

**Question:**

`SearchBox` and `Results` each `useState("")` for query. User types `ada`. What does the list show, and what’s the smallest lift? Filter during render.

**Answer:**

Results still shows everything—two slots. Lift `query` to `Page`; pass `query`/`setQuery` down; Results derives `items.filter(...)` while rendering. One controlled query, same commit.

**Code:**

```tsx
function Page({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");
  return (
    <>
      <SearchBox query={query} onQuery={setQuery} />
      <Results items={items} query={query} />
    </>
  );
}
```

**Follow-up:**

`Results` is slow; `Page` also has a timer-driven `banner`. Cut Results renders without a second query?

Answer: Keep one query; `memo(Results)` so equal `items`/`query` skip while banner changes—or move banner out of `Page`.

### REACT-083 — A new key mounts a new copy of the state

**Difficulty:** Senior

**Category:** State

**Question:**

`<NoteEditor key={noteId} />`—user typed a draft, then `noteId` changes. What happens to draft, effects, and `NoteScreen` state? What if `key` is only on the inner `<textarea>`?

**Answer:**

New key → unmount old instance (cleanup + drop slots) and mount new (fresh `useState`, new effect). Parent `NoteScreen` state stays. Key on textarea remounts the host node only—editor state/effects survive. Key resets the component it sits on.

**Follow-up:**

Draft lifted to `NoteScreen`; editor still keyed. After navigate, what does the preview show?

Answer: Previous draft—parent slot wasn’t reset. Reset parent draft on `noteId` change, or keep draft under the keyed child.

### REACT-084 — An async effect cannot return a cleanup

**Difficulty:** Senior

**Category:** Effects

**Question:**

`useEffect(async () => { ...; return () => controller.abort(); }, [userId])` while fetch is in flight and `userId` changes. What cleanup runs, and what does the inner `return` actually return?

**Answer:**

`async` effect returns a Promise—React doesn’t treat it as cleanup (warns). The abort function is the Promise’s resolution, never registered. Previous fetch keeps going. Use a sync effect that starts an inner async function and returns abort synchronously.

**Code:**

```tsx
useEffect(() => {
  const c = new AbortController();
  (async () => {
    try { setUser(await fetchUser(userId, c.signal)); }
    catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e);
    }
  })();
  return () => c.abort();
}, [userId]);
```

**Follow-up:**

Cleanup aborts but `fetchUser` ignores the signal. Can `setUser` still run?

Answer: Yes—use an ignore flag in the same setup’s closure, or make the API honor the signal.

### REACT-085 — Cleanup must remove the listener it added

**Difficulty:** Senior

**Category:** Effects

**Question:**

`shortcut` `"a"` → `"b"`. Cleanup does `removeEventListener("keydown", () => {})`. How many listeners remain, which keys call `run`, and what must corrected cleanup close over?

**Answer:**

Two listeners—cleanup removed a different function. Both `"a"` and `"b"` still call `run`. Correct: `removeEventListener("keydown", onKey)` with the same `onKey` this setup added (closes over old shortcut). That’s intentional.

**Code:**

```tsx
return () => window.removeEventListener("keydown", onKey);
```

**Follow-up:**

Two effects both register `keydown` correctly. Order when `shortcut` changes?

Answer: Cleanups in declaration order, then setups in declaration order. Each removes only its own previous function.

### REACT-086 — The aborted request's finally clears the next loading flag

**Difficulty:** Senior

**Category:** Effects

**Question:**

`userId` `"a"` → `"b"` mid-flight. `"b"` started; `"b"` not resolved yet. What is `loading`, and which callback set it, if `finally` always `setLoading(false)`?

**Answer:**

`loading` is `false` while `"b"` is in flight: `"b"` set `true`, then `"a"`’s aborted promise `finally` set `false`. AbortError catch doesn’t skip `finally`. Skip clearing when `controller.signal.aborted`, or derive `loading` from `snapshot?.userId !== userId` so aborted requests have no flag to clear. Don’t reuse one AbortController across setups.

**Follow-up:**

`useRef(new AbortController())` aborted on every cleanup. What does `"b"` fetch do?

Answer: Starts already aborted—`abort()` doesn’t reset. Create a new controller each setup.

### REACT-087 — A missing selection is cleared during render

**Difficulty:** Advanced

**Category:** Derived state

**Question:**

`selectedId` is state; parent removes that item. Effect clears when missing. What shows first, and how clear before paint without copying `items` into state?

**Answer:**

Effect runs after paint—user can see an invalid id. During render: if `selectedId` isn’t in `items`, `setSelectedId(null)`; React restarts before paint. Condition must become false next pass. Don’t store `items` in state.

**Code:**

```tsx
if (selectedId !== null && !items.some((i) => i.id === selectedId)) {
  setSelectedId(null);
}
```

**Follow-up:**

Product wants first remaining item when current disappears—without an effect?

Answer: Compute `nextId`; if `nextId !== selectedId`, `setSelectedId(nextId)` during render.

### REACT-088 — The total is derived during render

**Difficulty:** Intermediate

**Category:** Derived state

**Question:**

`lines` is state; `total` is a second slot set in an effect from `reduce`. What can a commit show, and what should you compute instead? When cache?

**Answer:**

Can paint `0` then the real sum after paint—stale every change. Compute `lines.reduce(...)` during render. Cache (`useMemo`) only if profiled expensive; a number doesn’t need identity stabilization. Don’t put pure sums in effects.

**Code:**

```tsx
const total = lines.reduce((sum, line) => sum + line.price, 0);
```

**Follow-up:**

User types a tip percent. What’s state?

Answer: Tip percent is state. Merchandise total and payable amount are derived during render from `lines` and that percent.

### REACT-089 — Context consumers re-render without a selector

**Difficulty:** Senior

**Category:** Context

**Question:**

Provider value `{ user, notifications }` allocated each render. Notifications update; `memo(AccountName)` reads only `user.name` via context + `useMemo` on the name. Does the function run? What does that `useMemo` skip?

**Answer:**

It runs—context identity changed; `memo` doesn’t filter context. Inner `useMemo` only skips recomputing the string after the function already ran. Split contexts or use a store snapshot. React 18 `useContext` has no selector.

**Follow-up:**

Provider memoizes `{ user, notifications }` and notifications array is unchanged. Does AccountName run from context?

Answer: No—same object identity. Still runs if its parent rendered it.

### REACT-090 — Hooks stay above any early return

**Difficulty:** Intermediate

**Category:** Hooks

**Question:**

First render has `user`; later `user={null}` returns before `useState`. What’s wrong? Where can `useState` be called? What if moved into `onEdit`?

**Answer:**

Hook count changes → React throws. Call hooks unconditionally before branches, or render a child that owns the hooks and omit the child when signed out. Hooks in event handlers have no dispatcher—illegal. Initializer doesn’t re-seed on later `user` while the parent stays mounted.

**Code:**

```tsx
if (user === null) return <p>Signed out</p>;
return <SignedInEditor user={user} />;
```

**Follow-up:**

`useDraft(user)` only in the signed-in branch—does the `use` name make it legal?

Answer: No—still a conditional hook count. Call it every render or only inside the mounted child.

### REACT-091 — A custom hook does not share state across rows

**Difficulty:** Senior

**Category:** Custom hooks

**Question:**

`Checklist` maps `tasks` and calls `useToggle` inside the map. Each row should be independent; two checklists mustn’t flip together. What does React do with the map? Where does each boolean live? Does a module `let on` help?

**Answer:**

Variable-length hook calls break order/count. Put `useToggle` in `TaskRow`; map renders rows. Each mounted row/component has its own slots—same hook function ≠ shared state. Module `let` is one mutable binding that doesn’t re-render anyone. Share via parent state/context/store only when the product needs it.

**Follow-up:**

Hook takes `task` and returns the same `on` across checklists. What React feature is that?

Answer: None—you’re hiding a store/map + subscription (or shared context). Per-call `useState` stays separate.

### REACT-092 — Setters in one effect body commit together

**Difficulty:** Senior

**Category:** Batching

**Question:**

On mount: sync `setCount`/`setReady` in the effect, then a `fetch` `then` with `setBoot`/`setReady`. How many renders for each group on React 18 `createRoot` vs React 17? `ignore` stays false.

**Answer:**

Sync pair: one render (batched in effects since 17 too)—after the mount paint. Promise pair: one render on 18 `createRoot`; two on React 17 / legacy `ReactDOM.render`. Await/`flushSync` splits batches. Mount render itself doesn’t include effect updates.

**Follow-up:**

`then` does `setBoot`, `await log`, then `setReady`. How many renders on 18?

Answer: Two—`await` starts a new task/batch. Keep setters on the same side of await when they should paint together.

### REACT-093 — useDeferredValue compares its argument with Object.is

**Difficulty:** Senior

**Category:** Hooks

**Question:**

`useDeferredValue({ text })` allocated each render. User types, then a banner re-render with unchanged `text`. What does the hook compare, and what should the slow child receive?

**Answer:**

Compares with `Object.is`. Fresh `{ text }` looks new even when the string didn’t—banner re-render schedules deferred work again. Pass `useDeferredValue(text)` (the primitive). Build objects in the child from the deferred string. Pending hint: `text !== deferredText` on strings.

**Code:**

```tsx
const deferredText = useDeferredValue(text);
return <SlowList text={deferredText} />;
```

**Follow-up:**

Parent does `useDeferredValue(items.filter(...))` every render. Banner re-render—what reaches the child?

Answer: A new array → deferral sees a change. Defer the text; filter from the deferred string.

### REACT-094 — getSnapshot returns a cached snapshot

**Difficulty:** Advanced

**Category:** External stores

**Question:**

`useOnline` uses `useSyncExternalStore`. What’s wrong if `getSnapshot` returns `{ online: navigator.onLine }` every call? Why not subscribe in `useEffect`? Server-rendered?

**Answer:**

New object every read → React thinks the store always changed (warn/loop). Return a boolean or a cached object until the value changes. Store hook reads during render for concurrent consistency; effects subscribe after paint and can tear. Pass `getServerSnapshot` for SSR/hydration.

**Code:**

```tsx
function getSnapshot() { return navigator.onLine; }
function getServerSnapshot() { return true; }
return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
```

**Follow-up:**

Cached object mutated in place (`snapshot.online = ...`) then notify. What does the next render see?

Answer: Same reference → may skip update while data changed. Allocate a new object when the value changes.

### REACT-095 — startTransition does not follow an await

**Difficulty:** Senior

**Category:** Scheduling

**Question:**

`startTransition(async () => { setQuery(next); const rows = await search(next); setRows(rows); })`. When is `isPending` true, and which `setRows` is a transition?

**Answer:**

Only sync updates inside the callback are transitions—`setQuery` is; after `await`, `setRows` is urgent. `isPending` tracks unfinished transition renders, not network time—can go false while search still runs. Use status state for a request spinner; wrap `setRows` in another `startTransition` after await if the list render should be interruptible. Set urgent query outside the transition if the input must update immediately.

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

Answer: Ready while previous rows still show until the transition commits. Put status with `setRows` in the same transition when that pairing matters.

### REACT-096 — The reducer init function runs when the slot is created

**Difficulty:** Intermediate

**Category:** Reducers

**Question:**

`useReducer(reducer, userId, init)` stays mounted; parent passes `"a"` then `"b"`. What’s `state.userId` after the second render? Which of init/reducer/draft reset run for that prop change?

**Answer:**

Still `"a"`—`init` only on create; no dispatch → reducer doesn’t run; draft untouched. Reset with `key={userId}` (new slot) or a during-render `reset` dispatch comparing prop to `state.userId`. Effect reset paints the old draft first. Strict Mode may double-call `init` on mount only.

**Follow-up:**

`init` reads `localStorage` for that userId. Strict Mode vs later `userId` change?

Answer: Strict Mode double-calls on mount—must be pure reads. Later prop change does not call `init`; restore via reset/key remount.

### REACT-097 — Two useState calls in one component share its render

**Difficulty:** Senior

**Category:** State

**Question:**

One component holds rare `theme` and high-frequency `cursor` in one reducer. Teammate says two `useState` stops the theme label re-rendering. What still runs, and what actually separates renders?

**Answer:**

Any state update re-renders that component—splitting hooks isn’t a boundary. Move `cursor` into a child that owns it (or `memo` a theme child with a stable theme prop if the parent must keep cursor). Don’t pass the whole reducer state object into a memoized label.

**Follow-up:**

`Frame` must read `cursor` to disable a button. Where does cursor go?

Answer: Lifts to `Frame`; Decoration takes it as a prop. Theme label then needs `memo`/context/`children` so it isn’t forced by cursor updates.

### REACT-098 — useInsertionEffect runs before layout effects

**Difficulty:** Senior

**Category:** Effects

**Question:**

CSS-in-JS must inject rules before a product `useLayoutEffect` measures. Why `useInsertionEffect` vs layout/passive effects? What’s forbidden?

**Answer:**

Runs synchronously before any layout effect so measurements see the new CSS. Passive is after paint (wrong styles). Same-phase layout effects can run before your insertion depending on tree order. Forbidden: scheduling updates / using it for fetch or subscriptions. Doesn’t run on the server—libraries collect styles during SSR separately.

**Code:**

```tsx
useInsertionEffect(() => {
  const style = document.createElement("style");
  style.textContent = rules;
  document.head.appendChild(style);
  return () => document.head.removeChild(style);
}, [rules]);
```

**Follow-up:**

`rules` is a new string every render though declarations didn’t change. What happens?

Answer: Remove/insert style every commit. Memoize the rule string when content is unchanged.

### REACT-099 — A hook around useContext does not select

**Difficulty:** Senior

**Category:** Custom hooks

**Question:**

`useUserName` returns `useContext(AppContext).user.name`. Header and Sidebar both call it. Provider value is a new `{ user, notifications }` object; name unchanged. Who renders, and what would a real selector subscribe to?

**Answer:**

Both render—custom hooks don’t intercept subscriptions; each caller is a full-value consumer. Returning the name filters JS, not updates. Real select: split context, or `useSyncExternalStore` whose snapshot is the cached name string.

**Follow-up:**

Hook also `useState`s the last name and effects copy from context. Does Header skip notification updates?

Answer: No—context still renders Header; effect may bail the state update after the fact. Split/subscribe to a name snapshot.

### REACT-100 — A null draft leaves the prop on screen

**Difficulty:** Intermediate

**Category:** Derived state

**Question:**

Show `email` until the user types; later props should appear while untouched; keep typed value across new `email`. What’s wrong with `useState(email)` + effect sync, and what state means “hasn’t typed”?

**Answer:**

Initializer ignores later props; effect overwrites typed drafts after paint and can’t distinguish “typed same as prop” from “untouched.” Store `string | null`; `null` = no override; display `draft ?? email`. `onChange` stores the string (even if equal to email). Reset sets `null`.

**Code:**

```tsx
const [draft, setDraft] = useState<string | null>(null);
const value = draft ?? email;
```

**Follow-up:**

`userId` changes while `draft` is `"hello"`. What shows, and how reset for a new entity?

Answer: Still `"hello"` over the new email. Remount with `key={userId}`, or set `draft` to `null` during render when the id changes.
