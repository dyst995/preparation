# R02 — Hooks and state management

React 18. Questions REACT-051–REACT-100.

### REACT-051 — Each hook slot stores a different thing

**Difficulty:** Intermediate

**Category:** Hooks

**Question:**

A function component calls `useState`, `useReducer`, `useRef`, `useMemo`, `useCallback`, `useEffect`, and `useContext` in that order every render. What does React keep for each call, and which may do work again on the next render?

**Answer:**

React keeps one slot per hook call and matches them by call order, so the order must never change.

`useState` and `useReducer` store the current value and a stable setter or `dispatch`. Their initial values are computed only when the slot is created. `useRef` returns the same `{ current }` object every time. `useMemo` and `useCallback` recompute only when a dependency changes. `useEffect` stores the setup function and dependencies, and runs after commit, not during render. `useContext` reads the nearest provider's value and subscribes to it.

**Trade-offs:**

Several `useState` for independent fields; one `useReducer` for one transition; refs for non-painting values; memo/callback only when identity matters.

**Follow-up:**

`useState(expensive())` vs `useRef(expensive())` on the second render?

Answer: Both call `expensive()` on every render. `useState` ignores the result after the first render, and you can use `() => expensive()` to initialize lazily. `useRef` has no lazy form, so it keeps the first `current` and discards later results.

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

`useState` replaces state. It does not merge.

`onTitle` sets `{ title: "A" }`, and `body` is gone. `onBody` uses an updater with a spread, so it keeps `title` and gives `{ title: "", body: "B" }`.

`applyBoth` queues two replacements that both start from this render's `draft`. The second one wins, so the result is `{ title: "", body: "B" }`, and the title change is lost.

To make the second call build on the first, use a functional updater so it receives the pending state.

**Code:**

```tsx
setDraft((prev) => ({ ...prev, title: "A", body: "B" }));
```

**Follow-up:**

Nested `author.city`: spread new `author` vs reuse `prev.author` then mutate—which leaves previous state unchanged?

Answer: The nested spread. If you reuse `prev.author` and mutate it, the old and new state share the same object, so the change shows up in both.

### REACT-053 — The updater reads the pending state

**Difficulty:** Intermediate

**Category:** State

**Question:**

`count` is `0`, `history` is `[]`. `onSave` runs twice; both `await save()` before either setter. Compare bare setters vs functional `setCount` with `setHistory` still using closed-over `count + 1`. Why is nested `setHistory` inside the count updater a bad fix?

**Answer:**

Both handlers started with `count` as `0` and `history` as `[]`. After the awaits, plain setters both write `1` and `[1]`, so one save is lost.

With `setCount(c => c + 1)`, the count correctly reaches `2`. But `setHistory` still uses the stale `count + 1`, so history becomes `[1, 1]`.

Putting `setHistory` inside the count updater is a bad fix. Updaters must be pure, and Strict Mode can call them twice, causing duplicate updates.

A better approach is a single reducer that handles "increment and append that number" together.

**Code:**

```tsx
setCount((c) => c + 1);
setHistory((h) => [...h, h.length + 1]);
```

**Follow-up:**

How do you store a function in `useState` and replace it with one that returns `1`?

Answer: React treats a function passed to the setter as an updater. So initialize with `() => () => 0`, and use `setFn(() => () => 1)`. If you write `setFn(() => 1)`, React stores `1`, not a function.

### REACT-054 — The interval keeps the first render's values

**Difficulty:** Senior

**Category:** Effects

**Question:**

`<Ticker step={1} />` later gets `step={5}` without remounting. With `useEffect(..., [])` calling `setCount(count + step)`, what does `count` do? What if deps are `[count, step]`? What if `setCount((c) => c + step)` with `[step]`?

**Answer:**

An effect uses the values from the render that created it. With `[]`, the interval was created on mount, so it always sees `count = 0` and `step = 1`. Each tick sets `count` to `1`, and after that nothing changes. It never sees `step = 5`.

With `[count, step]`, the values are fresh, but the interval is torn down and recreated on every tick, so the timer keeps resetting.

The best option is `setCount(c => c + step)` with `[step]`. It uses the latest count and only restarts when `step` changes.

**Code:**

```tsx
useEffect(() => {
  const id = setInterval(() => setCount((c) => c + step), 1000);
  return () => clearInterval(id);
}, [step]);
```

**Follow-up:**

With `[step]` and functional setCount, what does `console.log(count)` next to it print after three ticks?

Answer: It prints `0`, `0`, `0`, because the log reads the value from the render that created the effect. The real committed count is `3`. Log inside the updater or in a separate effect on `count` to see the latest value.

### REACT-055 — An empty dependency list freezes the closure

**Difficulty:** Senior

**Category:** Effects

**Question:**

`query` is state; the fetch effect lists `[]`. A teammate deletes the exhaustive-deps warning so it “runs only on mount.” The user types. What runs, what is stale, and when is `[]` honest?

**Answer:**

With `[]`, the effect runs once on mount and keeps using the `query` from that first render. When the user types, the screen shows the new query, but the request was made with the old one, so results are stale.

The dependency list is not a way to choose when to run. It should list every value the effect reads.

`[]` is honest only when the effect reads nothing that changes, or when it reads the latest values through refs.

Here, use `[query]` with a cleanup that aborts or ignores outdated requests.

**Follow-up:**

Effect calls `load(query)`; `load` is defined in the component and passed to a child. Adding `load` refetches every keystroke even when `query` is unchanged. What dependency is changing?

Answer: The identity of `load`. It is a new function on every render. Define it inside the effect and depend on `[query]`, or wrap it in `useCallback` with `[query]`.

### REACT-056 — Passive effects run after the paint opportunity

**Difficulty:** Senior

**Category:** Effects

**Question:**

A component commits a new `userId`. It has `useEffect([userId])` and a previous cleanup. When do cleanup and setup run relative to DOM update and paint? What does Strict Mode do on first mount, and what runs on the server?

**Answer:**

React first updates the DOM and runs layout effects. Then the browser gets a chance to paint. After that, React runs passive effects: first the cleanup from the previous `userId`, then the new setup.

This means the user can see the new `userId` on screen before the new fetch starts.

`useEffect` never runs on the server. In development, Strict Mode mounts the effect, cleans it up, and mounts it again to catch missing cleanup.

For one-time actions like a POST, use an event handler, not an effect.

**Follow-up:**

Effect calls `setUser` and `setLoading(false)` in the same setup. How many extra renders, and can the user see loading from the render that started the fetch?

Answer: The two updates are batched into one extra render. The earlier render had already been painted with its own loading flag. The effect's `setLoading(false)` only affects a later render.

### REACT-057 — Layout effects run before the browser paints

**Difficulty:** Senior

**Category:** Layout effects

**Question:**

A tooltip measures with `getBoundingClientRect` then `setTop`. What does the user see with `useEffect` vs `useLayoutEffect`? Why is layout effect wrong for a fetch?

**Answer:**

`useLayoutEffect` runs after React updates the DOM but before the browser paints. If it calls `setTop`, React re-renders immediately, so the user only sees the corrected position.

With `useEffect`, the browser may paint the tooltip at the old position first, then move it, which looks like a flash.

A fetch should use `useEffect`. Layout effects block painting, and a network request finishes later anyway, so blocking gains nothing.

Layout effects do not run on the server. The client fixes the layout after hydration.

**Code:**

```tsx
useLayoutEffect(() => {
  const next = anchorRef.current?.getBoundingClientRect().bottom ?? 0;
  setTop((prev) => (prev === next ? prev : next));
}, [anchorRect]);
```

**Follow-up:**

Layout effect always `setTop({ y: measured })` with a new object even when the pixel is unchanged. What happens?

Answer: It causes endless nested updates, because every call creates a new object that React sees as a change, until React stops with a maximum update depth error. Store a number, or return the previous value when nothing changed.

### REACT-058 — The effect writes a new object into its own dependency

**Difficulty:** Advanced

**Category:** Effects

**Question:**

Mount with `filters = { q: "", page: 1 }`. Effect does `setFilters({ q: filters.q, page: 1 })` with `[filters]`. Nothing typed. What happens, and which dependency stops the loop without an extra render?

**Answer:**

This creates an infinite loop. The effect builds a new object and sets it as state. Even if the fields are identical, `Object.is` sees a different reference, so React re-renders. The dependency `filters` has changed, so the effect runs again, and it keeps going until React hits the maximum update depth.

The best fix is to remove the effect, because the change handler can already reset `page` to `1`.

If you must keep it, depend on `[filters.q]` and return the previous state if `page` is already `1`.

**Code:**

```tsx
useEffect(() => {
  setFilters((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
}, [filters.q]);
```

**Follow-up:**

Deps stay `[filters]` but body uses the bailout updater. Does mount still loop?

Answer: No. The updater returns the same reference, so React skips the render and the effect does not run again. It is still better to do this in the event handler.

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

### REACT-060 — A reducer returns the next state for one slot

**Difficulty:** Intermediate

**Category:** Reducers

**Question:**

`count` and `history` must change together on `"saved"` / `"reset"`. Why is `useReducer` better than two `useState` setters? What about `dispatch`, the reducer, and `init`?

**Answer:**

With `useReducer`, one action produces the whole next state, so `count` and `history` always change together. With two separate setters, each updater only sees its own slot's pending value, so they can easily drift apart.

`dispatch` has a stable identity. React runs the reducer from the render that processes the update. The optional `init(initialArg)` function runs only when the state is first created.

In Strict Mode, React may call `init` and the reducer twice in development, so both must be pure.

**Code:**

```tsx
case "saved": {
  const count = state.count + 1;
  return { count, history: [...state.history, count] };
}
```

**Follow-up:**

Reducer inside the component reads `props.step`. Effect with `[]` dispatches once. Which `step` applies if the parent already passed a new step?

Answer: The `step` from the render that processes the dispatch, not the one from the effect's closure. If the action should use the step at the moment of the click, put it in the action itself.

### REACT-061 — Mutating and returning the same state skips the render

**Difficulty:** Senior

**Category:** Reducers

**Question:**

Reducer does `state.items.push(item); return state`. User dispatches once with `"a"`. What does the screen show in production? What does Strict Mode add? What should it return?

**Answer:**

The reducer returns the same state reference, so React's `Object.is` check says nothing changed and skips the re-render. The array was mutated, but the screen still shows no items.

In development, Strict Mode calls the reducer twice, so `"a"` is pushed twice into the mutated array, and still nothing renders.

A reducer should return a new object, such as `{ items: [...state.items, item] }`.

Returning the same state on purpose is fine when nothing should change. That is a correct way to skip an update.

**Code:**

```tsx
function reducer(state: State, item: string): State {
  return { items: [...state.items, item] };
}
```

**Follow-up:**

Pure reducer returns `state` when item exists. Parent re-renders with a new `title`. Does this component run, and does the list reset?

Answer: The component runs, because its parent rendered it. The bailout only skips the update from the dispatch. The list does not reset. Use `memo` if you want to skip renders caused by the parent.

### REACT-062 — The ref object is stable and writes do not render

**Difficulty:** Intermediate

**Category:** Refs

**Question:**

`const ref = useRef(0)` across re-renders. What’s stable? Click does `ref.current += 1` with no setter—what shows, and what does a later render see? When does React write `current`?

**Answer:**

`useRef` returns the same object for the whole life of the component. The initial value is only used when it is first created.

Changing `ref.current` does not cause a re-render, so the screen does not update. A later render, triggered by something else, will see the new value.

When you attach a ref to an element like `<div ref={ref}>`, React sets `current` to the DOM node during commit, and back to `null` on unmount. This also does not cause a render.

Don't use `ref.current` to decide what to render.

**Follow-up:**

Inline `ref={(node) => { nodeRef.current = node }}` while parent re-renders. Does React clear the node?

Answer: Yes. Each render creates a new callback, so React calls the old one with `null` and the new one with the node. Prefer `ref={nodeRef}` or a stable `useCallback`.

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

### REACT-064 — useMemo caches a result while dependencies compare equal

**Difficulty:** Senior

**Category:** Memoization

**Question:**

When does `useMemo(() => filter(items, query), [items, query])` recompute vs reuse? When is it the wrong fix? Does it make the child skip rendering?

**Answer:**

`useMemo` remembers the result of a calculation. It recomputes only when a dependency changes by `Object.is`. Otherwise it returns the same value, with the same reference.

It does not stop children from rendering. It only keeps the value stable.

Use it for work you have measured to be expensive, or when you need a stable reference for a hook dependency, a `memo` child's prop, or a context value.

It can't help if `items` is a new array every render. If you forget a dependency, the UI goes stale. Keep the function pure.

**Follow-up:**

Memoized `visible` is an effect dep. `query` changes every keystroke. How often does the effect run vs without `useMemo`?

Answer: Once per keystroke in both cases, because `query` really changes. Without `useMemo`, unrelated re-renders would also create a new array and re-run the effect.

### REACT-065 — useCallback preserves the closure from the render that created it

**Difficulty:** Senior

**Category:** Callbacks

**Question:**

`SaveButton` uses `useCallback(() => save(docId)..., [])`. Prop becomes `docId="b"`, then click. Which id is sent? What does `[docId]` change? What doesn’t `useCallback` do?

**Answer:**

With an empty dependency list, the callback is created once and keeps the `docId` from mount, so it saves `"a"`.

With `[docId]`, React makes a new callback when `docId` changes, so the click sends `"b"`.

`useCallback` doesn't make the function faster, delay it, batch it, or look inside it. It just returns the same function reference while the dependencies stay the same. It is like `useMemo` for functions.

If nothing needs a stable function identity, a plain inline handler is simpler.

**Code:**

```tsx
const onClick = useCallback(() => {
  save(docId).then(() => setSaved(true));
}, [docId]);
```

**Follow-up:**

List is `[docId]`; handler uses closed-over `saved` omitted from deps. After first save, second click—what does it see?

Answer: It still sees `saved` as `false`, because it uses the value from the render that created the callback. Fix it by including `saved` in the dependencies, or by using a functional update.

### REACT-066 — The memoized child still sees a new callback

**Difficulty:** Advanced

**Category:** Memoization

**Question:**

`memo(Row)` gets `onSelect` from `useCallback(..., [ids])`. Same `ids` ref, then `setSelected`. Which Rows run? Fresh parent `ids` array? Without `useCallback`?

**Answer:**

If `ids` has the same reference, `useCallback` returns the same `onSelect`, so `memo` lets every Row skip rendering.

If the parent creates a new `ids` array, `useCallback` makes a new `onSelect`, even if the callback does not actually use `ids`, and every Row re-renders.

Without `useCallback`, the list creates a new function on every render, so all Rows render every time.

The honest dependency list here is `[]`, because `setSelected` is stable. `memo` and `useCallback` only work well together.

**Code:**

```tsx
const onSelect = useCallback((id: string) => setSelected(id), []);
```

**Follow-up:**

Functional toggle `setSelected(curr => curr === id ? null : id)` with `[]`. Why no `selected` dep?

Answer: The updater gets the latest state as an argument, so the callback never needs to close over `selected`. If you read `selected` directly with `[]`, it would be stuck on its first value.

### REACT-067 — useContext reads the nearest value by identity

**Difficulty:** Intermediate

**Category:** Context

**Question:**

Provider passes `value={theme}` (`"dark"`). `Title` calls `useContext(ThemeContext)`. What returns, when does it re-render, and what if value is `{ theme, user }` but Title only needs `theme`?

**Answer:**

`useContext` returns the value of the nearest provider above, which is `"dark"` here. The default value is only used when there is no provider.

The component re-renders when the provider's value changes according to `Object.is`.

In React 18, there is no way to subscribe to only part of a context. If the value is a new `{ theme, user }` object, `Title` re-renders even when `theme` is the same. `memo` doesn't help, because it only compares props.

**Follow-up:**

`memo(Title)`, stable props, same string `"dark"` vs `value={{ theme: "dark" }}` each render?

Answer: The same string does not notify consumers. A new object on every provider render makes `Title` re-render each time.

### REACT-068 — Values that change at different rates need different providers

**Difficulty:** Senior

**Category:** Context

**Question:**

One value `{ theme, cursor }`. Theme rare; cursor every move. `ThemeLabel` and `CursorDot` both `useContext` that object. What re-renders on a move, and how structure providers so the label doesn’t?

**Answer:**

Every component that reads that context re-renders whenever the object changes. When the cursor moves, `ThemeLabel` re-renders too, even though theme is unchanged.

Split the data into two contexts, one for `theme` and one for `cursor`, so each consumer subscribes only to what it needs.

Keep the state in a component that renders both providers and receives the rest of the page as `children`. Then a cursor update does not recreate the page's elements.

Each context's value still needs a stable identity.

**Code:**

```tsx
<ThemeContext.Provider value={theme}>
  <CursorContext.Provider value={cursor}>{children}</CursorContext.Provider>
</ThemeContext.Provider>
```

**Follow-up:**

`{ state, dispatch }` in one context; toolbar only needs `dispatch`. Does it re-render on keystrokes?

Answer: Yes, because the context value is a new object whenever state changes. Put the stable `dispatch` in its own context, or pass it as a prop.

### REACT-069 — Each custom hook call has its own state

**Difficulty:** Intermediate

**Category:** Custom hooks

**Question:**

`Panel` calls `useToggle()` twice. Toggle `a`—what happens to `b`? Why no shared boolean? What if `useToggle` runs only when `enabled`?

**Answer:**

Toggling `a` doesn't affect `b`. A custom hook is just a function that calls other hooks. Each call adds its own `useState` and other slots to the component's hook list, so each call has its own state.

Hooks share logic, not data.

Calling a hook conditionally changes how many hooks run and their order between renders, which breaks the rules of hooks.

If the toggle should only exist sometimes, move it into a child component and render or unmount that child.

**Follow-up:**

Module `Map` keyed by string plus `useState` for first value. Two Panels call `useToggle("power")`. Do they share?

Answer: The Map can hold shared data, but each `useState` is separate, and writing to the Map does not re-render the other panel. For real sharing, you need context or a subscribed store.

### REACT-070 — The hook's effect belongs to the caller

**Difficulty:** Senior

**Category:** Custom hooks

**Question:**

`useDocumentTitle(title)` sets `document.title` and restores on cleanup. Two mounted callers, different titles—who wins? What does the hook guarantee vs a plain helper? What belongs in deps?

**Answer:**

Each caller has its own effect, and there is only one browser title. The effect that runs last wins. Parent effects run after child effects, so the parent usually wins.

Cleanup restores whatever title existed when that effect started, which can overwrite another component's title.

The hook gives you a proper lifecycle and lint support, but it doesn't manage multiple owners. It is not a title stack.

Use `[title]` as the dependency. Either document that there should be only one owner, or build an explicit stack.

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

Answer: Keep `onChange` in a ref and depend only on `[title]`. If you list `onChange`, the effect re-runs and rewrites the title on every parent render.

### REACT-071 — Derived data is computed during render

**Difficulty:** Intermediate

**Category:** Derived state

**Question:**

`visible` is state seeded from `items`, then an effect filters by `query`. What can the user see between commits, and why is the effect wrong? Where would `useMemo` belong?

**Answer:**

The first paint can show the unfiltered `items`. The effect only runs after paint and then updates state, so each change to `query` shows a wrong frame first.

Anything you can calculate from props and state should be calculated during render, like `items.filter(...)`. That is always in sync.

Only add `useMemo` if the calculation is expensive and measured, or if you need a stable reference. It also runs during render, so there is no flash.

**Code:**

```tsx
const visible = items.filter((item) => item.name.includes(query));
```

**Follow-up:**

“Hide row” removes an id without changing `items`/`query`. What’s state vs derived?

Answer: The set of hidden ids is state. `visible` stays derived: filter by query, then remove hidden ids. Don't patch a stored filtered array.

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

### REACT-073 — State sits at the lowest common owner

**Difficulty:** Staff-Level

**Category:** State architecture

**Question:**

Canvas + word count need the draft; modal open is local; theme is rare and distant; pointer is one decoration and high-frequency. Where does each live, and what’s the cost of one context for all four?

**Answer:**

State should live as low as possible, but high enough for everyone who needs it.

The draft goes in the lowest common parent of the canvas and word count, passed down as props. The modal flag stays next to the button or menu until another component needs it. Theme is rare and widely used, so context fits. The pointer position stays inside the one decoration that uses it.

One context for everything would wake every reader on any change, so pointer moves would re-render themed trees. Place state first, then memoize.

**Follow-up:**

Word count is slow, canvas cheap, both need draft. Cut render without duplicating draft?

Answer: Keep one draft in the parent. Wrap `WordCount` in `memo` if the parent re-renders for other reasons, or debounce a derived preview. Don't keep two copies of the same data.

### REACT-074 — A fetched user and a draft are different facts

**Difficulty:** Staff-Level

**Category:** State architecture

**Question:**

Detail and list each `useState` a fetched user; list stays stale after detail saves. Detail also copies `user.email` into a draft via effect. What owns the server fact vs draft? Why is one context of the whole response a weak fix?

**Answer:**

The fetched user is a server fact, so it needs one source of truth, such as a cache keyed by user id. Detail and list both subscribe to it, for example with `useSyncExternalStore`, so a save updates both.

The draft is a different fact. It belongs to the editor, starts from the server data, and resets with a `key` or a render-time adjustment, not by always copying from the fetch.

One context holding the whole response re-renders every reader on any field change. Per-id store snapshots are more precise, and `getSnapshot` must return a stable reference until the data changes.

**Follow-up:**

PUT body omits `displayName` the cache had. What if you store the body as the whole record?

Answer: The list loses `displayName`. Merge the response into the existing record in one shared `writeUser` function, following the API contract, instead of handling it per screen.

### REACT-075 — The handler ref was frozen on mount

**Difficulty:** Advanced

**Category:** Effects

**Question:**

`useWindowEvent` updates `handlerRef` in an effect with `[]`, subscription with `[type]`. Parent passes a new handler; `type` stays `"resize"`. Which handler runs, and what’s the smallest fix that keeps the listener and calls the latest?

**Answer:**

The handler from the first render keeps running. The ref was updated only once on mount because its effect has `[]`, so later handlers from the parent are never stored.

The smallest fix is to remove the dependency list on that assignment effect, so it runs after every commit and updates the ref. Keep `[type]` on the listener effect, so the listener is only attached again if the event type changes.

Do not add `handler` to the subscription's dependencies, or you would re-subscribe on every render.

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

Answer: No. `handlerRef` is stable, so it doesn't cause re-binding. If the effect only reads `handlerRef.current` later, the linter asks for `type`, not `handler`.

### REACT-076 — One save action returns the status and the error together

**Difficulty:** Senior

**Category:** Reducers

**Question:**

Separate `status` / `error` slots. Handler sets `"saving"`, on success `"saved"`, on catch only `setError`. Which illegal screens can commit, and how does one reducer fix pairs?

**Answer:**

With separate slots, you can end up in states that should not exist. The screen can show "saving" with an old error. After a failure, it can stay on "saving" forever because only the error was set. Or it can show "saved" with a leftover error message.

A reducer fixes this by always returning a complete pair. `saveRequested` returns `{ status: "saving", error: null }`, and success or failure sets or clears the error together with the status.

Keep the draft in separate state. Awaiting between dispatches is fine.

**Follow-up:**

After `saveSucceeded`, user typed during the request. What about the draft?

Answer: Leave the newer draft alone. If you need to know what was sent, store a copy of the text when `saveRequested` happens.

### REACT-077 — The second dispatch is applied to the pending state

**Difficulty:** Senior

**Category:** Reducers

**Question:**

`items` starts `[]`. One click: dispatch `"a"`, then dispatch item based on `state.items.length === 0 ? "first" : "later"`. What’s committed, what does the second reducer receive, and what’s `state.items` after the first `dispatch` returns?

**Answer:**

Both dispatches are batched, and the result is `["a", "first"]`. The second reducer call does receive the pending state `["a"]`. But the handler chose the item `"first"` from `state`, which is this render's empty array.

`dispatch` returns nothing, and the handler's `state` variable never changes during the handler.

If the decision depends on the latest state, make it inside the reducer, or combine both items into one action.

**Follow-up:**

`await save()` between the two dispatches. What does the second reducer receive?

Answer: The first batch may already be committed as `["a"]`, so the second reducer sees that. But the handler's `state` variable is still from the old render, so don't build payloads from it after an `await`.

### REACT-078 — useId is stable for one mount and matches hydration

**Difficulty:** Intermediate

**Category:** Hooks

**Question:**

`EmailField` uses `useId` for `htmlFor`/`id`. It re-renders on typing; a second field mounts; page SSR+hydrates. What’s stable/unique, and why not `Math.random()`?

**Answer:**

`useId` gives a string that stays the same while the component is mounted, and each component instance gets a different one.

It also matches between the server and the client, because both walk the same component tree. That is why hydration works.

`Math.random()` would give different values on the server and the client, which causes a hydration mismatch and can break label connections.

`useId` is not a database key and is not stable across page visits. Call it unconditionally, like any hook.

**Follow-up:**

Two React roots both call `useId`. How avoid collisions?

Answer: Give each root a different `identifierPrefix` in `createRoot` or `hydrateRoot`. For hydrated roots, it must match what the server used.

### REACT-079 — useId is not a list key

**Difficulty:** Senior

**Category:** Hooks

**Question:**

Contacts have stable `contact.id`. Teammate wants React `key`, checkbox `id`, and `querySelector` from `useId`. Which is valid?

**Answer:**

Only the checkbox and label id is a good use. Inside the row component, `useId` gives a unique id for that instance.

The list `key` must be `contact.id`. A key represents the identity of the data, while `useId` represents the identity of a component instance.

`querySelector` is risky because `useId` values contain colons, which need escaping. Use `getElementById` or `CSS.escape`, or better, use a ref.

Never call `useId` inside the parent's `map`. Call it inside the row component.

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

Answer: Not needed. Call `useId` once and add a suffix, like `` `${labelId}-error` ``.

### REACT-080 — useImperativeHandle assigns the handle before paint

**Difficulty:** Senior

**Category:** Refs

**Question:**

Parent holds `inputRef` for `forwardRef` `FancyInput`. When is `inputRef.current` assigned, what’s it during parent render, and which deps keep `getValue` current?

**Answer:**

`useImperativeHandle` lets a child decide what the parent's ref exposes. React assigns it in a layout effect, after the DOM is updated and before paint, and clears it to `null` on cleanup.

During the parent's first render, `inputRef.current` is still `null`. Read it in a click handler or a layout effect instead.

With `[]` as dependencies, the handle's `getValue` keeps the closure from mount and becomes stale. Either list `value` so the handle is replaced, or read from a ref inside the handle and keep `[]`.

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

Answer: The handle is not assigned, but the child still renders normally. The methods are only for optional parent access.

### REACT-081 — The menu's open flag stays in the menu

**Difficulty:** Intermediate

**Category:** State architecture

**Question:**

`Page` holds `open` for a menu and also renders expensive `Editor`. Toggle re-renders `Editor`. Where should `open` live? What if a distant shortcut must toggle the same menu?

**Answer:**

Keep `open` in a `MenuWidget` component that owns both the button and the menu. Then toggling it only re-renders the menu, not `Page` or `Editor`.

Lift the state up only when a second component needs it, like the distant shortcut. Even then, make sure the expensive editor is passed in as `children` from a parent that doesn't hold `open`, so the editor element isn't recreated on each toggle.

`memo` can patch the problem, but good state placement removes it.

**Code:**

```tsx
function Page() {
  return (<><MenuWidget /><Editor /></>);
}
```

**Follow-up:**

Panel is in a portal; button is a sibling of `Editor`. Does the portal force `open` to `Page`?

Answer: No. State can stay in the component that renders both the button and the portaled panel. A portal changes where DOM nodes go, not where state lives. Only a shortcut forces lifting.

### REACT-082 — The shared query is lifted to the parent

**Difficulty:** Intermediate

**Category:** State architecture

**Question:**

`SearchBox` and `Results` each `useState("")` for query. User types `ada`. What does the list show, and what’s the smallest lift? Filter during render.

**Answer:**

The list still shows everything. `SearchBox` and `Results` each have their own state slot, so typing in one does not change the other.

The smallest fix is to move `query` to their common parent, `Page`. Pass `query` and `setQuery` down to `SearchBox`, and pass `query` to `Results`.

`Results` then filters during render with `items.filter(...)`. There is now one controlled query, and both components update in the same commit.

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

Answer: Keep a single query. Wrap `Results` in `memo`, so it skips renders when `items` and `query` are the same while the banner changes. Or move the banner out of `Page`.

### REACT-083 — A new key mounts a new copy of the state

**Difficulty:** Senior

**Category:** State

**Question:**

`<NoteEditor key={noteId} />`—user typed a draft, then `noteId` changes. What happens to draft, effects, and `NoteScreen` state? What if `key` is only on the inner `<textarea>`?

**Answer:**

When the key changes, React unmounts the old `NoteEditor`, runs its effect cleanups, and discards its state. It then mounts a new one with fresh state and new effects. State in the parent, `NoteScreen`, is unchanged.

If the key is only on the inner `<textarea>`, only that DOM element is replaced. The editor's own state and effects are kept.

A key resets the component it is placed on, and everything below it.

**Follow-up:**

Draft lifted to `NoteScreen`; editor still keyed. After navigate, what does the preview show?

Answer: The previous draft, because the parent's state was not reset. Either reset the parent draft when `noteId` changes, or keep the draft inside the keyed child.

### REACT-084 — An async effect cannot return a cleanup

**Difficulty:** Senior

**Category:** Effects

**Question:**

`useEffect(async () => { ...; return () => controller.abort(); }, [userId])` while fetch is in flight and `userId` changes. What cleanup runs, and what does the inner `return` actually return?

**Answer:**

An `async` function always returns a Promise. React expects an effect to return either nothing or a cleanup function, so it ignores the Promise and warns you.

The abort function you wrote ends up as the Promise's resolved value, and React never registers it. When `userId` changes, nothing aborts, and the old fetch keeps running.

Make the effect function synchronous. Start an inner async function inside it, and return the cleanup right away.

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

Answer: Yes, the request is not actually cancelled. Add an ignore flag in the same effect closure and check it before setting state, or make the API honor the signal.

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

### REACT-087 — A missing selection is cleared during render

**Difficulty:** Advanced

**Category:** Derived state

**Question:**

`selectedId` is state; parent removes that item. Effect clears when missing. What shows first, and how clear before paint without copying `items` into state?

**Answer:**

An effect runs after paint, so the user may briefly see a screen where the selected id points to an item that no longer exists.

Instead, check during render. If `selectedId` is not in `items`, call `setSelectedId(null)` in the render body. React discards that render and restarts before painting, so the invalid state never appears.

The condition must become false on the restarted render, or it will loop. Don't copy `items` into state to solve this.

**Code:**

```tsx
if (selectedId !== null && !items.some((i) => i.id === selectedId)) {
  setSelectedId(null);
}
```

**Follow-up:**

Product wants first remaining item when current disappears—without an effect?

Answer: Compute the id of the next item during render. If it differs from `selectedId`, call `setSelectedId(nextId)` right there.

### REACT-088 — The total is derived during render

**Difficulty:** Intermediate

**Category:** Derived state

**Question:**

`lines` is state; `total` is a second slot set in an effect from `reduce`. What can a commit show, and what should you compute instead? When cache?

**Answer:**

The screen can paint `0`, or an old total, first, and then show the right sum after the effect runs. That makes the total one step behind on every change.

A total is derived data, so compute it during render with `lines.reduce(...)`. It is always correct and needs no extra state.

Only use `useMemo` if you have measured that the calculation is expensive. A plain number does not need a stable identity.

Don't put pure calculations in effects.

**Code:**

```tsx
const total = lines.reduce((sum, line) => sum + line.price, 0);
```

**Follow-up:**

User types a tip percent. What’s state?

Answer: The tip percent is state. The merchandise total and the final amount are derived during render from `lines` and that percent.

### REACT-089 — Context consumers re-render without a selector

**Difficulty:** Senior

**Category:** Context

**Question:**

Provider value `{ user, notifications }` allocated each render. Notifications update; `memo(AccountName)` reads only `user.name` via context + `useMemo` on the name. Does the function run? What does that `useMemo` skip?

**Answer:**

Yes, `AccountName` runs. The provider's value is a new object, so every consumer is told to update. `memo` only compares props and cannot filter context changes.

The inner `useMemo` only saves recomputing the name string, and that happens after the function has already run. It does not prevent the render.

To avoid this, split the data into separate contexts, or use a store with a snapshot of just the name. React 18's `useContext` has no selector.

**Follow-up:**

Provider memoizes `{ user, notifications }` and notifications array is unchanged. Does AccountName run from context?

Answer: No, because the value has the same identity, so the context doesn't notify. It can still run if its parent rendered it.

### REACT-090 — Hooks stay above any early return

**Difficulty:** Intermediate

**Category:** Hooks

**Question:**

First render has `user`; later `user={null}` returns before `useState`. What’s wrong? Where can `useState` be called? What if moved into `onEdit`?

**Answer:**

The number of hooks changes between renders, so React throws an error.

Call hooks unconditionally at the top, before any early return. Or move the hooks into a child component and only render that child when the user exists.

Hooks cannot be called inside event handlers like `onEdit`, because React is not rendering at that point and cannot track them.

Also, `useState(user)` only uses the first value. If `user` changes while the parent stays mounted, the state does not update.

**Code:**

```tsx
if (user === null) return <p>Signed out</p>;
return <SignedInEditor user={user} />;
```

**Follow-up:**

`useDraft(user)` only in the signed-in branch—does the `use` name make it legal?

Answer: No. The name does not change anything. A conditional call still changes the hook count. Call it on every render, or only inside the child that is mounted when signed in.

### REACT-091 — A custom hook does not share state across rows

**Difficulty:** Senior

**Category:** Custom hooks

**Question:**

`Checklist` maps `tasks` and calls `useToggle` inside the map. Each row should be independent; two checklists mustn’t flip together. What does React do with the map? Where does each boolean live? Does a module `let on` help?

**Answer:**

Calling `useToggle` inside a `map` breaks the rules of hooks, because the number of hook calls depends on the length of the list.

Move `useToggle` into a `TaskRow` component, and let the map render the rows. Each mounted row has its own state, even though the hook function is the same. Hooks share logic, not state.

A module-level `let on` does not help. It is a single variable that React does not watch, so nothing re-renders when it changes.

Share state through a parent, context, or a store only if the product needs it.

**Follow-up:**

Hook takes `task` and returns the same `on` across checklists. What React feature is that?

Answer: There is none. You would be building your own store or map with subscriptions, or using shared context. Plain `useState` inside the hook stays separate for each call.

### REACT-092 — Setters in one effect body commit together

**Difficulty:** Senior

**Category:** Batching

**Question:**

On mount: sync `setCount`/`setReady` in the effect, then a `fetch` `then` with `setBoot`/`setReady`. How many renders for each group on React 18 `createRoot` vs React 17? `ignore` stays false.

**Answer:**

The two setters called directly in the effect are batched into one extra render, after the first paint. That was true in React 17 too.

The two setters in the `fetch().then` callback run later. On React 18 with `createRoot`, they are batched into one render. On React 17 or legacy `ReactDOM.render`, each setter renders separately, so you get two.

An `await` or `flushSync` splits batches.

The mount render itself does not include the updates made in the effect.

**Follow-up:**

`then` does `setBoot`, `await log`, then `setReady`. How many renders on 18?

Answer: Two. The `await` makes the second setter run in a new task, so it is a new batch. Keep setters on the same side of an `await` if they should appear together.

### REACT-093 — useDeferredValue compares its argument with Object.is

**Difficulty:** Senior

**Category:** Hooks

**Question:**

`useDeferredValue({ text })` allocated each render. User types, then a banner re-render with unchanged `text`. What does the hook compare, and what should the slow child receive?

**Answer:**

`useDeferredValue` compares the value you pass with `Object.is`. If you pass `{ text }`, that object is new on every render, so React thinks the value changed. Even a banner re-render with unchanged text schedules deferred work again.

Pass the primitive instead: `useDeferredValue(text)`. A string is equal when it has the same content, so React only defers when it really changes.

Let the slow child build any objects it needs from that deferred string. To show a pending hint, compare `text !== deferredText`.

**Code:**

```tsx
const deferredText = useDeferredValue(text);
return <SlowList text={deferredText} />;
```

**Follow-up:**

Parent does `useDeferredValue(items.filter(...))` every render. Banner re-render—what reaches the child?

Answer: A new array every time, so the deferral sees a change. Defer the text, and filter from the deferred string.

### REACT-094 — getSnapshot returns a cached snapshot

**Difficulty:** Advanced

**Category:** External stores

**Question:**

`useOnline` uses `useSyncExternalStore`. What’s wrong if `getSnapshot` returns `{ online: navigator.onLine }` every call? Why not subscribe in `useEffect`? Server-rendered?

**Answer:**

`useSyncExternalStore` calls `getSnapshot` several times and compares results with `Object.is`. If it returns a new object every time, React believes the store always changed, which causes warnings and render loops. Return a boolean, or a cached object that only changes when the value does.

Subscribing in `useEffect` happens after paint, and during concurrent rendering components can read different values, which is called tearing. `useSyncExternalStore` reads during render to keep them consistent.

For server rendering and hydration, pass `getServerSnapshot`.

**Code:**

```tsx
function getSnapshot() { return navigator.onLine; }
function getServerSnapshot() { return true; }
return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
```

**Follow-up:**

Cached object mutated in place (`snapshot.online = ...`) then notify. What does the next render see?

Answer: The same reference, so React may skip the update even though the data changed. Create a new object whenever the value changes.

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

### REACT-096 — The reducer init function runs when the slot is created

**Difficulty:** Intermediate

**Category:** Reducers

**Question:**

`useReducer(reducer, userId, init)` stays mounted; parent passes `"a"` then `"b"`. What’s `state.userId` after the second render? Which of init/reducer/draft reset run for that prop change?

**Answer:**

`state.userId` is still `"a"`. The `init` function runs only when the state is first created. A prop change does not run the reducer unless you dispatch, and it does not reset the draft either.

To reset, use `key={userId}`, which creates a fresh state slot. Or dispatch a `reset` during render when the prop differs from `state.userId`.

Resetting in an effect is worse, because the old draft is painted first.

In Strict Mode, React may call `init` twice, but only on mount.

**Follow-up:**

`init` reads `localStorage` for that userId. Strict Mode vs later `userId` change?

Answer: Strict Mode calls it twice on mount, so it must be a pure read. A later `userId` change does not call `init`. Use a reset or a key remount to load the new user's data.

### REACT-097 — Two useState calls in one component share its render

**Difficulty:** Senior

**Category:** State

**Question:**

One component holds rare `theme` and high-frequency `cursor` in one reducer. Teammate says two `useState` stops the theme label re-rendering. What still runs, and what actually separates renders?

**Answer:**

Splitting into two `useState` calls does not help. Any state update re-renders the whole component that owns it, and its children with it.

What separates renders is component boundaries. Move `cursor` into a child component that owns it, so cursor updates don't touch the theme label.

If the parent must hold the cursor, make the theme label a `memo` child with a stable theme prop.

Don't pass the whole reducer state object into a memoized label, because it would change on every update.

**Follow-up:**

`Frame` must read `cursor` to disable a button. Where does cursor go?

Answer: Move it up to `Frame` and pass it to `Decoration` as a prop. Then keep the theme label from re-rendering using `memo`, context, or by passing it as `children`.

### REACT-098 — useInsertionEffect runs before layout effects

**Difficulty:** Senior

**Category:** Effects

**Question:**

CSS-in-JS must inject rules before a product `useLayoutEffect` measures. Why `useInsertionEffect` vs layout/passive effects? What’s forbidden?

**Answer:**

`useInsertionEffect` is made for CSS-in-JS libraries. It runs synchronously before any layout effect, so when a layout effect measures the DOM, the new CSS rules are already there.

A passive effect would be too late, because it runs after paint and the styles would be wrong at first. A layout effect might run before your style insertion, depending on the order in the tree.

You should not schedule state updates in it, and you should not use it for fetching or subscriptions. It does not run on the server, so libraries collect styles separately during server rendering.

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

Answer: The style element is removed and inserted again on every commit. Memoize the rule string so it only changes when its content changes.

### REACT-099 — A hook around useContext does not select

**Difficulty:** Senior

**Category:** Custom hooks

**Question:**

`useUserName` returns `useContext(AppContext).user.name`. Header and Sidebar both call it. Provider value is a new `{ user, notifications }` object; name unchanged. Who renders, and what would a real selector subscribe to?

**Answer:**

Both Header and Sidebar re-render. A custom hook is just a function. It cannot change how `useContext` subscribes, so each caller is still a consumer of the whole context value.

Returning only the name filters what the component reads, but it does not stop the update.

A real selector would need a different design: split the data into separate contexts, or use `useSyncExternalStore` with a snapshot that is only the name string, cached so it stays equal when the name is unchanged.

**Follow-up:**

Hook also `useState`s the last name and effects copy from context. Does Header skip notification updates?

Answer: No. The context change still re-renders Header. The effect might skip the state update afterward, but the render already happened. Split the context or subscribe to a name snapshot.

### REACT-100 — A null draft leaves the prop on screen

**Difficulty:** Intermediate

**Category:** Derived state

**Question:**

Show `email` until the user types; later props should appear while untouched; keep typed value across new `email`. What’s wrong with `useState(email)` + effect sync, and what state means “hasn’t typed”?

**Answer:**

`useState(email)` only reads the prop once, so later props are ignored. Adding an effect to sync it overwrites what the user typed, after paint, and can't tell the difference between "typed the same as the prop" and "never typed."

Use `string | null` for the draft. `null` means "no override," and the input shows `draft ?? email`. When the user types, `onChange` stores the string, even if it equals the email. Reset by setting it back to `null`.

**Code:**

```tsx
const [draft, setDraft] = useState<string | null>(null);
const value = draft ?? email;
```

**Follow-up:**

`userId` changes while `draft` is `"hello"`. What shows, and how reset for a new entity?

Answer: It still shows `"hello"` over the new user's email. Remount with `key={userId}`, or set `draft` to `null` during render when the id changes.
