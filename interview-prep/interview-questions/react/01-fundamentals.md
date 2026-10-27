# R01 — React fundamentals and internal mechanics

React 18 unless a question says otherwise. Questions REACT-001–REACT-050.

Covers function components, props, JSX, elements vs fibers, state and batching, reconciliation and keys, render/commit, concurrent scheduling, context, roots/hydration, controlled inputs, refs, portals, and purity mistakes that corrupt state.

### REACT-001 — A function component is a render function

**Difficulty:** Intermediate

**Category:** Components

**Question:**

What does React treat a function component as? When does React call it, and what is the return value for?

**Answer:**

React treats a function component as a plain function that takes props and hook state and returns a description of the UI. React calls it during the render phase, when it needs to know what that part of the screen should look like.

The return value is a tree of React elements (or `null`, a string, a number, or an array), not the DOM itself. React compares it with the previous description and updates the real DOM later, in the commit phase.

Keep it pure, since React may call it more than once.

**Code:**

```tsx
function Greeting({ name }: { name: string }) {
  return name ? <h1>Hello {name}</h1> : null;
}
```

**Follow-up:**

Why does Strict Mode call the component twice in development, and does production do that?

Answer: It is a development-only check that helps you spot impure code, and only one result is committed. Production does not add that extra call. Concurrent rendering can still repeat or throw away a render in production when it needs to reschedule work.

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

### REACT-003 — JSX is an element description

**Difficulty:** Intermediate

**Category:** JSX

**Question:**

What does `<Profile user={user} />` compile to, why must `Profile` be capitalized, and what does React do with `{user.name}`, `false`, `0`, and a plain object as a child?

**Answer:**

JSX compiles to a call to `jsx` (or `createElement` in the older setup). That call returns a plain object with a `type`, `props`, and `key`. It does not run the component and it does not touch the DOM.

The capital letter tells the compiler that `Profile` is a variable pointing to your component. A lowercase name would be treated as a built-in HTML tag.

As children, strings and numbers become text. `null`, `undefined`, and `false` render nothing. `0` renders the text "0". A plain object is not a valid child and throws.

**Follow-up:**

What is the difference between an element and a component?

Answer: The component is the function or class you wrote. The element is a small object, `{ type, props, key }`, that points at it. React only runs the component when it renders that element at a spot in the tree, not when the object is created.

### REACT-004 — Elements, fibers, and DOM nodes

**Difficulty:** Senior

**Category:** Elements

**Question:**

Define a component, a React element, a fiber, and a DOM node. Which one holds hook state? If the module creates `const element = <Counter />` once and two different parents return that same object, do those parents share Counter state?

**Answer:**

A component is the function you write. An element is a lightweight description of what to render, created on every render. A fiber is React's internal record for one mounted instance of something in the tree. A DOM node is the real browser object created during commit.

Hook state lives on the fiber, not on the element.

If two parents return the same element object, React still creates two separate fibers. Each gets its own state. They only share the same props reference. So reusing an element is not the same as sharing an instance.

**Trade-offs:**

Hoist a constant element only when it never closes over changing data. Shared state needs a common parent or external store—not a shared element object.

**Follow-up:**

Does a parent re-render that returns `<Counter />` again destroy Counter's state?

Answer: No. As long as the type and key at that position are the same, React reuses the existing fiber and keeps its state. State is lost only when the type or key changes, or when that position is removed.

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

### REACT-006 — useState replaces object state

**Difficulty:** Intermediate

**Category:** State

**Question:**

A component holds `useState({ a: 1, b: 2 })` and calls `setPair({ a: 3 })`. What is `b` on the next render? How does that differ from class `this.setState({ a: 3 })`?

**Answer:**

After `setPair({ a: 3 })`, the state is just `{ a: 3 }`, and `b` is gone. A `useState` setter replaces the whole value. A class `this.setState` merges the new keys into the old state, so `b` would have stayed.

With hooks, you do the merge yourself using an updater that spreads the previous object. That spread only copies one level deep.

Also, a new object always counts as a change, even when the fields look the same, so React will re-render. Other `useState` slots in the component are not affected.

**Code:**

```tsx
setPair((prev) => ({ ...prev, a: 3 })); // { a: 3, b: 2 }
```

**Follow-up:**

What does React guarantee about the identity of the `setPair` function across renders?

Answer: The setter keeps the same identity for the life of that state, so you can safely leave it out of dependency arrays. That stability only applies to the function. The state value itself still changes.

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

### REACT-009 — An await starts a new batch

**Difficulty:** Advanced

**Category:** Batching

**Question:**

```tsx
async function onClick() {
  setA(1); setB(2);
  await save();
  setA(3); setB(4);
}
```

How many renders on React 18 `createRoot` if `save` resolves? On React 17? What if you remove the `await`?

**Answer:**

In React 18 with `createRoot`, you get two renders. The two updates before `await` are batched into one render. After the promise resolves, the code continues in a separate task, and those two updates are batched into a second render.

In React 17, you get three. The first pair is batched because it is inside the event handler, but after the `await`, each setter renders on its own.

If you remove the `await`, all four calls form one batch. The last values win, so the screen goes straight to `a=3` and `b=4`, and `(1, 2)` is never painted.

**Follow-up:**

`save` rejects before the second pair. What has the user seen?

Answer: The first batch has already committed, so the user saw `(1, 2)`. Handle the error in a `catch` and set an error state. A clear status field is better than leaving a half-finished "saving" screen.

### REACT-010 — flushSync commits before it returns

**Difficulty:** Advanced

**Category:** Batching

**Question:**

A click appends a row and must read that row's `getBoundingClientRect()` before later logic in the same handler. What does `flushSync` change about batching and commit, and what about the `count` binding?

**Answer:**

`flushSync` tells React to process the updates inside its callback right now. React renders and commits them before `flushSync` returns, so the DOM is already updated when the next line runs. That lets you measure the new row immediately.

Updates outside the callback still follow the normal batching path.

Variables from the current render, like `count`, do not change. The newer render inside `flushSync` has its own variables.

It blocks the main thread, so use it only when the next imperative line truly needs the updated DOM.

**Code:**

```tsx
flushSync(() => setRows((rows) => [...rows, nextRow]));
const height = listRef.current?.lastElementChild?.getBoundingClientRect().height;
```

**Trade-offs:**

Prefer `useLayoutEffect` when measurement can live with every commit. Prefer deriving position from state when possible.

**Follow-up:**

`flushSync` appends a row, then `setSavedAt` outside. One commit?

Answer: No. The append commits inside `flushSync`, and `setSavedAt` is a separate, later update. If both must appear in the same commit, put both inside the same `flushSync` callback.

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

### REACT-016 — A fiber is the unit of work

**Difficulty:** Advanced

**Category:** Fiber

**Question:**

What is a fiber vs a JSX element? Why replace the stack reconciler? What is `alternate` for?

**Answer:**

A fiber is React's internal object for one piece of the UI. It stores things like the component type, props, hook state, and links to its parent, child, and sibling. A JSX element is just a cheap description created on each render.

The old stack-based reconciler had to finish a whole tree walk in one go. Fibers break that into small units, so React can pause, resume, or abandon work.

React keeps a current fiber tree and a work-in-progress copy, linked by `alternate`. When the new tree is ready, commit swaps them.

**Follow-up:**

If render writes only work-in-progress, how can an impure render still corrupt the screen?

Answer: An impure render can write to places outside the work-in-progress tree, like module variables, stores, or shared objects. Throwing away the work-in-progress tree does not undo those writes. Keeping render pure is what makes it safe to discard.

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

### REACT-019 — Lanes are the internal priority model

**Difficulty:** Staff-Level

**Category:** Scheduling

**Question:**

What is a lane in React 18 at a level you can defend: what an update carries, how render chooses work, how urgent vs transition interact, and what is public API?

**Answer:**

A lane is React's internal way of labeling how urgent an update is. Each update gets a lane when it is scheduled. When React renders, it picks which lanes to process now and leaves the others queued.

That is how a click can commit while a transition is abandoned: discrete input has a higher priority than transitions. Expiration rules stop low-priority work from starving.

Lanes are an internal detail, not public API. In app code you use `startTransition`, `useTransition`, `useDeferredValue`, and `useSyncExternalStore`. Updates in the same lane are still batched together.

**Follow-up:**

Why can an external store tear, and what does `useSyncExternalStore` change?

Answer: With interruptible rendering, different components can read different versions of a store across passes. `useSyncExternalStore` checks the snapshot again and forces a synchronous re-render if it changed, so the commit stays consistent. Cache the snapshot, or a new object each call looks like a constant change.

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

### REACT-022 — The timeout closes over the render that scheduled it

**Difficulty:** Senior

**Category:** State

**Question:**

Three clicks within 500ms each schedule `setTimeout(() => { console.log(count); setCount(count + 1); }, 500)` with `count` starting at `0`. What logs and what is final `count`?

**Answer:**

Each click runs a handler created in a render where `count` is `0`. The handler only starts a timer. It does not update state, so nothing re-renders between the clicks, and all three timers capture `0`.

When they fire, each logs `0` and calls `setCount(1)`. The first sets it to `1`. The next two set the same value, so React bails out. The final count is `1`, not `3`.

If you use `setCount(c => c + 1)`, the final count is `3`, because the updater uses the latest state. The log still prints `0`.

**Code:**

```tsx
setTimeout(() => {
  console.log(count); // closed-over snapshot
  setCount((c) => c + 1);
}, 500);
```

**Follow-up:**

Functional updater + `console.log(count)` after the same three overlapping clicks?

Answer: You get three logs of `0` and a final count of `3`. The log reads the stale variable from the closure, while the updater works with the latest state.

### REACT-023 — Same state skips the render

**Difficulty:** Intermediate

**Category:** State

**Question:**

`count` is `0` and handler calls `setCount(0)`. Object state: `setPair({ n: 0 })` vs mutate then `setPair(pair)`?

**Answer:**

When you set state, React compares the new value with the current one using `Object.is`. If they are equal, it skips the re-render. So `setCount(0)` when the count is already `0` does nothing visible.

`setPair({ n: 0 })` creates a new object with a different reference. React treats it as changed and re-renders. It does not compare fields deeply.

If you mutate `pair.n` and call `setPair(pair)`, the reference is unchanged. React skips the update, but the object was already changed, so the screen can go stale. Return `prev` from an updater when nothing changed.

**Follow-up:**

`setCount(c => c)` when `c` is `0`? Updater returns `{ ...c }` for object state?

Answer: Returning the same value bails out. Returning a copy, even with the same fields, is a new reference, so React re-renders.

### REACT-024 — The key has to sit on the sibling

**Difficulty:** Advanced

**Category:** Reconciliation

**Question:**

Mapping items to `<> <dt key={item.id}>…</dt><dd>…</dd> </>` inside a `<dl>`—what is wrong when the list reorders and rows will hold state? Why not wrap in a `<div>`?

**Answer:**

The key must be on the element that the `map` returns, because that is what React compares among siblings. Here the shorthand `<>` fragment cannot take a key. The `key` on `dt` only identifies children inside the fragment, not the fragments themselves.

So the fragments are matched by index. After a reorder, state sticks to the position instead of the item.

The fix is `<Fragment key={item.id}>`. Wrapping with a `<div>` would give a key, but it breaks the valid structure of a `<dl>` and hurts accessibility.

**Code:**

```tsx
{items.map((item) => (
  <Fragment key={item.id}>
    <dt>{item.term}</dt>
    <dd>{item.def}</dd>
  </Fragment>
))}
```

**Follow-up:**

Why can `<Fragment key={…}>` take a key when `<>` cannot?

Answer: The `<>` shorthand has no way to pass props, so it cannot carry a key. The explicit `Fragment` accepts `key` like any element, and React then treats it as a normal keyed sibling.

### REACT-025 — The draft followed the index, not the id

**Difficulty:** Staff-Level

**Category:** State preservation

**Question:**

Fifty `Line` rows use `useState(item.amount)` and `key={index}`. After blur, parent batches `setLines(payload.lines)` (reordered) and `setSavedAt`. Typed draft for id `"L3"` appears on another id. Why? How keep draft with `"L3"`? How force server amount instead?

**Answer:**

Keys decide which instance belongs to which item. With `key={index}`, the row at position 2 keeps its instance and its draft state, even though a different item now sits there after the reorder. `useState(item.amount)` only reads the prop once, so it never picks up the new item.

Fix it with `key={item.id}`, so each draft follows its item.

To force the server amount into the draft, adjust state during render when `item.amount` changes, with a guard so it settles. Or remount using a versioned key, which also drops focus.

**Code:**

```tsx
{lines.map((item) => (
  <Line key={item.id} item={item} />
))}
```

**Follow-up:**

Id-keyed fiber still shows typed draft after server amount change. Why, and how paint server amount before paint without remounting?

Answer: The type and key matched, so React preserved the state, including the old draft. To show the server amount without remounting, compare the incoming amount with a stored copy and set the draft during render. React restarts the render before painting. Adding the amount to the key works too, but it remounts.

### REACT-026 — `children` is an element the parent already created

**Difficulty:** Intermediate

**Category:** Props

**Question:**

`<Card><Counter /></Card>` with `{children}` inside `Card`. Who creates `Counter`, when does it run, where is state? Difference of `{children}`, `{children()}`, `<children />`?

**Answer:**

The component that writes `<Card><Counter /></Card>` creates the `Counter` element during its own render. That is only a description, so `Counter` has not run yet. `Card` places it in its output, and React then renders `Counter` at that spot. Its state lives there.

`{children}` renders the element that was passed in. `{children()}` only works if the parent passed a function, and that function must stay pure. `<children />` treats `children` as a component type, which is wrong for an element object, and a new function each render would remount.

**Follow-up:**

`Card` renders `{children}` in two sibling slots. Shared state? Shared ref?

Answer: No. React creates two separate instances, each with its own state. They share only the element object. A single ref cannot attach to both.

### REACT-027 — A fragment has no host node

**Difficulty:** Intermediate

**Category:** Reconciliation

**Question:**

Returning `<>…</>` instead of a `<div>`: what is in the DOM? What fiber? Can React 18 put `onClick` or `ref` on the fragment?

**Answer:**

A fragment lets you return several elements without adding an extra DOM node. React still has an internal fiber for it, but there is no matching DOM element. The children go straight into the nearest real parent. That means no extra box to style and no element to attach a listener to.

Swapping a fragment for a `<div>`, or the other way around, changes the host structure, so React remounts that subtree.

In React 18, you cannot put `ref` or `onClick` on a fragment. Fragment refs came in React 19. The `<>` shorthand also cannot take a key.

**Follow-up:**

Return `<> <span/> </>` then `<div><span/></div>`. Does span state survive?

Answer: No. Going from a fragment to a `div` changes the child type at that position, so React remounts the subtree and the span's state is lost.

### REACT-028 — Two arrays are one sibling list

**Difficulty:** Senior

**Category:** Keys

**Question:**

Two maps under one `div`—`todos` and `done`—can share string ids; each `Row` has a draft. Why do drafts cross? How namespace keys? What does one `<>` around both maps do?

**Answer:**

When a `div` has two arrays as children, React flattens them into one list of siblings before matching keys. If `todos` and `done` both contain the id `"a"`, that is a duplicate key. React may reuse the wrong instance, so drafts end up on the wrong row.

To avoid this, wrap each map in its own keyed `Fragment`, so each group has its own list of children.

A single `<>` around both maps does not help. It is still one fragment, and the arrays inside it are flattened together, so the collision remains.

**Code:**

```tsx
<Fragment key="open">{todos.map(...)}</Fragment>
<Fragment key="done">{done.map(...)}</Fragment>
```

**Follow-up:**

Move id `"a"` from open to done with keyed fragments. Does the draft move?

Answer: No. Keys only match within the same parent. The row in the open group unmounts and a new one mounts in the done group. Lift the draft by id, or use a single shared list so the instance can move.

### REACT-029 — State does not follow an element across parents

**Difficulty:** Senior

**Category:** State preservation

**Question:**

Board flips which `Column` gets `<Editor id="a" />` vs `"b"`. After flip, which draft appears where? What tree keeps drafts with ids?

**Answer:**

React keeps state with the instance at a position in the tree, not with the element you moved. If the left column always renders an `Editor` in the same slot, React keeps that instance and its draft. After the flip, the left editor still holds A's draft but now receives `id="b"`.

Putting `key={id}` under two different parents does not help. A key change remounts, it does not teleport.

To keep drafts with ids, render the editors as keyed siblings under one parent, so React moves instances. Or lift the draft state by id.

**Code:**

```tsx
{(flipped ? ["b", "a"] : ["a", "b"]).map((id) => (
  <Editor key={id} id={id} />
))}
```

**Follow-up:**

Keyed editors under a `div` that becomes a `section`—drafts survive?

Answer: No. Changing the host element type unmounts it and everything inside. Keys only work among siblings under the same parent.

### REACT-030 — Context updates consumers; passed children bound the rest

**Difficulty:** Senior

**Category:** Context

**Question:**

`ThemeProvider` holds theme and renders `{children}`. App passes `<Layout />` as children; `Title` inside Layout consumes context. Who runs on `setTheme`? What if `value={{ theme }}`? What if App holds theme and writes Provider + Layout itself?

**Answer:**

When `setTheme` runs, the provider re-renders. The `children` element is the same reference as before, so React skips `Layout`. `Title` still re-renders because it reads the context.

If the value is `{ theme }`, it is a new object every time, so every consumer re-renders even when the theme string is the same. Use `useMemo` or pass the string.

If App holds the theme and writes the provider and `Layout` itself, App's render creates a new `Layout` element, so `Layout` runs too. `memo` on a consumer does not block context updates.

**Follow-up:**

No provider; default `"light"`. Then `<Provider value={undefined}>`. What does `useContext` return?

Answer: It returns `undefined` in the second case. The default is used only when there is no provider above. A provider with `undefined` still counts, and its value wins.

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

### REACT-032 — `createRoot` is a different root from `ReactDOM.render`

**Difficulty:** Senior

**Category:** Roots

**Question:**

App still mounts with `ReactDOM.render`. Which React 18 behaviors are missing? Supported mount/update/unmount? When does server HTML change the API?

**Answer:**

In React 18, `ReactDOM.render` is a legacy mode. Your app runs with React 17 behavior: no concurrent renderer, no automatic batching outside React events, and transitions are not interruptible.

The supported way is to call `createRoot(container)` once, then use `root.render` to update and `root.unmount` to remove it. There is no render callback.

If the HTML was rendered on the server, use `hydrateRoot(container, <App />)` to attach to it. Using `createRoot` on server-rendered markup replaces those children instead of attaching.

**Code:**

```tsx
const root = createRoot(container);
root.render(<App />);
root.unmount();
```

**Follow-up:**

One click updates state in two `createRoot` trees. One render?

Answer: No. Each root has its own render, commit, context, and error boundaries. Batching does not cross roots.

### REACT-033 — The same props object skips the child

**Difficulty:** Senior

**Category:** Rendering

**Question:**

`Frame` holds count and renders `{children}`; outer parent passed `<Heavy />` and does not re-render with count. Does Heavy run? Why does a parent writing `<Heavy n={1} />` each time behave differently? Mutating the children element?

**Answer:**

`Heavy` does not run when `Frame` re-renders. The `<Heavy />` element was created by the outer parent, which did not render, so React sees the same element and skips it.

If a parent writes `<Heavy n={1} />` in its own render, it creates a new element and props object each time, so `Heavy` runs even though `n` is still `1`.

Mutating props on a reused element would also skip the render, but the UI could go stale, so avoid it. This differs from state bailout. Context updates still reach consumers.

**Follow-up:**

Skipped Heavy via same children reference reads ThemeContext; value changes. Does Heavy run?

Answer: Yes. A context change marks that component for update even if its props reference is the same.

### REACT-034 — A new prop reference defeats `memo`

**Difficulty:** Senior

**Category:** Rendering

**Question:**

`memo(Heavy)` gets same `title`, plus `options={{ dense: true }}`, `onSelect={() => select(id)}`, and child `<Icon />`. Which still skip? Custom compare `true` means? Mutate `options` and pass same object?

**Answer:**

By default, `memo` compares each prop with `Object.is`. The `title` string matches. But `options={{ dense: true }}`, the inline `onSelect`, and `<Icon />` as children are new references on every parent render, so any one of them breaks the comparison and the child re-renders.

With a custom compare function, returning `true` means the props are equal, so skip. That is the opposite of `shouldComponentUpdate`.

If you mutate `options` and pass the same object, `memo` skips and the UI stays stale. Stabilize callbacks and objects instead.

**Follow-up:**

Custom compare always returns `true`, including when `title` changes. What does the user see?

Answer: The old title. React did what the comparison said. The bug is in the comparison function, not in `memo`.

### REACT-035 — A list can hold different component types

**Difficulty:** Senior

**Category:** Reconciliation

**Question:**

Feed keyed by id chooses `TextBlock`/`ImageBlock`/`PollBlock` by `kind`. Kind `"b"` goes text→poll with key `"b"`. No keys, insert Image at index 0 in front of two Texts?

**Answer:**

React first matches by key, then checks that the component type is the same. If the item with key `"b"` changes from `TextBlock` to `PollBlock`, React remounts it, and the draft is lost. That is correct, because they are different widgets.

Without keys, inserting an Image at index 0 changes the type at that position, so it remounts. The following Text rows keep matching by index, so they reuse instances and show the wrong item's draft as items shift.

Put `key={block.id}` on the element the map returns.

**Code:**

```tsx
{blocks.map((block) => {
  const View = block.kind === "image" ? ImageBlock : TextBlock;
  return <View key={block.id} block={block} />;
})}
```

**Follow-up:**

Both kinds return `<article>`; kind changes under same key. Does the article DOM node survive?

Answer: No. When the component type changes, React unmounts the whole old subtree. It does not try to reuse DOM nodes from the old component.

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

### REACT-037 — Render does not read the DOM

**Difficulty:** Senior

**Category:** Render and commit

**Question:**

Tooltip computes `top` from `ref.current?.getBoundingClientRect()` in the body. Why wrong on first render, after moves, and on the server? Where should the read live?

**Answer:**

Render should only turn props and state into a description. It should not inspect the live page.

On the first render, `ref.current` is still `null`, so `top` falls back to `0` and that wrong value is committed. On later renders, the ref still points to the element as it was after the previous commit, so you measure old layout. On the server there is no layout or `document` at all.

Do the measurement in `useLayoutEffect`, which runs after the DOM is updated and before paint. Using `useEffect` can cause a visible flash.

**Code:**

```tsx
useLayoutEffect(() => {
  setTop(ref.current?.getBoundingClientRect().top ?? 0);
}, [label]);
```

**Follow-up:**

Also branch on `typeof window` for width under SSR+hydration?

Answer: That makes the server and client output differ, which causes a hydration mismatch. Keep the first client render identical to the server output, then adjust in a layout effect.

### REACT-038 — The initializer runs when the slot is created

**Difficulty:** Intermediate

**Category:** State

**Question:**

`useState(buildList(seed))` vs `useState(() => buildList(seed))`. When does `buildList` run? If `seed` changes while mounted? Strict Mode? What must it not do?

**Answer:**

`useState(buildList(seed))` calls `buildList` on every render, and React ignores the result after the first one. The function form, `useState(() => buildList(seed))`, calls it only once, when React creates the state.

If `seed` changes while the component stays mounted, the initializer does not run again. It runs again only after a remount.

In Strict Mode, React may call it twice in development, so keep it pure: no fetching, randomness, or mutation of outside data.

To follow a changing `seed`, derive the value, use `key={seed}`, or adjust state during render with a guard.

**Follow-up:**

Initializer closes over `seed` and `query` above it; `query` changes. List updates?

Answer: No. The initializer already ran with the `query` from mount time. Derive the list, use a key, or update it from the event that changed `query`.

### REACT-039 — Setting state during render restarts this pass

**Difficulty:** Senior

**Category:** State

**Question:**

During render, when `item.id !== prevId`, call `setPrevId` and `setDraft`. Allowed? Frame of old draft? Unconditional every render? Calling parent's `setSelected`?

**Answer:**

Yes, it is allowed when a component adjusts its own state in response to a prop or store change, as long as the condition becomes false after the restart. React throws away the current render and runs it again before painting, so the old draft is never shown.

If you set state unconditionally, it loops until React throws "too many re-renders."

Calling another component's setter during render is not supported. Use an event or an effect.

This is usually better than copying props into state in `useEffect`, which can paint the stale draft for one frame.

**Code:**

```tsx
if (item.id !== prevId) {
  setPrevId(item.id);
  setDraft(item.text);
}
```

**Follow-up:**

Same id, server normalizes `item.text`. How show it before paint without remount?

Answer: Store the last seen server text or a version. When it differs from the incoming value, set the draft during render, so the restarted render commits the new text. A key change also works, but it remounts.

### REACT-040 — `ref.current` is written in commit

**Difficulty:** Senior

**Category:** Refs

**Question:**

When is `ref.current` set for `<input ref={inputRef} />`? First render vs next? What does an inline callback ref do each commit / under Strict Mode?

**Answer:**

React sets `ref.current` during the commit phase, after the DOM is updated and before layout effects. During the first render, it is still `null`. In later renders, it points to the node from the previous commit.

A ref object stays the same across renders. A callback ref is called with the node when attached and with `null` when detached.

If you pass a new inline function each render, React detaches and reattaches it on every commit. Strict Mode adds extra attach and detach in development. Don't call `setState` from an unstable callback ref.

**Follow-up:**

`<input ref={…}>` then `<textarea ref={…}>` same position. After second commit, what is `.current`?

Answer: The textarea. The element type changed, so React detaches the input and attaches the textarea. The input's uncontrolled value and focus are gone.

### REACT-041 — A click outranks a scroll update

**Difficulty:** Advanced

**Category:** Scheduling

**Question:**

React `onClick` vs `onMouseMove` both `setState`. How does React 18 prioritize? What does `startTransition` inside either change? Does priority debounce mousemove?

**Answer:**

React 18 treats discrete events like clicks, key presses, and input as higher priority than continuous events like mouse moves, scrolling, and wheel. A click is therefore not stuck behind a long queue of mouse-move updates.

Wrapping an update in `startTransition` lowers it below both. Keep the click's own `setState` outside the transition.

Priority is not debouncing. Every `setState` still schedules work. If updates are expensive, reduce the work per update, for example by updating the DOM through a ref.

**Code:**

```tsx
setOpen(true);
startTransition(() => setChartData(compute(points)));
```

**Follow-up:**

Fifty `onScroll` `setScrollTop`s then a click—what about the click vs scrolls?

Answer: The click is discrete, so React schedules it ahead of the continuous scroll updates. To fix expensive scrolling, render less per update. Do not try to make scroll updates discrete.

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

### REACT-043 — `hydrateRoot` attaches to the server HTML

**Difficulty:** Senior

**Category:** Hydration

**Question:**

Server HTML already in `#root`. What does `hydrateRoot` do vs `createRoot().render`? Mismatched text/nodes? Attribute mismatch?

**Answer:**

`hydrateRoot` attaches React to HTML that the server already produced, so the browser does not rebuild it. React expects its first client render to match that markup. `createRoot` ignores it and replaces the container's contents.

If text or elements do not match, React 18 discards the server HTML for the nearest Suspense boundary (or the root) and renders it on the client. A mismatched attribute gives a warning. `suppressHydrationWarning` only covers one element, not a tree.

Typical causes are `window`, `Date`, random values, different data, or invalid nesting that the browser fixed.

**Code:**

```tsx
hydrateRoot(container, <App />);
```

**Follow-up:**

`suppressHydrationWarning` on a `<p>`; child `<span>` also differs. Covered?

Answer: No. It only covers that element's own text and attributes. The span still has to match, or needs its own reason for suppression.

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

### REACT-045 — After unmount, that setter does not paint

**Difficulty:** Senior

**Category:** State

**Question:**

Effect fetches then `setProfile` in `.then`. User navigates away; response arrives later. React 18 behavior? What must still be cancelled?

**Answer:**

The setter belongs to the component instance that was unmounted. If the response arrives later and calls it, nothing is painted and no new instance appears. React 18 also no longer logs a warning for this.

But silence is not cancellation. The request still runs and uses bandwidth. Abort it in the effect's cleanup with an `AbortController`, and ignore stale responses so an old request cannot overwrite a newer one.

Promise rejections are also not caught by error boundaries. Strict Mode's development remount needs the same cleanup.

**Code:**

```tsx
useEffect(() => {
  const c = new AbortController();
  fetch(url, { signal: c.signal }).then(/* setProfile */).catch(/* ignore AbortError */);
  return () => c.abort();
}, [url]);
```

**Follow-up:**

`url` changes; first response returns after second render. One shared outer `ignore` flag?

Answer: A flag or controller created per effect run protects that run. A single shared flag can be flipped by the old cleanup and then ignore the newest response too. Use one flag per effect run.

### REACT-046 — A matching host type updates the same DOM node

**Difficulty:** Senior

**Category:** Reconciliation

**Question:**

`<div className style={{ color }}>` re-renders with new class/style object—destroy node? Scroll/focus? Become `section`? `dangerouslySetInnerHTML` plus children?

**Answer:**

No, React does not destroy the node. If the host element type, position, and key are the same, React keeps the same DOM node and updates only the properties that changed. A new `style` object is compared field by field, so it does not cause a remount. Scroll position, focus, and selection are kept.

Changing `div` to `section`, or changing the `key`, replaces the node and its children, and browser state is lost.

Do not combine React children with `dangerouslySetInnerHTML`. Both would try to own the same content.

**Follow-up:**

Child goes string `"Hello"` → `<span>Hello</span>` → string. DOM?

Answer: A text node and an element are different kinds of children, so React replaces the node each time. If both were `span` elements, React would update the text in place.

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

### REACT-048 — `value={undefined}` is still providing a value

**Difficulty:** Intermediate

**Category:** Context

**Question:**

`createContext("edit")`. No provider; provider `value={undefined}`; nested providers `"edit"` outside and `"view"` inside. What does `useContext` return?

**Answer:**

With no provider above, `useContext` returns the default passed to `createContext`, here `"edit"`.

If there is a provider with `value={undefined}`, that still counts as a provider, so the component reads `undefined`, not the default.

With nested providers, the nearest one wins, so you get `"view"` inside.

Providers and consumers are matched by the context object itself. Create the context once at module level and import that same reference everywhere.

**Code:**

```tsx
const Mode = createContext<string | null>(null);
const mode = useContext(Mode); // null ⇒ no provider if that is your sentinel
```

**Follow-up:**

Module `Mode` provided; component creates another `createContext("edit")` and `useContext`s that. What is read?

Answer: The default `"edit"` of the new context object. Providers and consumers match by object reference, not by value or variable name.

### REACT-049 — Two roots do not share a batch

**Difficulty:** Senior

**Category:** Roots

**Question:**

Two `createRoot` trees; one click calls a setter from each. How many renders/commits? Can root1’s error boundary catch root2 render throws? Can root2 read root1 context?

**Answer:**

Each `createRoot` creates a fully separate React tree with its own render and commit. If one click updates both, you get two commits. They may happen before the next paint, but they are still separate.

An error boundary in root1 cannot catch a render error from root2, and context does not cross between roots.

Portals stay within one tree, so they are not a way to connect roots.

Create each root once and call `root.render` to update it.

**Follow-up:**

`flushSync(() => setOpen(true))` in root1, then root2’s setter. DOM of root1 when root2’s setter runs?

Answer: Root1 is already committed, because `flushSync` finishes before it returns. Root2 has not rendered yet. They are still separate trees.

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
