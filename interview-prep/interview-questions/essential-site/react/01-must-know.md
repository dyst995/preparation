# Essential React — Must Know

3-day essential set. 40 questions in preparation order. Full handbook remains under `react/`.

### REACT-015 — Render describes, commit applies

**Difficulty:** Senior

**Category:** Render and commit

**Question:**

What work is render vs commit? Which phase can run for an update the user never sees? Where do a layout DOM read and a subscription belong?

**Answer:**

React works in two phases. In the render phase, it calls your components and works out what changed. It does not touch the DOM. In the commit phase, it applies the changes to the DOM, attaches refs, and runs effects.

Render can be paused, restarted, or thrown away in concurrent mode, so the user may never see some render passes. Commit runs to completion without interruption.

Put subscriptions in `useEffect` or event handlers. Put layout reads and writes that must happen before the browser paints in `useLayoutEffect`. Keep the component body pure.

**Follow-up:**

`useLayoutEffect` calls `setState`. Does the user see the first committed tree?

Answer: No. React runs that update synchronously before the browser paints. If you did the same `setState` in `useEffect`, the browser could paint the in-between state first.

### REACT-011 — Reconciliation matches type at a position

**Difficulty:** Senior

**Category:** Reconciliation

**Question:**

A parent renders `<UserCard /><Details />` then `<Details /><UserCard />` with no keys. Does React move instances? What happens to state? Why this heuristic?

**Answer:**

Reconciliation is how React decides whether to reuse or replace what is already on screen. Without keys, React compares siblings by position.

At position 0, the type changed from `UserCard` to `Details`, so React unmounts the old one and mounts a new one. The same happens at position 1, and state and effects reset. React does not search the siblings for a matching type to move.

If the type and key at a position are the same, React keeps the instance and updates its props.

This rule is simple and fast. Keys exist for lists where order can change.

**Follow-up:**

Why does declaring `function UserCard` inside the parent reset state every parent render?

Answer: React compares component types by reference. A function declared inside the parent is a brand new function each render, so React sees a different type and remounts it. Define components at module level so the reference stays stable.

### REACT-013 — State stays where type and key stay

**Difficulty:** Senior

**Category:** State preservation

**Question:**

For each: `{isUser ? <Panel /> : <Panel />}`, `{isUser ? <UserPanel /> : <GuestPanel />}`, `{isUser ? <Panel kind="user" /> : <Panel kind="guest" />}`, `{isUser ? <Panel key="user" /> : <Panel key="guest" />}`—does Panel state survive toggling `isUser`?

**Answer:**

React keeps state as long as the component type, key, and position stay the same.

In the first case, both branches render `Panel` at the same position, so state survives. In the second, the type changes from `UserPanel` to `GuestPanel`, so React remounts and state resets. In the third, the type is the same and only a prop changes, so state survives. You must read `kind` from props, or reset on purpose.

In the fourth, the key changes, which forces a remount. That is the supported way to reset state.

**Code:**

```tsx
<Panel key={isUser ? "user" : "guest"} kind={isUser ? "user" : "guest"} />
```

**Follow-up:**

Key changes on `Panel` which renders a `textarea` with its own `useState`. Does the textarea keep text?

Answer: No. Changing the key remounts `Panel` and everything inside it, including local state and focus. If some state must survive, lift it above the keyed component.

### REACT-012 — Index keys work while order is identity

**Difficulty:** Senior

**Category:** Keys

**Question:**

A todo list uses `key={index}`; rows hold draft state and uncontrolled inputs. When is that correct, and what breaks on insert-at-front or sort? What should the key be?

**Answer:**

A key tells React which item a row represents. An index key means "the item in this position," which is fine only when the list is static and rows have no state of their own.

If you insert at the front or sort, the item at each index changes. React reuses the row at that index with new props, but keeps the old draft state and input text, so typed text ends up next to the wrong item.

Use a stable id like `todo.id`. Keys must be unique among siblings, and random keys remount every row on every render.

**Code:**

```tsx
{todos.map((todo) => (
  <TodoRow key={todo.id} todo={todo} />
))}
```

**Follow-up:**

Filtered list keyed by `todo.id`—do surviving rows keep drafts?

Answer: Yes. Rows with matching keys keep their instances and state. With index keys, a filtered list would shift drafts onto the wrong items.

### REACT-021 — Hook identity is call order

**Difficulty:** Intermediate

**Category:** Components

**Question:**

Why does this throw when `enabled` becomes `false` after a true first render?

```tsx
function Panel({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  const [open, setOpen] = useState(false);
  return <button onClick={() => setOpen((o) => !o)}>{String(open)}</button>;
}
```

**Answer:**

React doesn't track hooks by name. It stores them as an ordered list on the component and matches each call by its position.

On the first render, `useState` was call number one. On the second render, the component returns early before reaching `useState`, so React finds fewer hooks than last time and throws an error.

Returning `null` early is fine for the UI. It is not fine for hooks. Always call every hook first, then decide what to return.

**Code:**

```tsx
function Panel({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  if (!enabled) return null;
  return <button onClick={() => setOpen((o) => !o)}>{String(open)}</button>;
}
```

**Follow-up:**

Conditional `useAuth()` that itself calls three hooks—what breaks?

Answer: Those three hook slots appear and disappear in the caller's list, which breaks the order. This is the same violation as a conditional `useState`. Always call custom hooks unconditionally.

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

### REACT-203 — Race conditions in fetch effects
**Difficulty:** Intermediate
**Category:** Async data / Race conditions
**Question:** What is a race condition in a fetch effect, and how does it occur?
**Answer:** Say `id` changes quickly. Request A for the old id and request B for the new id are both in flight. Responses can arrive in a different order, so A might finish last and overwrite B's data. The UI then shows data for the wrong input. The effect re-ran, but nothing told the old request that its result no longer matters. The fix is to cancel or ignore stale requests in cleanup, or use a library that stores results by input.
**Follow-up:** Is this only a network problem?

Answer: No. Any async work with varying delay can finish out of order, such as debounced search or slow endpoints.

---

### REACT-005 — setState schedules the next render

**Difficulty:** Intermediate

**Category:** State

**Question:**

```tsx
function onClick() {
  setCount(count + 1);
  console.log(count);
}
```

`count` is `0` in this render. What does the log print, when does the component function run again, and what does the screen show relative to the `setCount` line?

**Answer:**

The log prints `0`. The handler closed over the `count` from the render that created it, and `setCount` does not change that variable. It only schedules a new render.

For a discrete click on a `createRoot` app, React finishes your handler first, then runs the component again with `count` as `1`, and updates the DOM before the browser paints.

So on the very next line, both your variable and the screen still show the old value. The new value only exists in the next render.

**Follow-up:**

`useState(expensive())` versus `useState(() => expensive())` — what runs on the second render?

Answer: With `useState(expensive())`, the call happens on every render, but React ignores the result after the first one. With the function form, React calls the initializer only when it creates the state, not on later renders. In development Strict Mode, it may call it twice on mount.

### REACT-020 — A parent render runs child functions

**Difficulty:** Intermediate

**Category:** Rendering

**Question:**

Parent state changes. `Child` gets the same primitive props, no state, no `memo`. Does Child run? Is the DOM rewritten? What to change first if the profiler is hot?

**Answer:**

Yes, `Child` runs again. When the parent renders, it creates new child elements, and React calls the child component even if its props look identical. Without `memo`, equal props alone do not skip the call.

The DOM is not rebuilt, though. React only updates DOM nodes whose output actually changed. So the cost is in JavaScript and reconciliation, not in rewriting the page.

If the profiler shows this is hot, restructure first: move the changing state into a smaller component so the expensive siblings are not affected. Use `memo` only after measuring.

**Trade-offs:**

Default re-render until measured. State colocation beats blanket `memo`/`useCallback`. New object/callback props defeat `memo`.

**Follow-up:**

`memo(Child)` also uses `useContext(ThemeContext)`. Provider value changes, props unchanged. Skip?

Answer: No. `memo` only compares props, and context is not a prop. A component that reads a context still re-renders when that context's value changes.

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

### REACT-008 — React 18 batches outside React events

**Difficulty:** Senior

**Category:** Batching

**Question:**

In one callback, `setCount` and `setFlag` both run. Compare a React `onClick`, `setTimeout`, `fetch().then`, and a native `addEventListener` click on React 18 `createRoot` versus React 17.

**Answer:**

Batching means React groups several state updates into one render. In React 18 with `createRoot`, that happens everywhere: React event handlers, timeouts, promise callbacks, and native listeners. Both updates apply, then React renders and commits once.

In React 17, batching only worked inside React's own event handlers. The same pair in a timeout, a promise, or a native listener caused two renders. The old `ReactDOM.render` API keeps that React 17 behavior.

Batching does not change variables you already read. Those still hold the old values.

**Code:**

```tsx
setTimeout(() => {
  setCount((c) => c + 1);
  setFlag((f) => !f);
}, 0); // createRoot: one render
```

**Follow-up:**

A click calls `setQuery(next)` and, inside `startTransition`, `setResults(...)`. Still one render?

Answer: No. Batching only groups updates with the same priority. The urgent update and the transition can render and commit separately, and the transition can be interrupted.

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

### REACT-251 — Controlled vs uncontrolled inputs
**Difficulty:** Junior
**Category:** Forms
**Question:** What is the difference between a controlled and an uncontrolled input in React? When would you pick each?
**Answer:** In a controlled input, the value lives in React state. You pass `value` and `onChange`, so React is the single source of truth. In an uncontrolled input, the DOM keeps the value, and you read it later through a ref, `FormData`, or on submit. I use controlled inputs for live validation, input masking, dependent fields, and instant feedback. Uncontrolled is simpler and cheaper for plain forms that only matter on submit, and it's the only option for file inputs. Real forms often mix both.
**Follow-up:** Can an input switch between the two?

Answer: It can, but React warns. If `value` goes from `undefined` to a real value, the mode flips and causes bugs. So always give controlled inputs a starting value, like an empty string.

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

### REACT-215 — Server state vs client state
**Difficulty:** Intermediate
**Category:** Async data / State architecture
**Question:** What distinguishes server state from client state?
**Answer:** Server state lives remotely and is owned elsewhere. Other people can change it, so my copy might always be out of date. That means it needs caching, revalidation, de-duplication, retries, and invalidation. Client state, like whether a modal is open or a form draft, is synchronous, local, and owned by the UI. If I mix both in one store, I end up hand-writing loading flags and sync logic. I use a server-state library for the first and `useState` or a small store for the second.
**Follow-up:** Where does URL state fit?

Answer: It's client state that can be shared and bookmarked, and it often becomes part of the query key.

---

### REACT-168 — Prop drilling vs context
**Difficulty:** Intermediate
**Category:** State sharing
**Question:** When is prop drilling acceptable and when should you reach for context?
**Answer:** Passing props through one to three layers is fine. It's explicit and easy to trace. I reach for context when many layers only forward the data, or when many descendants at different depths need it, like the theme, the current user, or the locale. Before using context, I try composition: passing elements down as children or slots. That often removes the drilling without the coupling and re-render costs that context brings.
**Follow-up:** What does context cost?

Answer: Components now depend on a provider being present, which makes them harder to test alone. Also, every consumer re-renders when the context value changes.

---

### REACT-042 — A render error is caught above; a handler error is not

**Difficulty:** Senior

**Category:** Errors

**Question:**

Child throws while rendering. What catches it? Does the same catch `onClick`, fetch rejection, or `useEffect` throws? Can a function component be the boundary?

**Answer:**

An error boundary catches it. In React 18, that must be a class component using `getDerivedStateFromError` or `componentDidCatch`. It catches errors thrown while rendering its descendants and shows a fallback. The broken output is never committed. Function components cannot be boundaries.

Errors in event handlers, rejected promises, and effects are not render errors, so boundaries do not catch them. Handle those yourself with try/catch, and set error state if the UI should change.

Log or retry from `componentDidCatch` or from the fallback UI, not from `getDerivedStateFromError`.

**Code:**

```tsx
static getDerivedStateFromError(error: Error) {
  return { error };
}
```

**Follow-up:**

Fallback showing; Retry only clears `error`. What else for the child to succeed?

Answer: Clearing the error just renders the children again. It only works if the cause has changed or the child handles it, otherwise the same error is thrown and caught again.

### REACT-201 — Fetching in useEffect: the basic pattern and its pitfalls
**Difficulty:** Junior
**Category:** Async data / Effects
**Question:** How do you fetch data in `useEffect`, and what usually goes wrong with the naive version?
**Answer:** You start the request inside the effect, save the result in state, and list every value the request uses in the dependency array. The naive version has several gaps. There's no cleanup, so you can get race conditions or state updates after unmount. There's no loading or error state, and no caching or de-duplication. The request also starts only after the first render, which can create waterfalls. It's fine for small apps, but you end up rebuilding what a data library gives you.
**Code:**
```jsx
useEffect(() => {
  fetch(`/api/users/${id}`).then(r => r.json()).then(setUser);
}, [id]);
```
**Follow-up:** What does this code not handle?

Answer: Errors, non-2xx responses, a loading UI, cancellation, and responses arriving out of order when `id` changes.

---

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

### REACT-031 — Strict Mode's extra render stays in development

**Difficulty:** Senior

**Category:** Rendering

**Question:**

Under `<StrictMode>` in development: body, `useState` initializer, updater, and `useEffect`—how often each, what commits? Production? vs abandoned transition?

**Answer:**

Strict Mode adds extra work only in development, to help you find bugs. React may call your component body, state initializers, and updater functions twice, and keeps one result. On mount, it also runs effects as setup, cleanup, setup again, to expose missing cleanup. Only one tree is committed, and event handlers are not called twice.

Production does none of this: everything runs once.

An abandoned transition is different. That render never committed, so its effects never ran and there is nothing to clean up. It is a production scheduling behavior, not a Strict Mode check.

**Follow-up:**

Initializer `fetch`es into state. How many requests in development?

Answer: Two requests start, and only one result is kept. Don't fetch inside an initializer. Use an effect with abort, or an event handler.

### REACT-209 — Modeling loading, error, and success states
**Difficulty:** Intermediate
**Category:** Async data / State modeling
**Question:** How should you model request state to avoid impossible combinations?
**Answer:** I avoid separate `loading`, `error`, and `data` booleans, because they can disagree, like loading and error both being true. Instead I use one `status` field with a discriminated union: loading, success with data, or error with an error. The UI switches on the status, which makes every case explicit, and TypeScript can check that I handled them all. Libraries use the same idea with `status`, `isPending`, and `isError`.
**Code:**
```ts
type State<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: T };
```
**Follow-up:** Where does "refetching" fit?

Answer: It's a separate flag, like `isFetching`, on top of success. You already have data to show while it refreshes.

---

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

### REACT-036 — The input shows the value from this render

**Difficulty:** Intermediate

**Category:** Inputs

**Question:**

`<input value={text} onChange={…}>` ownership? Omit `onChange`? vs `defaultValue`? Later new `defaultValue` after typing?

**Answer:**

With `value={text}`, the input is controlled. React state is the source of truth, and each render writes that value into the DOM. If `onChange` does not update the state, React puts the old value back. Leaving out `onChange` gives a warning. Use `readOnly` when you really want a fixed display.

`defaultValue` makes the input uncontrolled. It sets the initial DOM value on mount only. Later changes to that prop are ignored.

Switching between controlled and uncontrolled gives a warning, so use `value={maybe ?? ""}`. To reapply `defaultValue`, remount with a `key`.

**Code:**

```tsx
<input value={text} onChange={(e) => setText(e.target.value)} />
```

**Follow-up:**

Handler `setText(e.target.value)` and also reads `e.target.value` into a ref for a count—allowed?

Answer: Yes. Event handlers run after the browser has applied the keystroke, so reading the value there is fine. If the count needs to show on screen, keep it in state.

### REACT-189 — Error boundary placement
**Difficulty:** Senior
**Category:** Error handling
**Question:** Where should error boundaries be placed in an app?
**Answer:** I use layers. A root boundary is the last resort. Route-level boundaries stop one failing page from taking down the whole shell. Local boundaries around independent widgets, like a feed, chart, or third-party embed, let one failure degrade gracefully. The trade-off is blast radius versus noise: more boundaries mean smaller failures but more fallback UI. Each boundary should offer a way to recover, like retry or reset on navigation, and report the error to monitoring.
**Follow-up:** How does a boundary reset?

Answer: By changing its `key`, calling a reset callback, or using a `resetKeys` prop from `react-error-boundary` tied to route or data changes.

---

### REACT-306 — Hydration

**Difficulty:** Junior
**Category:** Hydration

**Question:**
What is hydration, in terms of the DOM the server already produced?

**Answer:**
Hydration is the step where React takes HTML the server already sent and attaches event handlers, state, and the component tree on top of those existing DOM nodes. The user can see the page before this finishes, but buttons do nothing until hydration reaches them. React walks the tree and expects the client render to describe the same elements the server produced. Hydration matters because it is the bridge from a fast first paint to a working app, and it is also where mismatches, extra JavaScript, and main-thread jank show up.

**Follow-up:**
Why do we call `hydrateRoot` instead of `createRoot` on server-rendered markup?

Answer: `hydrateRoot` adopts the existing DOM and attaches React to it. `createRoot` expects to create the UI itself, so using it on a full server document throws away the HTML you just paid to send.

### REACT-315 — React Server Components

**Difficulty:** Intermediate
**Category:** Server Components

**Question:**
What is a React Server Component, and what does the browser never receive?

**Answer:**
React Server Components run only on the server and never ship their implementation to the browser. They can read data close to the source, render their output, and pass the result into the client tree. Their own JavaScript is not part of the bundle. Client components still hydrate and handle state, effects, and events. The split matters because most of a page is often formatting and data access, while a smaller part is interactivity. Keeping that work on the server cuts the script the browser has to download, while the parts that must respond to input stay on the client.

**Follow-up:**
If a Server Component renders a `<button>`, can that button have an `onClick`?

Answer: The button can be static markup from the server. A click handler is client behavior, so the interactive button needs to live in a client component that the server renders as a child.

### REACT-194 — Server/client component boundary
**Difficulty:** Senior
**Category:** Server Components
**Question:** At a high level, how do React Server Components change architecture?
**Answer:** By default, components run on the server. They can read data directly and send no JavaScript to the browser. Anything interactive goes into Client Components, marked with `"use client"`. So the architecture question becomes where to draw that boundary. I keep data access and static structure on the server, and push state, effects, event handlers, and browser APIs down into small client components. This needs a framework that supports Server Components.
**Follow-up:** What can't server components do?

Answer: They can't use state, effects, event handlers, or browser-only APIs. They also can't pass non-serializable props, such as functions, to client components.

---

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

### REACT-018 — Transitions keep the keystroke urgent

**Difficulty:** Senior

**Category:** Scheduling

**Question:**

A controlled input updates `query` and filters a huge table from the same update; typing stalls. How keep input urgent and table interruptible? What do you give up? What does this not speed up?

**Answer:**

Keep `setQuery` as a normal urgent update so the input responds immediately. Mark the table update as a transition with `startTransition`, or pass `useDeferredValue(query)` to the heavy child. React can then show the typed text first and render the table in the background, interrupting it if you type again.

The trade-off is that the table briefly lags behind the input, so you may show a pending state.

This does not make the filtering itself faster, does not reduce network requests, and does not fix rendering 20,000 rows. Use windowing for that.

**Code:**

```tsx
const [query, setQuery] = useState("");
const deferredQuery = useDeferredValue(query);
// input uses query; Table uses deferredQuery
```

**Follow-up:**

How does `useDeferredValue` differ from copying in `useEffect`?

Answer: Copying in an effect triggers a second normal-priority render after paint. A deferred value is scheduled as a transition, so it can be interrupted by the next keystroke.

### REACT-351 — Testing the way a person uses the screen

**Difficulty:** Junior
**Category:** Testing philosophy

**Question:**
What does it mean to test a React component the way React Testing Library intends?

**Answer:**
React Testing Library is a set of helpers that render a component into a page and let you inspect it the way a person would. You look up buttons, links, and fields by their role or label, then click or type and read what the screen shows. The test describes the task, such as signing in or saving a name, rather than the state variable that stores it. That keeps the test useful when someone rewrites a hook or splits a component, as long as the visible behavior stays the same.

**Follow-up:**
Should a passing test survive a refactor that does not change the feature?

Answer: Yes. If the user can still finish the same task, the test should stay green. A failure that only means “we renamed state” is a test you will learn to ignore.

### REACT-289 — Accessible modals
**Difficulty:** Senior
**Category:** Focus management
**Question:** What must an accessible modal dialog do?
**Answer:** It must move focus into the dialog when it opens, keep Tab inside it, close on Escape, and return focus to the trigger when it closes. The background content should be inert, using `aria-modal="true"` plus `inert` or `aria-hidden` on sibling content. The dialog needs `role="dialog"` and an accessible name. I'd prefer the native `<dialog>` element with `showModal()`, which handles much of this, or a well-tested library. I render it in a portal.
**Trade-offs:** Native `<dialog>` = less code, good support; libraries = consistent styling/animation and edge-case handling.
**Follow-up:** Why restore focus?

Answer: Otherwise focus resets to the top of the document, and keyboard users have to navigate back from the start.

### REACT-282 — Button vs clickable div
**Difficulty:** Junior
**Category:** Semantic HTML
**Question:** What do you lose with `<div onClick>` compared to `<button>`, and when is `<a>` correct?
**Answer:** With a `div`, you lose keyboard focus, activation with Enter and Space, the role announcement, disabled behavior, and form submit behavior. I use `<button>` for actions, where something happens, and `<a href>` for navigation, where you go somewhere. Links also support middle-click and "open in new tab." I set `type="button"` to avoid accidental form submits. If I must use a div, I add a `role`, `tabIndex=0`, and key handlers, which is rarely worth it.
**Follow-up:** Why `type="button"`?

Answer: A button inside a form defaults to `type="submit"`, which would submit the form unexpectedly.
