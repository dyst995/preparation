# R02 — Hooks and state management

React 18. Questions REACT-051–REACT-100.

### REACT-051 — Each hook slot stores a different thing

**Difficulty:** Intermediate

**Category:** Hooks

**Question:**

A function component calls `useState`, `useReducer`, `useRef`, `useMemo`, `useCallback`, `useEffect`, and `useContext` on every render, in that order. What does React keep for each call, and which of those calls are allowed to do work again on the next render?

**Context and Constraints:**

React 18 function component, mounted with `createRoot`. The component stays mounted at the same position and key. Hook order does not change. Development Strict Mode is off unless a sentence says otherwise.

**Senior Engineer's Answer:**

React keeps one slot per hook call on this mounted component and matches the next render by call order. The names of your variables are invisible to that matching. `useState` stores the state value and a setter whose identity is stable for the life of the slot. The initial argument is used only when the slot is created. If that argument is a function, React calls it as the initializer and stores the return value. Later renders skip the initializer. `useReducer` stores the state value and a stable `dispatch`. The reducer you pass on this render is the function React uses to apply the queued actions. The optional `init` function runs only when the slot is created.

`useRef` stores one object, `{ current }`, and returns that same object on later renders. The argument is the initial `current`, used when the slot is created. Writing `ref.current` does not schedule a render. `useMemo` stores the last dependency list and the last result. During render it compares each dependency with `Object.is`. Equal dependencies reuse the stored result. A difference runs your function and stores the new result. `useCallback(fn, deps)` stores a function the same way: while the dependencies compare equal, you get the same function identity, and that function still closes over the render that created it.

`useEffect` stores the effect function and its dependency list. It does not run during render. After this render is committed, React runs the previous cleanup and the new setup when the list is missing or a dependency fails `Object.is`. `useContext` does not store a copy of the context value in the component. During render it reads the nearest provider above this component and subscribes the component to that context's value identity.

React guarantees the slot order, the stable setter and `dispatch` and ref object, and the `Object.is` comparison for dependency lists. Your code guarantees the same hook sequence every render, pure initializers, pure reducers, and pure `useMemo` functions. An effect is where a subscription or other external work belongs. In development, Strict Mode may call initializers, reducers, updater functions, and `useMemo` functions twice and keep one result, and it may run effect setup, cleanup, and setup again on mount. Production does not add that extra cycle.

**Practical Implementation:**

Not applicable.

**Trade-offs and Alternatives:**

Several `useState` slots win when the values change independently and nothing needs to update them as one transition. One `useReducer` wins when the next value is a named event applied to several fields, because one pure function returns the whole next state. A ref wins for a value that must change without painting. `useMemo` and `useCallback` win when a later question's condition is true: the identity is part of a dependency list, a memoized child's props, or a context value. They are extra work on every render when nothing reads the identity. Context wins for a value many distant components read. It is a poor place for a value only one component needs.

**Common Mistakes:**

Treating every hook as "state that re-renders." Explaining a dependency list as a deep compare. Expecting `useContext` to keep a private copy that updates on a timer of its own. Calling a different number of hooks on the second render and expecting React to match slots by the text of the variable name.

**Senior-Level Follow-up:**

`useState(expensive())` and `useRef(expensive())` both mention `expensive`. What runs on the second render, and what is stored?

JavaScript evaluates the argument before the hook runs, so `expensive()` runs on every render in both cases. `useState` uses the value only while creating the slot, unless you passed a function, in which case that function is the initializer and React calls it when creating the slot. `useRef` has no initializer form in React 18. It stores the first computed value as `current` and ignores later arguments. The second render still pays for `expensive()` and still returns the original ref object. Pass `useState(() => expensive())` when the cost belongs only to the creation of the slot, and keep `expensive` pure.

### REACT-052 — The setter replaces the object

**Difficulty:** Intermediate

**Category:** State

**Question:**

What is `draft` after `onTitle`, after `onBody`, and after `applyBoth`? Each function runs in its own click, starting from `{ title: "", body: "" }`.

```tsx
type Draft = { title: string; body: string };

function Editor() {
  const [draft, setDraft] = useState<Draft>({ title: "", body: "" });

  function onTitle() {
    setDraft({ title: "A" });
  }

  function onBody() {
    setDraft((prev) => ({ ...prev, body: "B" }));
  }

  function applyBoth() {
    setDraft({ ...draft, title: "A" });
    setDraft({ ...draft, body: "B" });
  }

  return <p>{draft.title}:{draft.body}</p>;
}
```

**Context and Constraints:**

React 18, `createRoot`. One `useState` slot. Each function is a separate click handler starting again from `{ title: "", body: "" }`. No other updates. `applyBoth` runs both setters synchronously in that one handler.

**Senior Engineer's Answer:**

`onTitle` stores `{ title: "A" }`. `body` is gone. `useState`'s setter replaces the slot with the value you give it. It does not copy the previous fields the way class `this.setState` shallow-merges. The next render's `draft.body` is `undefined`.

`onBody` passes an updater. React calls it with the pending state, `{ title: "", body: "" }`, and stores the object you return, `{ title: "", body: "B" }`. The spread is your merge. React stores that return value as-is.

`applyBoth` queues two replaces, both computed from this render's `draft`. The first value is `{ title: "A", body: "" }`. The second value is `{ title: "", body: "B" }`. React applies the queue in order, and a bare value replaces the pending result, so the render commits `{ title: "", body: "B" }`. The title `"A"` never becomes state. Swap the second call for `setDraft((prev) => ({ ...prev, body: "B" }))` and the updater receives the pending object from the first replace, so the committed result is `{ title: "A", body: "B" }`.

React guarantees replacement, queue order, and that an updater argument is the pending state rather than a re-read of your local `draft` binding. Your code performs any merge. A new object is a new state even when every field matches, because the bailout check is `Object.is` on the slot value.

**Practical Implementation:**

```tsx
setDraft((prev) => ({ ...prev, title: "A", body: "B" }));
```

**Trade-offs and Alternatives:**

One object wins when the fields are one value you pass around and validate together. The updater plus a single-level spread is the merge. Nested fields still need their own copy: spreading `draft` and then setting `draft.author.city` mutates the previous author's object. Separate `useState` slots win when the fields change on different events and you do not want to copy the rest. A reducer wins when several events each update a different subset and you want those transitions in one function. None of the three adds class-style merge.

**Common Mistakes:**

Expecting `setDraft({ title: "A" })` to keep `body`. Expecting the two lines in `applyBoth` to build on each other because they are in one function. Mutating `draft.title = "A"` and calling `setDraft(draft)`, which can bail out because the reference did not change, while other closures already see the mutated object.

**Senior-Level Follow-up:**

`author` is `{ city: string }` inside `draft`. The handler does `setDraft((prev) => ({ ...prev, author: { ...prev.author, city: "Tbilisi" } }))`. A different handler does `setDraft((prev) => ({ ...prev, author: prev.author }))` and then `draft.author.city = "Tbilisi"`. Which one leaves the previous state unchanged?

The first one. The nested spread allocates a new `author`, so the previous state's `author` keeps its city. The second allocates a new outer object and stores the same `author` reference. The later assignment mutates that shared object, so the previous state and the next state show the new city. Render should read state. It should not mutate it. Copy every level you change.

### REACT-053 — The updater reads the pending state

**Difficulty:** Intermediate

**Category:** State

**Question:**

`count` is `0` and `history` is `[]`. The user activates `onSave` twice, and both calls pass `await save()` before either setter runs. What does each version commit? Why is the nested `setHistory` inside the first version's updater a bad fix?

```tsx
async function onSave() {
  await save();
  setCount(count + 1);
  setHistory([...history, count + 1]);
}

async function onSaveFunctional() {
  await save();
  setCount((c) => c + 1);
  setHistory((h) => [...h, count + 1]);
}
```

**Context and Constraints:**

React 18, `createRoot`. `count` and `history` are two `useState` slots. `save` resolves and does not set state. Both invocations start from the render where `count === 0` and `history` is `[]`. No `flushSync`.

**Senior Engineer's Answer:**

Both handlers close over `0` and `[]`. `await` returns in a later task, so these are two updates, not one synchronous batch. The first version calls `setCount(1)` twice and `setHistory([1])` twice. The second replace for each slot is `Object.is` equal to the first, so the committed result is `count === 1` and `history` equal to `[1]`. One activation was lost, and the history does not record two saves.

The functional version increments `count` twice. The first updater receives `0` and returns `1`. The second receives `1` and returns `2`. `setHistory((h) => [...h, count + 1])` does see the latest array, and it still appends the closed-over `count + 1`, which is `1` both times. The commit is `count === 2` and `history` equal to `[1, 1]`. The updater argument fixes only the value it receives. The expression `count + 1` is still the render that created the handler.

Computing the next count inside the `setCount` updater and calling `setHistory` from that updater puts a side effect in a function React may run twice in development Strict Mode. Updaters run while React is computing the next state. They must be pure: same arguments, same return, no nested updates. The pure place for "increment and append that new number" is one `useReducer` whose action returns both fields together.

React guarantees that each slot's queue is applied in order and that an updater receives the pending value of that slot. Your code guarantees that every value the next state depends on is either an updater argument or a reducer argument. A local binding from an older render stays at that render's value.

**Practical Implementation:**

```tsx
setCount((c) => c + 1);
setHistory((h) => [...h, h.length + 1]);
```

**Trade-offs and Alternatives:**

Two functional updaters are enough when each next value can be computed from its own previous value, as in the snippet, where the history entry is "one more than the previous length" rather than "the other slot's number." That coupling is accidental. When the appended number must be the count that this action produced, a reducer keeps one transition and cannot forget one of the fields. Reading the number from the event, when the event has it, avoids the closure entirely. A ref updated during render can show the latest count to a later callback, and it will not paint; use it for the callback, and use state for what the screen shows.

**Common Mistakes:**

Awaiting `setCount`. It returns void, not a promise. Assuming React 18 batching merges the two `await` continuations into one update. They are separate tasks; each task's own setters would batch, and each task here still computed `1` from the closure. Calling `setHistory` inside the count updater and treating a double history entry in Strict Mode as a React bug.

**Senior-Level Follow-up:**

The slot must store a function, `const [fn, setFn] = useState<() => number>(() => () => 0)`. How do you replace it with a function that returns `1`, and what does `setFn(() => 1)` store?

`useState`'s initial function is an initializer, so the extra `() =>` returns the function you want to store. The setter treats a function argument as an updater. `setFn(() => 1)` runs that updater and stores `1`. `setFn(() => () => 1)` runs an updater whose return value is the function that returns `1`, which is the replacement you want. The same rule applies to a reducer that stores a callback.

### REACT-054 — The interval keeps the first render's values

**Difficulty:** Senior

**Category:** Effects

**Question:**

The parent renders `<Ticker step={1} />` and later re-renders it with `step={5}` without changing the key. What does `count` do on each tick? What changes if the dependency list is `[count, step]`? What changes if the interval calls `setCount((c) => c + step)` and the list is `[step]`?

```tsx
function Ticker({ step }: { step: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + step);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return <p>{count}</p>;
}
```

**Context and Constraints:**

React 18, `createRoot`. `step` is a number prop. The component stays mounted. No other updates. Consider a production build for the tick sequence, and say what development Strict Mode adds on mount.

**Senior Engineer's Answer:**

The empty list means this effect's setup runs after the mount commit and does not run again when `step` or `count` changes. The interval function closes over `count === 0` and `step === 1` from that mount render. Each tick calls `setCount(1)`. The first tick commits `1`. Later ticks call `setCount(1)` again, `Object.is(1, 1)` is true, and React skips the re-render. The screen stays at `1`. The parent's `step={5}` renders `Ticker` with a new prop and does not restart this effect, so the interval never reads `5`.

`[count, step]` restarts the subscription whenever either value changes. The tick closes over the latest `count` and `step`, so the number on screen does move, and a change to `step` is visible. The cleanup clears the previous interval, so the 1000ms delay starts over on every tick. Freshness and "do not reset the timer" are different requirements. The dependency list fixed the closure and changed the timer behavior.

`setCount((c) => c + step)` with `[step]` uses the updater for the count and the dependency list for the prop the updater still closes over. Ticks become `1`, then `2`, then `3`, without resetting the timer when `count` changes. When `step` becomes `5`, cleanup runs, a new interval starts, and later ticks add `5`. Leaving `step` out of that list compiles and then keeps adding `1`. The updater does not refresh `step`. It only refreshes the state argument.

React guarantees that the effect function and its cleanup close over the render that created them, and that an empty list does not re-run the effect when props change. Your code guarantees that every reactive value the effect uses is a dependency, an updater argument, or a ref you update on purpose. In development, Strict Mode runs setup, cleanup, and setup again on mount, so this interval is created, cleared, and created again. Production creates it once. That extra cycle is not why the tick stays at `1`.

**Practical Implementation:**

```tsx
useEffect(() => {
  const id = setInterval(() => {
    setCount((c) => c + step);
  }, 1000);
  return () => clearInterval(id);
}, [step]);
```

**Trade-offs and Alternatives:**

The updater plus `[step]` is the right shape when the external timer should live until the step changes. A ref holding the latest `step`, written on each render, lets the effect depend on `[]` or only on the real external inputs and still read the current step at tick time. Use the ref when restarting the subscription is expensive and the value is an event input. Use the dependency when a new `step` should tear down and recreate the timer, or when the effect's work itself depends on `step` in a way you want restarted. Deriving nothing in an effect is the other axis: the count on screen is state because the timer is an external source of ticks, not because the JSX needed a copy of a prop.

**Common Mistakes:**

Reading an empty list as "latest props, once." Adding `count` to the list to silence a lint warning and then wondering why a one-second timer fires faster or drifts. Using the functional updater and still closing over `step`. Removing the cleanup, which in Strict Mode leaves the first interval running beside the second.

**Senior-Level Follow-up:**

The interval is registered with `setInterval` inside the effect, and the handler also calls `console.log(count)` next to the functional `setCount`. After three ticks with `step` staying `1` and dependencies `[step]`, what is logged, and what is `count`?

The logs are `0`, `0`, and `0`. The committed count is `3`. The log reads the closure from the render that created this effect. The updater reads the pending state at the time React applies that tick. Those are different reads. A log of the latest count belongs inside the updater, or in a ref written during render, or in an effect whose dependency is `count` and whose job is the log.

### REACT-055 — An empty dependency list freezes the closure

**Difficulty:** Senior

**Category:** Effects

**Question:**

`query` is state. The effect fetches it and the dependency list is `[]`. The linter says to add `query`. A teammate deletes the warning so the request "runs only on mount." The user then types, and `query` updates. What runs, what is stale, and when is `[]` an honest list?

**Context and Constraints:**

React 18 function component. `eslint-plugin-react-hooks` rule `react-hooks/exhaustive-deps` reports `query`. The fetch is a GET. The component stays mounted. Production build for the typing sequence. Development Strict Mode is a separate sentence.

**Senior Engineer's Answer:**

The effect closes over the first render's `query` and runs after mount. Typing calls `setQuery`, React re-renders, and the empty list still compares equal, so React does not run the cleanup or the setup. The screen can show the new query while the only request that went out used the mount-time string. If that response calls `setResults`, the results describe the old query. Missing `query` is a bug. The empty list is not an optimization that still means "the current query."

`[]` is honest when the effect body reads no props, state, or context that can change, and the cleanup really can run once on unmount. A subscription that reads the latest handler through a ref is the other honest case: the effect's closure does not use the handler binding, and the ref is updated on the renders that see a new handler. The list then contains the values that should restart the subscription, and it omits the event-like handler on purpose because restarting would be the wrong behavior. That omission is a designed ref, not a deleted warning.

The repair for this fetch is `[query]`, plus a cleanup that ignores or aborts the previous request. If a function exists only to be called from the effect, move it inside the effect so the list names the values it reads, not a new function identity every render. If that function is also passed to a child, `useCallback` with its own complete list gives the effect a stable identity. `setResults` and `dispatch` are stable, so the linter does not need them in the list.

React guarantees it will re-run the effect when a listed dependency fails `Object.is`, and that it will not re-run an empty list when state changes. Your code guarantees the list matches the values the effect actually uses. In development, Strict Mode still runs setup, cleanup, and setup on mount. That is a second mount-time run. It does not fetch the query the user typed later.

**Practical Implementation:**

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
    .then((res) => res.json())
    .then(setResults)
    .catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err);
    });
  return () => controller.abort();
}, [query]);
```

**Trade-offs and Alternatives:**

Putting `query` in the list refetches when the query changes. That is the product behavior for a search page, and the cleanup is what keeps an older response from winning. Debouncing the value that you put in the list, by storing a debounced string in state or a ref timer in the handler, cuts requests without lying about dependencies. An event handler is the right place for a fetch that should run because the user pressed Search, not because `query` changed. The handler reads the query from the event or from state at click time and does not need a dependency list.

**Common Mistakes:**

Deleting `exhaustive-deps` to mean "run once." Listing `query` and also an inline object like `{ query }`, which is a new reference every render and refetches every render. Writing `JSON.stringify(filters)` in the list to fake a deep compare when the effect should have depended on the fields it sends, or when the parent should have passed a stable filters object.

**Senior-Level Follow-up:**

The effect calls `load(query)`, and `load` is defined in the component and passed to a child. The linter wants `load` in the list. Adding `load` refetches every keystroke even when `query` is unchanged. What is the dependency that is actually changing?

`load`'s identity. A function declared in the component is a new reference every render, so `[load]` is a new dependency every render. If `load` only reads `query`, define it inside the effect and depend on `[query]`. If the child also needs it, wrap it in `useCallback` with `[query]` and let the effect depend on `load` or on `query`. An extra dependency that changes every render is a restart bug. A missing one is a stale bug. They are different mistakes.

### REACT-056 — Passive effects run after the paint opportunity

**Difficulty:** Senior

**Category:** Effects

**Question:**

A component commits a new `userId`. It has a `useEffect` whose list is `[userId]`, and the previous effect returned a cleanup. When does the cleanup run relative to the new setup, the DOM update, and the browser paint? What does React 18 Strict Mode do on the first mount, and what runs on the server?

**Context and Constraints:**

React 18, `createRoot` on the client. One effect. `userId` changes from `"a"` to `"b"` while the component stays mounted. No `useLayoutEffect` in this component. Server rendering is a separate part of the question.

**Senior Engineer's Answer:**

Render describes the UI. Commit applies the DOM for that description, then React runs layout effects, then the browser may paint, then React runs passive effects. `useEffect` is the passive one. The user can see the `"b"` render before this effect's fetch starts. The effect does not run during render and does not run on the server. After hydration, the client runs it following the same commit order.

On the update, React runs the cleanup from the `"a"` effect, then the setup from the `"b"` effect. The cleanup closes over `"a"`. The setup closes over `"b"`. Cleanups in a component run in declaration order, then setups run in declaration order. A second effect declared below this one sees the first effect's new setup already called when its own setup runs. On unmount, React runs the cleanup and does not run setup again.

In development, React 18 Strict Mode mounts, simulates an unmount, and mounts again, so this effect's setup runs, its cleanup runs, and its setup runs again. One tree is shown. State from the initializer is kept. The extra cycle is there so a missing cleanup is visible on the first mount. It does not run again on the later `userId` change. Production runs setup once per committed mount and once per dependency change, with the matching cleanup. React 17 Strict Mode double-rendered the function and did not remount effects. The effect remount is React 18's development check.

React guarantees that order relative to commit, including the chance to paint before passive effects. It does not guarantee a paint actually occurred on a busy main thread before every `useEffect`. Your code guarantees that setup can be repeated and that cleanup reverses it. A POST that must happen once, because the user submitted a form, belongs in the submit handler.

**Practical Implementation:**

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetchUser(userId, controller.signal).then(setUser, (err: unknown) => {
    if (err instanceof DOMException && err.name === "AbortError") return;
    setError(err);
  });
  return () => controller.abort();
}, [userId]);
```

**Trade-offs and Alternatives:**

`useEffect` is the default for a subscription, a log, or a fetch tied to a committed id, because it does not block paint. `useLayoutEffect` is justified when the user would see a wrong frame if the work waited. An event handler is justified when the external action is the user's action rather than a consequence of the committed props. Deriving a label from `userId` during render beats an effect that copies it into another state slot. Several `setState` calls inside one effect are one batched render in React 18. They are still a second render after the one that committed the effect.

**Common Mistakes:**

Starting the fetch in the component body because "the effect feels late." Expecting the cleanup of `"b"` to run before the setup of `"b"` on the same commit. The cleanup that runs first is the previous effect's. Treating a double request in a production build as Strict Mode. Treating the development double setup as a reason to delete the cleanup.

**Senior-Level Follow-up:**

The effect calls `setUser` with the fetched object, and the component also calls `setLoading(false)` in the same setup. How many renders does that effect add, and can the user see the loading flag from the render that started the fetch?

One extra render. Both setters run inside the same passive effect, so React 18 batches them. The render that committed `userId` already painted, or at least was handed to the browser, with whatever loading flag that render described. If that render set loading to `true` during the event that changed `userId`, the user can see it before the effect runs. The effect's `setLoading(false)` updates a later render. It does not rewrite the render that scheduled the effect.

### REACT-057 — Layout effects run before the browser paints

**Difficulty:** Senior

**Category:** Layout effects

**Question:**

A tooltip reads `getBoundingClientRect` and then sets `top` so the box sits next to an anchor. What does the user see if that work is in `useEffect`? What changes in `useLayoutEffect`? Why is the layout effect the wrong default for a fetch?

**Context and Constraints:**

React 18 client render with `createRoot`. The measurement and the `setTop` are synchronous. The component also server-renders. No third-party tooltip library.

**Senior Engineer's Answer:**

Render describes `top`. Commit writes the DOM. `useLayoutEffect` runs after that DOM write and before the browser paints. A `setTop` from that layout effect is flushed before paint, so the user sees the corrected position rather than a frame at the previous `top`. The same work in `useEffect` runs after the browser has had a chance to paint the first committed `top`. A fast machine may make the flash hard to spot. The ordering still allows it, which is why a position correction belongs in the layout effect.

The layout effect blocks paint for as long as it runs. A fetch there delays the frame until the request is started, and it still cannot finish the request before paint unless you block on a synchronous API, which a network call is not. The response arrives later and sets state in a later render either way. `useEffect` is the one that lets the browser paint the committed tree first. Use the layout effect for a DOM read or write that must match this commit's layout. Use the passive effect for network, subscriptions, and logs.

On the server, `useLayoutEffect` does not run. React 18 warns that it cannot be encoded into the server output. The server HTML has the pre-measurement `top`. The client applies the measured `top` after hydration, in the layout effect, before the browser paints the hydrated frame. That is acceptable when the server HTML is the unmeasured fallback and the client correction happens before paint. It is a visible mismatch if the server HTML and the client's first painted frame must already agree. `useEffect` does not run on the server either, and it runs after the client has had a chance to paint.

React guarantees the layout-effect timing relative to DOM mutations and paint, and the passive-effect timing after that paint opportunity. Your code guarantees the measurement is finite and that a `setTop` bails out when the pixel did not change. Strict Mode in development runs the layout effect's setup, cleanup, and setup on mount as well.

**Practical Implementation:**

```tsx
useLayoutEffect(() => {
  const next = anchorRef.current?.getBoundingClientRect().bottom ?? 0;
  setTop((prev) => (prev === next ? prev : next));
}, [anchorRect]);
```

**Trade-offs and Alternatives:**

CSS that anchors the tooltip to the target removes the measurement from React. A callback ref runs when React attaches the node, which is the right moment to record the node, and the measurement can still live in the layout effect so it sees layout. `useEffect` wins for a size log that nobody sees. Gating the component so it renders only on the client avoids the server warning when the whole tooltip is meaningless in HTML. Choosing `useLayoutEffect` or `useEffect` with a `typeof window` check inside the component changes the hook sequence if that condition ever flips between renders. Decide once per module, or render a client-only child whose hook sequence is stable.

**Common Mistakes:**

Measuring in the component body, where the DOM for this render is not committed and a server render has no layout. Leaving `setTop(next)` unguarded when `next` is a new object every time, so the layout effect schedules another update forever and never reaches paint. Using `useEffect` for the position and calling the flash a styling bug. Fetching inside `useLayoutEffect` to "make the data arrive before paint."

**Senior-Level Follow-up:**

The layout effect always calls `setTop({ y: measured })` with a freshly allocated object, and `measured` is the same pixel as last time. What does the user see, and where does the time go?

The user does not get a stable frame. Each layout effect schedules a new object, `Object.is` fails, React renders again, and the layout effect runs again before paint. React then stops the nested updates and reports that the maximum update depth was exceeded. Store a number, or return the previous state from the setter when the pixel is unchanged, so the update bails out and the browser can paint.

### REACT-058 — The effect writes a new object into its own dependency

**Difficulty:** Advanced

**Category:** Effects

**Question:**

The component mounts with `filters` equal to `{ q: "", page: 1 }`. Nothing is typed. What happens, and which dependency stops the loop without an extra render?

```tsx
function SearchBox() {
  const [filters, setFilters] = useState({ q: "", page: 1 });

  useEffect(() => {
    setFilters({ q: filters.q, page: 1 });
  }, [filters]);

  return (
    <input
      value={filters.q}
      onChange={(event) =>
        setFilters({ q: event.target.value, page: 1 })
      }
    />
  );
}
```

**Context and Constraints:**

React 18, `createRoot`. `fetch` is not involved. The effect body is exactly the `setFilters` shown. Development and production both loop; Strict Mode is not the cause.

**Senior Engineer's Answer:**

Mount renders `{ q: "", page: 1 }`. After commit, the effect runs and calls `setFilters` with a new object that has the same fields. `Object.is` on two different objects is false, so React renders again. The dependency `filters` is that new object, so the effect cleans up and runs again, allocates another object, and renders again. The field values never need to change. The loop is the new reference flowing back into the dependency that created it. React aborts a nested update storm and reports that the maximum update depth was exceeded. The `onChange` path is a normal new object per keystroke. It is not a dependency of an effect that writes `filters`, so typing is not what starts this loop. Mount is enough.

Depend on the fields the effect actually reads, and write state only when the next value is a real change. Here the effect's only work is forcing `page` to `1`, and the mount state is already `page: 1`. The effect should not exist. Set `page: 1` in the `onChange` that edits `q`, which this component already does. If an effect must reset `page` when `q` changes, `[filters.q]` is the dependency, and the setter should return the previous state when `page` is already `1`:

React then bails out, the effect does not re-run, and a `q` change produces one reset. Depending on `[filters.q, filters.page]` and always allocating `{ q, page: 1 }` stops the infinite loop and still costs a render whenever the effect sets an object whose `page` was not already `1`. After that render the primitive dependencies compare equal, so it stops. The bailout form avoids that extra render when the page was already `1`.

React guarantees `Object.is` on each dependency and on the state slot, and it guarantees it will stop a runaway nested update. Your code guarantees an effect does not publish a fresh object into a dependency it also lists. An object created in the component body has the same trap: `const params = { q: filters.q }` is a new dependency every render if the list is `[params]`.

**Practical Implementation:**

```tsx
useEffect(() => {
  setFilters((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
}, [filters.q]);
```

**Trade-offs and Alternatives:**

The better trade is to delete the effect and keep the reset next to the event that changes `q`. The effect version is justified only when `q` can change from a place that does not go through that handler, and even then the updater must bail out. A fetch effect depends on `filters.q` and `filters.page`, or on those primitives built into a URL string, and it stores the response in a different state slot. Storing the response by spreading it into `filters` while `filters` is a dependency is this loop with a network round trip between iterations. `useMemo` for the params object is appropriate when a child or an effect needs a stable params identity and the fields did not change. It is not appropriate as a way to hide this effect from its own writes.

**Common Mistakes:**

Adding `filters` because the linter said the effect reads `filters`, then silencing the resulting loop by deleting the dependency. The linter was right that the effect reads it. The effect should not have written a new `filters`. Wrapping `setFilters({ ...filters, page: 1 })` in a ref compare that still allocates before the compare. Expecting React to deep-compare the object dependency.

**Senior-Level Follow-up:**

The dependency list stays `[filters]`, and the body becomes `setFilters((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }))`. Does mount still loop?

No. The updater returns the same reference, React skips the re-render, and the effect does not run again. The loop is gone and the effect is still the wrong owner of a value the click handler already sets. If `page` were `2` on mount, the updater would return a new object once, the effect would run again because `filters` changed, and the second call would return `prev` and stop. One reset, then a bailout. Depend on `filters.q` if a later `q` change is the event that should reset the page.

### REACT-059 — The in-flight request has to be dropped

**Difficulty:** Senior

**Category:** Effects

**Question:**

`userId` changes from `"a"` to `"b"` before the fetch for `"a"` resolves. The effect lists `[userId]` and has no cleanup. Both responses arrive, `"a"` last. What does the component show? What does a cleanup change, and what does React 18 Strict Mode add in development?

**Context and Constraints:**

React 18, `createRoot`. `fetch` is `GET /users/:id`. The component stays mounted for both responses. No cache library. Production sequence first.

**Senior Engineer's Answer:**

Both requests stay in flight. The `"b"` response can set state to user B, and the later `"a"` response sets state to user A. The screen shows A under a render that asked for B. React does not cancel `fetch`, and it does not order your promise callbacks. The dependency list restarted the effect and started the second request. Without a cleanup, the first callback is still a live `setUser`.

Cleanup runs before the `"b"` setup and on unmount. It is the place you either abort the request or ignore its result. `AbortController` asks the browser to drop the request and rejects the promise with an `AbortError`, which the effect should not store as a user-facing error. A local `ignore` flag lets the old promise resolve and then skips `setUser`. The work still finishes. Abort is the better default when the API accepts a signal. The flag is the fallback when it does not. Either one is your guarantee. React's guarantee is that it will call the cleanup you returned.

In development, Strict Mode runs setup, cleanup, and setup on mount. With abort, the first request is aborted and the second is the one that can set state. Without cleanup, two requests for the same id stay in flight and either response can write state. Production does not add that mount cycle. A double GET in production, for one id and no remount, is two effects or two callers, not Strict Mode. A POST in this effect runs twice in development and once per real dependency change in production, which is the wrong shape for a write the user expects once. Put that POST in the handler.

If the component unmounts before the response, React 18 does not paint that `setUser` and does not warn the way React 17 did. The bug that remains while the component is mounted is the stale response, not the unmount warning.

**Practical Implementation:**

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/users/${userId}`, { signal: controller.signal })
    .then((res) => res.json())
    .then(setUser)
    .catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err);
    });
  return () => controller.abort();
}, [userId]);
```

**Trade-offs and Alternatives:**

Abort frees the network and makes the race impossible because the old promise does not resolve with data. The ignore flag is less code and still prevents the stale write when you cannot signal the request. A request id checked inside `then` is the same idea as the flag. A cache that keys the result by `userId` and ignores a response whose id is no longer current is the same rule moved into one owner, which is worth it when many components ask for users. It does not remove the need to cancel or ignore. Debouncing `userId` in the handler reduces how often the effect restarts. It is not a substitute for the cleanup.

**Common Mistakes:**

Assuming the dependency change cancels the previous promise. Setting an error from `AbortError` and flashing an error on every keystroke. Guarding with a module-level "request in progress" boolean, which also blocks the legitimate `"b"` request and breaks two mounted components. Removing Strict Mode so a missing cleanup is quieter.

**Senior-Level Follow-up:**

The cleanup sets `ignore = true`, and the `.then` checks it. `"a"` was aborted in the product sense of "do not apply," but the promise still resolves. Can its `then` run after `"b"` has already been written, and what must it do?

Yes. The flag's job is that this late `then` returns without `setUser` and without `setError`. `"b"` remains. If the `then` sets state whenever the promise fulfills, the flag was pointless. Abort plus ignoring `AbortError` is the version where that callback should not see a successful body at all.

### REACT-060 — A reducer returns the next state for one slot

**Difficulty:** Intermediate

**Category:** Reducers

**Question:**

`count` and `history` must change together: an `"saved"` action increments the count and appends that new count, and a `"reset"` action sets both back to `0` and `[]`. Why is `useReducer` a better fit than two `useState` setters here? What does React do with `dispatch`, the reducer function, and a third `init` argument?

**Context and Constraints:**

React 18 function component. One event can be `"saved"` or `"reset"`. State is `{ count: number; history: number[] }`. No external store.

**Senior Engineer's Answer:**

Two setters update two slots. Each updater sees only its own pending value. The history entry that must equal the count this action just produced has to be computed in one place, or the two queues can record different numbers, which is the bug in the overlapping `await` handlers. A reducer receives the current state and one action and returns the next state. `"saved"` returns `{ count: state.count + 1, history: [...state.history, state.count + 1] }`. `"reset"` returns `{ count: 0, history: [] }`. One dispatch, one slot, one transition. React replaces the slot with what you return. It does not merge fields you forgot.

`dispatch` is stable for the life of the slot. An effect or a memoized child can take it without restarting when the component re-renders. React uses the reducer function from the render that processes the update, so a reducer closed over a prop sees that render's prop, not a copy frozen when you created `dispatch`. `useReducer(reducer, initialArg, init)` stores `init(initialArg)` when the slot is created and then ignores both arguments. A later change to `initialArg` does not reset the slot. In development, Strict Mode calls `init` twice when the slot is created and calls the reducer twice per dispatched update, keeping one result. Both functions have to be pure.

React guarantees the stable `dispatch`, the queue order, and the `Object.is` bailout when the reducer returns the same state reference. Your code guarantees a pure reducer: no fetch, no `Date.now()` the UI depends on, no mutation of `state`. Reset the slot by dispatching `"reset"`, or by changing the component's `key`, when a new entity must discard the count and the history together.

**Practical Implementation:**

```tsx
type State = { count: number; history: number[] };
type Action = { type: "saved" } | { type: "reset" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "saved": {
      const count = state.count + 1;
      return { count, history: [...state.history, count] };
    }
    case "reset":
      return { count: 0, history: [] };
  }
}
```

**Trade-offs and Alternatives:**

`useState` is easier to read when the next value does not depend on another field and the events are single assignments. A reducer is easier to read when several events share a protocol and the tests can call `reducer` without rendering. The reducer still cannot see another component's state. Lift it, or pass that value in the action, when the transition needs it. Putting the reducer in a context so distant children can `dispatch` is reasonable when many of them send actions and the state is not a high-frequency value. The context value should be the stable `dispatch` plus state you memoize, or the consumers re-render on every provider render.

**Common Mistakes:**

Mutating `state.history.push` and returning `state`, then wondering why no render happened. Expecting `useReducer(reducer, props.initial)` to track `props.initial`. Closing over `props.step` inside an updater-style `setState` and thinking a reducer has the same stale-prop problem. Dispatching from an effect is safe because `dispatch` identity is stable; doing `setCount(count + 1)` from that effect is not.

**Senior-Level Follow-up:**

The reducer is declared inside the component and reads `props.step`. An effect with `[]` calls `dispatch({ type: "saved" })` once. Which `step` does the saved count use if the parent has already rendered a new `step` before the effect flushes?

The render that processes the dispatch passes the reducer closed over that render's `props.step`. It is not the `step` from a closure captured inside the empty effect, because the effect did not call the reducer. It called `dispatch`. If the effect itself computed `count + step` and called `dispatch({ type: "saved", step })`, the action should carry the step you intend, and the reducer should read the action, not a prop it might not want. Pass data that defines the event on the action when the event's meaning is "the step at click time" rather than "the step now."

### REACT-061 — Mutating and returning the same state skips the render

**Difficulty:** Senior

**Category:** Reducers

**Question:**

The user dispatches once with `"a"`. What does the screen show in production? What does development Strict Mode add? What should the reducer return instead?

```tsx
type State = { items: string[] };

function reducer(state: State, item: string): State {
  state.items.push(item);
  return state;
}

function List() {
  const [state, dispatch] = useReducer(reducer, { items: [] });
  return (
    <button onClick={() => dispatch("a")}>{state.items.join(",")}</button>
  );
}
```

**Context and Constraints:**

React 18, `createRoot`. One dispatch per click. The initial state is `{ items: [] }`. No parent is forcing a re-render in the production case.

**Senior Engineer's Answer:**

`push` mutates the existing array, and the reducer returns the same state reference. `Object.is(next, prev)` is true, so React skips this update and does not commit a new render for it. The button text stays `""`. The array now contains `"a"` anyway. A later render that does run, because a parent rendered this component, reads that mutated array and shows `"a"` without a dispatch React accepted as a change. The previous state and the next state are the same object.

In development, Strict Mode calls the reducer twice and keeps one result. Two `push` calls run on the same array, so the mutated array holds `"a"` twice, and the bailout still skips the update because the reference did not change. The double item is the impurity. It is not two user clicks. Production calls the reducer once per dispatched action and still bails out on the same reference.

Return a new state: `{ items: [...state.items, item] }`. React sees a different reference and renders `a`. The previous state's array is untouched, so a later read of an older snapshot does not contain `"a"`. Copy every level you change. Pushing into a copy of the array and returning a new outer object is the whole fix.

React guarantees the `Object.is` bailout and, in development, the extra reducer call. Your code guarantees the reducer does not mutate its arguments. The bailout is the correct behavior for "this action changes nothing," which you express by returning `state` on purpose, for example an `"add"` of an item that is already present.

**Practical Implementation:**

```tsx
function reducer(state: State, item: string): State {
  return { items: [...state.items, item] };
}
```

**Trade-offs and Alternatives:**

A structural copy is cheap next to a DOM update and keeps the bailout meaningful. A library that produces immutable updates is justified when the state tree is deep enough that hand-written spreads get the levels wrong. It does not change the contract: the value you return is the next state. `useState` with an updater has the same mutation trap. A class component's `this.setState` does not make in-place `push` safe either. The immutable return is the model that works with the bailout, with Strict Mode's double call, and with any later render that still holds the previous object.

**Common Mistakes:**

Returning `{ ...state, items: state.items }` after `push`. The outer object is new, so React renders, and the array is still shared and still pushed twice under Strict Mode. Reading a bailout as "React lost the update" and wrapping `dispatch` in `flushSync`. Disabling Strict Mode so the doubled push disappears while the mutation stays.

**Senior-Level Follow-up:**

The pure reducer returns `state` unchanged when the item is already in the list. The parent re-renders anyway and passes a new `title` prop. Does this component run, and does the list reset?

This component runs because its parent rendered it. The reducer bailout applies to the update from `dispatch`, not to a parent render. The list does not reset. A bailout is not a cache of the element tree across parent renders. `memo` is what compares props and can skip this component when `title` is not a prop it takes, or when `title` is unchanged. The reducer's state remains the same slot either way.

### REACT-062 — The ref object is stable and writes do not render

**Difficulty:** Intermediate

**Category:** Refs

**Question:**

`const ref = useRef(0)` runs in a component that re-renders for other reasons. What is stable across those renders? If a click does `ref.current += 1` and does not call a setter, what does the screen show, and what does a later render see in `ref.current`? When does React itself write `current`?

**Context and Constraints:**

React 18 function component. The ref is created with `useRef`. A different JSX attribute, `ref={ref}` on a `<div>`, is the case where React writes `current`. No state update in the click.

**Senior Engineer's Answer:**

`useRef` returns the same object for the life of the slot. Re-rendering the component does not reset `current` and does not give you a new object. The argument `0` is the initial `current` when the slot is created. There is no lazy-initializer form. `useRef(expensive())` evaluates `expensive()` on every render and then ignores the result after mount.

The click mutates `current` from `0` to `1`. React does not schedule a render for that write, so the screen stays on whatever the last committed state described. JSX that reads `ref.current` during render does not subscribe to it. A later render caused by some other state update sees `1`, because the object survived. Until that render, nothing on screen is obliged to mention `1`.

When the same object is passed as `<div ref={ref}>`, React writes `current` during commit, after it attaches the DOM node, and writes `null` when it detaches the node. That write also does not render. Reading `ref.current` in the component body during the render that created the `<div>` still sees the previous node or `null`, because commit has not run. A layout effect, a passive effect, and an event handler see the node. The handler sees it because the event is dispatched on the committed tree.

React guarantees the stable object, the "no render on write" rule, and the commit timing of the host `ref` assignment. Your code guarantees that anything the user must see is state, and that a render does not branch on `ref.current` to describe a different tree. In development, Strict Mode's extra mount cycle detaches and reattaches a host ref, so a ref callback runs with the node, with `null`, and with the node again.

**Practical Implementation:**

```tsx
const timerId = useRef<number | null>(null);

function start() {
  if (timerId.current != null) return;
  timerId.current = window.setInterval(tick, 1000);
}
```

**Trade-offs and Alternatives:**

A ref is the right place for a timer id, a socket, or the last seen value you will read from an asynchronous callback. State is the right place for the tick count the JSX prints. If both exist, the state update is what paints, and the ref is what the callback reads so it does not restart the timer. A callback ref, `ref={(node) => { ... }}`, runs on commit when the node is attached and with `null` when it is cleared. An inline callback is a new identity every render, so React will call the previous callback with `null` and the new one with the node on every commit. Wrap it in `useCallback` when that detach-and-attach is not what you want.

**Common Mistakes:**

Expecting `ref.current += 1` to change the button label. Using `useRef(0)` as if it were `useState(0)`. Reading `divRef.current` while rendering to decide the tooltip position. Putting `ref.current` in a dependency list: mutating `current` does not re-render, so the effect will not re-run, and the listed value is the `current` from the render that last ran.

**Senior-Level Follow-up:**

`<div ref={(node) => { nodeRef.current = node; }} />` is inline, and the parent re-renders because of unrelated state. Does React clear the node in between?

Yes. The callback identity changed, so React calls the previous function with `null` and the next function with the DOM node during commit. `nodeRef.current` is briefly `null` and then the node again, and your callback's body runs both times. That is a problem if the body subscribes using the node and the cleanup is incomplete. A stable callback from `useCallback`, or the ref object itself (`ref={nodeRef}`), attaches when the node appears and detaches when it leaves, not on every parent render.

### REACT-063 — A ref keeps the latest value for a later callback

**Difficulty:** Senior

**Category:** Refs

**Question:**

A chat socket is created in an effect that depends on `[roomId]`. The parent passes `onMessage`, a new function whenever the parent's other state changes. How do you keep the socket for the life of `roomId` and still handle the latest `onMessage`? What is stale if you list `onMessage`, and what is stale if you store it in a ref from an effect with `[]`?

**Context and Constraints:**

React 18. `createConnection(roomId)` subscribes immediately and can deliver a message before the next paint. `onMessage` reads the parent's latest draft state. No `useEffectEvent`; that API is not a stable React 18 export.

**Senior Engineer's Answer:**

The socket is the external subscription. It should reconnect when `roomId` changes and not when the parent renders a new callback. Put `roomId` in the effect's dependency list, and read the handler from a ref at the moment a message arrives. Update that ref from the latest render. The effect React's own "events versus effects" split describes is declared with no dependency list, above the subscription, so it runs after every commit and writes `onMessage` into the ref. The subscription effect's closure calls `handlerRef.current(event)`. Its list is `[roomId]`. The linter is satisfied because the subscription does not read the `onMessage` binding.

Listing `onMessage` reconnects the socket on every parent render when the callback is inline. That is a behavior bug, not freshness you want. An effect with `[]` that writes the ref once keeps the mount-time callback forever. Messages call the first `onMessage`, which closes over the first draft. The empty list is the stale-closure bug moved into a ref.

The no-list effect runs after the paint opportunity, only for a render that committed. A message that arrives after commit and before that passive effect still sees the previous handler. If the socket can deliver in that gap, write the ref in `useLayoutEffect` with no dependency list so the write happens after this commit's DOM updates and before paint, or assign `handlerRef.current = onMessage` during render so the write is already done before effects. The during-render assignment also runs for a render React later discards. The next render of this component overwrites it. The layout or passive effect runs only for the committed tree.

React guarantees the ref object's identity and that writing `current` does not render. Your code guarantees the ref is updated on the renders that see a new `onMessage`, and that the JSX does not use the ref as the thing it displays. `onMessage` itself still closes over the parent render that created it. The ref does not repair a parent `useCallback` whose list omitted the draft.

**Practical Implementation:**

```tsx
function useChatRoom(roomId: string, onMessage: (text: string) => void) {
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  useEffect(() => {
    const connection = createConnection(roomId);
    connection.on("message", (text: string) => {
      onMessageRef.current(text);
    });
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]);
}
```

**Trade-offs and Alternatives:**

The no-list effect is the default when a message will not arrive before passive effects, which is true for a click and often true for a socket that starts connecting inside the same commit. `useLayoutEffect` for the ref write is the tighter gap when a listener is already live. Assigning during render is the tightest and is the usual way to remember the previous value for the render itself. Restarting the socket on every `onMessage` identity is simpler to read and wrong when connect is expensive or loses messages. React 19's `useEffectEvent` is the later API for "read the latest handler without a dependency." React 18 code uses the ref.

**Common Mistakes:**

Putting `onMessage` in the socket effect and calling the reconnects harmless. Updating the ref in an effect with `[]`. Reading `onMessageRef.current` during render to choose what to return. Forgetting that a memoized parent callback with a missing dependency stays stale no matter how quickly the ref is assigned.

**Senior-Level Follow-up:**

`ChatRoom` is wrapped in `memo`. The parent passes an inline `onMessage` and an unchanged `roomId`. Does the ref update?

Yes. `memo` compares props. A new `onMessage` function fails `Object.is`, so `ChatRoom` renders and the ref effect writes the new function. If the parent wraps `onMessage` in `useCallback` with a complete list, the identity changes only when those dependencies change, and the ref updates on that render. If the parent's list is empty and the function reads a draft, `memo` may skip `ChatRoom`, and the ref keeps the stale function. The skip is consistent with the stale callback. Fix the callback's dependencies, or do not memoize over a function you meant to replace.

### REACT-064 — useMemo caches a result while dependencies compare equal

**Difficulty:** Senior

**Category:** Memoization

**Question:**

When does `useMemo(() => filter(items, query), [items, query])` recompute, when does it return the stored array, and when is adding `useMemo` the wrong fix? Does the child of a memoized value skip rendering?

**Context and Constraints:**

React 18. `items` is an array prop. `query` is a string. `filter` is pure and synchronous. The component renders `<List items={visible} />`, and `List` is not wrapped in `memo` unless the question says so. Development Strict Mode is called out separately.

**Senior Engineer's Answer:**

`useMemo` runs `filter` during render when the slot is created and whenever `items` or `query` fails `Object.is` against the stored dependencies. While both compare equal, React returns the stored array, the same reference. A parent that passes a new `items` array every render defeats the cache even when the contents are unchanged. A string `query` compares by value. The cache is a performance tool. The docs allow React to drop a cached value and recompute, and development Strict Mode already calls the function twice to surface impure work. The component has to be correct if `filter` runs on every render. A `filter` that pushes into a module-level cache or fires a request is a bug with or without `useMemo`.

Add `useMemo` when the work is expensive enough that you have seen it in a profile, or when the reference is a dependency of another hook, a prop of a `memo` child, or a context value. A cheap filter that only becomes `visible.map` in this component does not need it. The child `List` still runs when this component runs, because `useMemo` does not skip children. It skips repeating `filter` and stabilizes the array reference. `memo(List)` can then skip `List` when `visible` and the other props compare equal. Without `memo`, the stable array does not change how many times `List` is called.

Missing `query` from the list returns the previous array for a new query. That is a stale UI, the same class of bug as a missing effect dependency. An extra dependency that is a new object every render recomputes every render and gives you the cost of `useMemo` plus the cost of `filter`.

React guarantees an `Object.is` compare of the list you passed and one stored result per slot. Your code guarantees a pure function and a complete list. `useMemo` does not run after paint and does not belong around a subscription.

**Practical Implementation:**

```tsx
const visible = useMemo(() => filter(items, query), [items, query]);
```

**Trade-offs and Alternatives:**

Computing `const visible = filter(items, query)` during render is the default. It cannot be stale, it allocates the dependencies and the result only as the render already would, and it is shorter. `useMemo` wins once `filter` shows up in a profile or a child is memoized on `visible`. Moving the filter into `List` wins when only `List` needs it and the parent should not recompute or pass the array. A server render runs `useMemo` because it runs during render. Keep the function pure so the server result and the client's first render agree.

**Common Mistakes:**

Wrapping every derived array because "React prefers memo." Using `useMemo` to stop an effect loop by hiding a new object, while the effect still writes that object. Expecting `useMemo` to deep-compare `items`. Omitting a dependency to keep the reference stable, which freezes the wrong array on screen.

**Senior-Level Follow-up:**

`useMemo(() => items.filter(byQuery), [items, query])` returns an array that is passed to `useEffect(() => subscribe(visible), [visible])`. `items` is stable and `query` changes every keystroke. How many times does the effect run, and what would change if `visible` were computed without `useMemo`?

A render whose only change is `query` produces one new array either way, and the effect runs once for that keystroke. `useMemo` returns the stored array on any other render where `items` and `query` still pass `Object.is`, so the effect does not re-run. Without `useMemo`, every render of this component allocates a new array, and those extra renders resubscribe. The memo is doing identity work for the effect, which is a real reason to keep it. The effect can instead depend on `query` directly and build the filtered list inside the subscription. Do not keep `useMemo` only to paper over an effect that listed an inline array.

### REACT-065 — useCallback preserves the closure from the render that created it

**Difficulty:** Senior

**Category:** Callbacks

**Question:**

The parent renders `<SaveButton docId="a" />` and later renders `<SaveButton docId="b" />` with the same component instance. The user then clicks Save. Which id is sent? What does `[docId]` change? What does `useCallback` not do to the click?

```tsx
function SaveButton({ docId }: { docId: string }) {
  const [saved, setSaved] = useState(false);
  const onClick = useCallback(() => {
    save(docId).then(() => setSaved(true));
  }, []);
  return <button onClick={onClick}>{saved ? "Saved" : "Save"}</button>;
}
```

**Context and Constraints:**

React 18. `SaveButton` stays mounted. No `memo` parent is required for the question. `save` returns a promise and does not cancel. One click after the prop has become `"b"`.

**Senior Engineer's Answer:**

The empty list keeps the function created on the first render. That function closes over `docId === "a"`. The click sends `"a"` and then sets `saved` to `true`. The button label can say Saved while the request wrote the previous document. `setSaved` is stable, so omitting it is fine. Omitting `docId` is the bug. `useCallback` did not make the function see later props. It kept the old function so its identity would compare equal, which is the opposite of freshness.

`[docId]` returns a new function when `docId` changes and keeps it while `docId` stays `"b"`. The click sends `"b"`. Identity changed exactly when the closure would have been stale. That is the correct list. An inline `onClick` without `useCallback` also sends `"b"`, because each render creates a function that closes over that render. The inline function is a new reference every render. Use the inline function when nothing depends on the reference. Use `useCallback` when something does: a `memo` child, an effect dependency, or a context value.

`useCallback` does not defer the click, does not batch by itself, and does not compare function bodies. It is `useMemo` for a function. The cost is the dependency compare on every render plus the stored function. A cheap button with no memoized child does not need that cost. In development, Strict Mode may invoke a `useMemo` factory twice. `useCallback`'s function is the value being stored, not a factory React calls to produce the handler. The handler runs when the button event runs, once per click. It is not double-invoked by Strict Mode.

React guarantees the stored identity while every dependency passes `Object.is`. Your code guarantees the list includes every value the function closes over that can change, except stable setters and `dispatch`. A stale `useCallback` is a missing dependency that lives longer than an inline function, because the inline function would at least have been replaced on the next render.

**Practical Implementation:**

```tsx
const onClick = useCallback(() => {
  save(docId).then(() => setSaved(true));
}, [docId]);
```

**Trade-offs and Alternatives:**

The inline handler is the default. `useCallback` is the tool when a child is wrapped in `memo` and would otherwise re-render on a new function prop, or when the function is a dependency and should not restart an effect every render. Passing `docId` into the child and letting the child call `save(docId)` avoids a closure in the parent entirely. A ref holding the latest `docId` is appropriate inside a subscription that must not restart, and it is a strange tool for a button click that can read `docId` from this render's handler. Aborting the previous `save` when `docId` changes is a product rule for an in-flight write. `useCallback` does not abort anything.

**Common Mistakes:**

Adding `useCallback` around every handler "for performance" while the child is not memoized and no effect lists the handler. Emptying the list to keep a `memo` child quiet, which preserves the wrong `docId`. Writing `useCallback(() => () => save(docId), [docId])` and passing that value to `onClick`, so the click calls a factory and returns a function instead of saving.

**Senior-Level Follow-up:**

The list is `[docId]`, and the handler does `setSaved(saved ? saved : true)` using the `saved` state binding with `saved` omitted from the list. After the first successful save, a second click happens. What does the handler see, and what should it call instead?

It sees `saved === false` from the render that created this function, as long as `docId` did not change and the function was not recreated. The second click still calls `setSaved(true)`, so this particular assignment happens to land on the right boolean. Any branch that depended on `saved` being `true` after the first click is wrong. Include `saved` in the list, or use `setSaved(true)` which does not read it, or use a functional update when the next value depends on the previous one. Do not omit a dependency because the first click still looked fine.

### REACT-066 — The memoized child still sees a new callback

**Difficulty:** Advanced

**Category:** Memoization

**Question:**

`List` receives the same `ids` array reference from its parent and then sets `selected`. Which `Row` renders run? What changes if the parent of `List` passes a freshly allocated `ids` array with the same strings? What changes if `useCallback` is removed?

```tsx
const Row = memo(function Row({
  id,
  onSelect,
}: {
  id: string;
  onSelect: (id: string) => void;
}) {
  return <button onClick={() => onSelect(id)}>{id}</button>;
});

function List({ ids }: { ids: string[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const onSelect = useCallback((id: string) => {
    setSelected(id);
  }, [ids]);

  return (
    <ul>
      {ids.map((id) => (
        <Row key={id} id={id} onSelect={onSelect} />
      ))}
    </ul>
  );
}
```

**Context and Constraints:**

React 18. `memo` is `React.memo`. `ids` in the first scenario is the same array reference across the selection update. `Row` does not read `selected`. No custom `memo` comparator.

**Senior Engineer's Answer:**

`setSelected` re-renders `List`. `ids` is the same reference, so `useCallback` returns the same function even though `ids` is in the list. Each `Row` receives the same `id` string and the same `onSelect`. `memo` skips `Row`. The selection update does not walk the row buttons. `ids` in the dependency list did not help this callback. The function never reads `ids`. `setSelected` is stable. The honest list is `[]`.

A parent that allocates a new `ids` array every render passes a new reference into `List`. `List` runs, `useCallback` sees a new `ids` dependency, and it returns a new `onSelect` even though the strings did not change and the function does not use them. `memo` then fails every row because `onSelect` failed `Object.is`. The extra dependency defeated the memoization. An unnecessary dependency is an identity bug. A missing dependency is a stale-closure bug. This callback has the first kind.

Remove `useCallback` and `List` creates a new `onSelect` on every `List` render, including the selection update with a stable `ids`. Every `Row` renders. `memo` never gets equal props. `useCallback` without `memo` on `Row` also does nothing for this tree: `List` rendered `Row` as a normal child, so `Row` runs. The pair is what skips the work. `useCallback` alone does not skip children.

React guarantees `memo`'s shallow `Object.is` compare on props, and `useCallback`'s `Object.is` compare on its dependency list. Your code guarantees the callback's list matches the values it closes over, and that the list does not contain a fresh object whose only effect is to mint a new function. `selected` is not a prop of `Row` here. Rows do not show the selection. If they did, that prop would be a reason for the selected row to render, which is a product requirement rather than a broken `memo`.

**Practical Implementation:**

```tsx
const onSelect = useCallback((id: string) => {
  setSelected(id);
}, []);
```

**Trade-offs and Alternatives:**

An inline function is the right trade when `Row` is cheap or not memoized. `useCallback` plus `memo` is the right trade when a profile shows the row list re-rendering on unrelated `List` state. Lifting `selected` out of `List` so the list does not re-render at all is better when the rows are expensive and the selection indicator lives in a sibling. That split removes the render instead of skipping it. A custom comparator on `memo` that ignores `onSelect` would keep a stale handler. Do not compare around a callback you actually need to replace.

**Common Mistakes:**

Listing every prop of `List` in the callback's dependencies "to be safe." Wrapping `Row` in `memo` and allocating `ids.map((id) => ({ id }))` so each row's data prop is new. Expecting `useCallback` to skip `List` itself. `List` ran because its state changed. Nothing about the callback changes that.

**Senior-Level Follow-up:**

The callback becomes `setSelected((curr) => (curr === id ? null : id))` and the list stays `[]`. A row is clicked twice. What does `selected` become, and why was a dependency not required?

The first click sets `id`. The second sets `null`. The functional updater reads the pending or committed selection, so the callback does not close over `selected` and does not need it in the list. `setSelected` is stable. `[]` is honest. The broken version reads the binding: `setSelected(selected === id ? null : id)` with `[]` keeps seeing `selected === null` and sets `id` forever. That one needs `[selected]`, which also mints a new callback every selection change and re-renders every `Row`. The functional form keeps both the toggle and the stable identity.

### REACT-067 — useContext reads the nearest value by identity

**Difficulty:** Intermediate

**Category:** Context

**Question:**

`ThemeContext` is created with `createContext("light")`. A provider above `Title` passes `value={theme}` where `theme` is the string state `"dark"`. `Title` calls `useContext(ThemeContext)`. What does it return, when does `Title` re-render, and what does React 18 not provide if `Title` only needs `theme` from a value object `{ theme, user }`?

**Context and Constraints:**

React 18. One provider. `Title` is a function component. `memo` is not on `Title` unless a sentence includes it. No selector library.

**Senior Engineer's Answer:**

`useContext` returns the value of the nearest provider above this component during this render. Here that is `"dark"`. The default `"light"` is used only when no provider is above the consumer. A provider whose `value` is `undefined` is still a provider and wins over the default. `Title` subscribes to that context. After a provider update, React re-renders the consumer when the next value fails `Object.is` against the previous value. A string compares by its contents, so `setTheme("dark")` when the state is already `"dark"` does not wake `Title` through context.

React 18's `useContext` takes the context object and returns the whole value. It does not take a selector. If the provider value is `{ theme, user }` and that object is a new reference, `Title` re-renders even when it reads only `theme` and `theme` did not change. `memo` on `Title` does not filter the context value. `memo` compares props. A context change still re-renders the consumer. `memo` can skip `Title` when the parent re-rendered, the props are equal, and the context value is `Object.is` equal. Those are two different updates.

A parent re-render that creates `<Title />` in its own return runs `Title` because the parent ran, even when the context string did not change. That cost is the parent render. It is not a context subscription. Context did not "re-render the tree." The provider update re-renders the consumers whose value changed, and it re-renders whatever that provider's own function renders as children.

React guarantees the nearest-provider read and the `Object.is` subscription. Your code guarantees a stable value reference when the data the consumers care about did not change, or a split so a consumer does not subscribe to fields it ignores. There is no per-field subscription in core React 18.

**Practical Implementation:**

```tsx
const theme = useContext(ThemeContext);
```

**Trade-offs and Alternatives:**

Pass `theme` as a prop when the reader is a direct child and the value is not needed deeper. Context wins when many distant readers need the same value and threading it through every layer is the cost you are removing. An object value plus `useMemo` wins when the fields change together and you can name a complete dependency list. Splitting `theme` and `user` into two providers wins when their update rates differ. That split is the next design choice, not a different `useContext` API. A store with selectors, subscribed through `useSyncExternalStore`, is the React 18 path when many components each need a different slice of a frequently changing value. `useContext` will not grow a selector argument in this version.

**Common Mistakes:**

Expecting `useContext(ThemeContext, (v) => v.theme)` to compile and slice the update. That call is not the React 18 API. Wrapping the consumer in `memo` to ignore a new object value. Reading the default and assuming a provider higher up is missing, when the provider passed `undefined` or passed a different context object created by a second `createContext` call.

**Senior-Level Follow-up:**

`Title` is under `memo`, receives stable props, and calls `useContext(ThemeContext)`. The provider re-renders and passes the same string `"dark"`. Does `Title`'s function run? What if the provider passes `value={{ theme: "dark" }}` allocated in the provider's render?

The same string does not notify `Title`. If the parent of `Title` also did not render it, `Title` does not run. A new object fails `Object.is` every provider render, so `Title` runs even though `theme` is still `"dark"`. Memoizing the object on `theme`, or passing the string, is what makes the subscription match the data.

### REACT-068 — Values that change at different rates need different providers

**Difficulty:** Senior

**Category:** Context

**Question:**

One provider value is `{ theme, cursor }`. `theme` changes when the user picks a theme. `cursor` changes on every pointer move. `ThemeLabel` reads `theme`. `CursorDot` reads `cursor`. Both call `useContext` on that one context. What re-renders on a pointer move, and how do you structure the providers so a theme label does not?

**Context and Constraints:**

React 18. Both consumers are under the provider. The provider component holds both pieces of state. The heavy page is passed as `children` from a parent that does not hold `cursor`. No selector library.

**Senior Engineer's Answer:**

One context has one value identity. A pointer move that sets `cursor` produces a new object, `Object.is` fails, and every consumer runs, including `ThemeLabel`, which does not read `cursor`. Splitting into `ThemeContext` and `CursorContext` gives each consumer a subscription that matches what it reads. `ThemeLabel` calls `useContext(ThemeContext)` and does not run for a cursor update when the theme value is `Object.is` equal. `CursorDot` runs. A component that needs both calls both hooks. Two cheap subscriptions beat one subscription that wakes the page.

Hold both pieces of state in a component that renders the two providers, and pass the heavy tree as `children` from above that component. A cursor update re-renders the owner. It does not re-render the parent that created `children`, so the heavy element reference stays the same and the non-consuming page does not run. Consumers of `CursorContext` still run. If the owner instead returns `<Page />` itself, the owner render creates a new `Page` element and `Page` runs because its parent ran. The split context does not fix a heavy child the owner renders directly. `memo` on that child can, when its props are stable.

Each value still needs a stable identity. A string theme is stable without `useMemo`. An object such as `{ mode, contrast }` needs `useMemo` with those fields, or a pointer move in a different context is fine and an unrelated theme-provider render is not. Do not split every field into a provider by reflex. Split when the update frequency or the set of readers differs. Two values that always change together can share a context and one memoized object.

React guarantees per-context `Object.is` subscriptions and nothing more. Your code guarantees the provider boundaries and the value identities. A new object around an unchanged theme is still an update of that context.

**Practical Implementation:**

```tsx
function Preferences({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState("light");
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  return (
    <ThemeContext.Provider value={theme}>
      <CursorContext.Provider value={cursor}>{children}</CursorContext.Provider>
    </ThemeContext.Provider>
  );
}
```

**Trade-offs and Alternatives:**

Two contexts are the React-18-core solution and are easy to trace in DevTools. They get awkward when dozens of slices each need a provider. At that point an external store plus `useSyncExternalStore` lets a component subscribe to the slice it returns from `getSnapshot`, and a cursor move does not re-render a theme reader that returns the same snapshot reference. The store is more machinery. Context remains the right tool for theme, locale, and a current user that changes rarely. Colocating `cursor` in `CursorDot` and not putting it in context at all wins when nothing else reads it. Context is not required for every piece of state.

**Common Mistakes:**

Splitting providers and still writing `value={{ theme }}` so theme consumers re-render on every owner render. Leaving both states in one object and memoizing the consumers. The consumers subscribe to the object. Memoizing `CursorDot` does not stop a changed context value. Putting the pointer listener in the same component that renders `<Page />` inline, so the page runs on every move regardless of context.

**Senior-Level Follow-up:**

`dispatch` from a reducer is passed in the same context object as `state`, and `state` changes on every keystroke. A memoized toolbar only needs `dispatch`. Does it re-render, and what split fixes it?

It re-renders. The context value is one object, and `state` changed its identity. Put the stable `dispatch` in a separate context whose value does not change, or pass `dispatch` as a prop from a parent that does not re-render. Keep `state` in the context that the editor reads. The toolbar then subscribes only to `dispatch` and stays quiet on keystrokes. One memoized `{ state, dispatch }` cannot express two rates.

### REACT-069 — Each custom hook call has its own state

**Difficulty:** Intermediate

**Category:** Custom hooks

**Question:**

What happens to `b` when the user toggles `a`? Why does writing `useToggle` twice not share one boolean? What breaks if `Panel` calls `useToggle` only when `enabled` is true?

```tsx
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((value) => !value), []);
  return { on, toggle };
}

function Panel() {
  const a = useToggle();
  const b = useToggle(true);
  return (
    <button onClick={a.toggle}>
      {String(a.on)}:{String(b.on)}
    </button>
  );
}
```

**Context and Constraints:**

React 18 function component. `Panel` stays mounted. `enabled` is a prop in the follow-on part of the question. Both calls run unconditionally in the code shown.

**Senior Engineer's Answer:**

`a.toggle` flips `a.on` and leaves `b.on` at `true`. Each call to `useToggle` runs its own `useState` and its own `useCallback`. Those calls occupy slots in `Panel`'s hook list in order: `a`'s state, `a`'s callback, `b`'s state, `b`'s callback. The function name `useToggle` is not a key in a shared registry. Two components that both call `useToggle` also get separate slots, because each mounted component has its own list. A custom hook shares logic. It does not share state.

The `use` prefix is the convention the linter uses to find hook calls. React's runtime does not look up the function by name. If you rename it to `toggleState` and still call `useState` inside, the slots behave the same and the linter stops checking the call sites. Call it `useToggle` so conditional calls are reported.

`if (enabled) { useToggle(); }` changes the number and position of slots when `enabled` flips. That is the same rules-of-hooks failure as a conditional `useState`, including every hook after the custom hook in `Panel`. Call `useToggle` unconditionally. If the toggle should not exist while the panel is hidden, render a child that calls `useToggle` and unmount that child. Unmounting drops that child's slots on purpose.

React guarantees per-call slots matched by order, and that `initial` is used only when that slot is created. `useToggle(true)` does not push `b` back to `true` on a later render. Your code guarantees the same sequence of custom-hook calls every render. Sharing `a` and `b` requires the `useState` to live above both readers: one call in a parent, or one context, or one external store.

**Practical Implementation:**

```tsx
function Panel({ enabled }: { enabled: boolean }) {
  return enabled ? <Toggleable /> : null;
}

function Toggleable() {
  const a = useToggle();
  return <button onClick={a.toggle}>{String(a.on)}</button>;
}
```

**Trade-offs and Alternatives:**

Two hook calls are the right model for two independent switches. One call whose state is an object `{ a, b }` is the right model when one event updates both. Lifting `useToggle` into a parent and passing `{ on, toggle }` down is the right model when two children must show the same boolean. Context is the same lift when the children are far apart. A module-level `let on = false` shares a value and also shares it across every mounted `Panel` and every test in the process, and it does not re-render anyone. That is a store only if you subscribe. It is a bug if you expected React state.

**Common Mistakes:**

Expecting `useToggle(true)` to keep `b` synchronized with the argument. Calling the hook in a loop whose length changes. Destructuring and thinking `const a = useToggle()` created a named instance React will reuse if you swap the two lines. Swapping the lines swaps the slots. `a` would show the state `b` had.

**Senior-Level Follow-up:**

`useToggle` is changed to accept `key: string` and store `on` in a module-level `Map` under that key, still calling `useState` for the first value only. Two `Panel`s call `useToggle("power")`. Do they share, and what fails?

They share the `Map` entry only if your code writes the `Map` and also forces both components to re-render. `useState` inside each call remains two slots. Updating the `Map` from one click does not render the other `Panel`. A context or a store subscription is what notifies both. The string key is your protocol, not a React hook feature. Tests that forget to clear the `Map` share state with the next test. Prefer a parent or a context unless the owner really is process-wide.

### REACT-070 — The hook's effect belongs to the caller

**Difficulty:** Senior

**Category:** Custom hooks

**Question:**

`useDocumentTitle(title)` sets `document.title` and restores the previous title in cleanup. Two mounted components call it with different titles. Who wins, and what does the custom hook guarantee that a shared helper without hooks would not? What belongs in the dependency list?

**Context and Constraints:**

React 18, client only. `title` is a string prop on each component. Both components stay mounted. Child effects run before parent effects.

**Senior Engineer's Answer:**

Each call gets its own effect slot in the component that called the hook. When that component's `title` changes, that call's effect cleans up and writes the new title. The other component's effect does not re-run. `document.title` itself is one browser slot. Both effects write it. In a parent and child, the child effect runs first and the parent effect runs last, so the tab shows the parent title after mount. A later sibling's effect runs after an earlier sibling's and wins the same way. On unmount, the child's cleanup restores the title it saved at setup, which can overwrite the parent title that was set afterward. The hook did not install a stack. You did not write one.

What the hook guarantees, and a plain `setTitle(title)` helper does not, is the slot machinery: each caller gets a subscription tied to its render, re-run when its dependencies change, and cleanup on unmount and before the next run. The `use` prefix lets the linter check that callers do not branch around the call. The helper has none of that. It also does not pretend to coordinate a global with other callers. The hook should not pretend either. Document that one owner should set the document title, or implement an explicit stack if nested owners are the product.

The dependency list includes `title`. Omitting it leaves the first title in place after the prop changes. The effect closes over the `title` from the render that created it, the same rule as an effect written inline. Cleanup should restore the previous `document.title` captured at setup if the product wants "put back what was there," and that captured string is from setup time, not a live read during cleanup of some other owner's later write. If two owners are supported, the shared stack is the source of truth and each cleanup pops its own entry. That stack is your code.

React guarantees per-call effect slots, declaration and tree order, and that cleanup runs before the next setup and on unmount. Your code guarantees that the external resource has an owner. Strict Mode in development will set, restore, and set again on mount, so a title hook that leaks a listener in cleanup will leak in development immediately.

**Practical Implementation:**

```tsx
function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
```

**Trade-offs and Alternatives:**

One call at the top of the page is the simple owner and matches the browser, which has one title. A stack is justified for nested routes that each want a title and must restore the outer one on exit. The stack is a module or a tiny store, and the hook pushes and pops. It is more behavior and more tests. Putting the effect in each page component without a hook duplicates the cleanup and drifts. The hook is the right extraction once two pages would have copied it. It is the wrong extraction if it hides a subscription the caller needed to see in review. Keep the hook's name and file specific. `useDocumentTitle` tells the reader there is an effect. A hook named `useUser` that also subscribes, writes the title, and fetches is three owners in one call.

**Common Mistakes:**

Expecting the two calls to share one "current title" state because they share a function. Forgetting `title` in the list. Restoring a hardcoded `"App"` in cleanup and wiping a title set by a part of the page that does not use the hook. Starting a fetch inside the title hook because the hook already has an effect. Fetch in the hook whose job is the fetch, with its own abort cleanup.

**Senior-Level Follow-up:**

The hook also takes `onChange: (title: string) => void` and calls it after setting the title. The parent passes an inline function. What dependency decision keeps the title effect from fighting the callback identity?

Do not list the inline function as a reason to re-run the title write. Write the title in an effect that depends on `[title]`. Hold `onChange` in a ref updated every commit, and call `onChangeRef.current(title)` from that effect if the parent must hear about the committed title. Listing `onChange` re-runs the effect and rewrites `document.title` on every parent render. If the callback is the only subscriber and there is no DOM title, the hook is an event, and the parent should call it from the place that already knows the title changed.

### REACT-071 — Derived data is computed during render

**Difficulty:** Intermediate

**Category:** Derived state

**Question:**

What does the user see between commits, and why is the effect the wrong place for `visible`? Where would `useMemo` belong?

```tsx
function List({ items, query }: { items: Item[]; query: string }) {
  const [visible, setVisible] = useState(items);

  useEffect(() => {
    setVisible(items.filter((item) => item.name.includes(query)));
  }, [items, query]);

  return (
    <ul>
      {visible.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

**Context and Constraints:**

React 18. `items` and `query` are props. `Item` is `{ id: string; name: string }`. The filter is synchronous and pure. The first render has a non-empty `items` and a `query` that does not match every name.

**Senior Engineer's Answer:**

The first render describes `visible` as the initial `items` argument, which is the unfiltered list. Commit can paint that list. The effect runs after the paint opportunity and sets the filtered array. The user can see one frame of rows that do not match `query`, then a second render. Every later `query` change repeats the pattern: the render that received the new query still holds the previous `visible` until the effect replaces it. `items.filter` needed no external system. It is a pure function of the props this render already has.

Compute it during render: `const visible = items.filter((item) => item.name.includes(query))`. The committed tree matches the query. There is no second state slot to drift from `items`. `useState` plus an effect is a cache you maintain by hand, one commit late.

`useMemo` belongs around that expression only after a profile shows the filter is expensive, or when `visible`'s identity is a dependency or a `memo` child's prop. The memoized function stays pure and lists `[items, query]`. A cheap list does not need the cache. `useMemo` still runs during render, so it does not flash the unfiltered list. An effect never becomes the right tool just because the array is large.

React guarantees render can read props and state and return UI, and that an effect runs after the paint opportunity of the render that scheduled it. Your code guarantees a value fully determined by props and state is computed in that render. The effect remains appropriate when `visible` is the result of a subscription or a request that cannot run during render.

**Practical Implementation:**

```tsx
function List({ items, query }: { items: Item[]; query: string }) {
  const visible = items.filter((item) => item.name.includes(query));
  return (
    <ul>
      {visible.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

**Trade-offs and Alternatives:**

Inline filter is the default. `useMemo` is the opt-in cache. Passing `query` into a memoized row and letting the row decide its own visibility avoids a parent array when the list is virtualized by someone else. A server-side filter that returns a new `items` prop means the client should not filter again. Store the user's `query` in state and the server's `items` as the prop or the cache, and do not also store `visible`. If the filter must be debounced, debounce the `query` string in the input handler and still derive `visible` from the debounced string during render. The debounce is state. The rows are not.

**Common Mistakes:**

Copying props into state so the component "has its own data." Resetting `visible` with a second effect when `items` changes, and stacking two extra renders. Adding `useMemo` around `setVisible` thinking it skips the effect. Effects do not look at `useMemo` unless the memoized value is in the dependency list. The effect is the piece to remove.

**Senior-Level Follow-up:**

The product adds a "hide row" control that removes one id without changing `items` or `query`. What is state, and what stays derived?

The hidden ids are state, because the user did something the props do not describe. `visible` stays a calculation: filter by `query`, then exclude hidden ids. A `Set` in `useState`, updated with a functional updater that copies the set, is enough. Do not store the filtered array and then try to patch it in both the effect and the click handler. Those two writers will disagree the next time `query` changes.

### REACT-072 — Reset the draft when the entity changes, without an effect

**Difficulty:** Advanced

**Category:** Derived state

**Question:**

`Form` is used for many users. It keeps a draft the user can edit. A parent re-render passes a new `email` for the same `userId`, and later passes a new `userId`. What goes wrong with the effect below? Which resets are honest: a controlled parent, a `key`, or adjusting state during render?

```tsx
function Form({ userId, email }: { userId: string; email: string }) {
  const [draft, setDraft] = useState(email);

  useEffect(() => {
    setDraft(email);
  }, [email]);

  return <input value={draft} onChange={(e) => setDraft(e.target.value)} />;
}
```

**Context and Constraints:**

React 18. `Form` stays mounted in the buggy version. `email` is a string. The user can type between parent renders. The parent sometimes refetches the same user and passes the same `email` string, and sometimes navigates to another `userId`.

**Senior Engineer's Answer:**

`useState(email)` stores the email from the render that created the slot. Later props do not enter the slot. The effect is an attempt to copy them in after commit. When `email` changes, the render still shows the old draft, the browser may paint it, and then the effect sets the new email. A refetch that replaces `email` while the user has typed will overwrite the draft after that paint. The dependency is the email string, so a navigation that changes `userId` and happens to keep the same email string does not reset anything else this form might hold. The effect couples "server echo" and "user edit" into one slot with the server writing last, one frame late.

Pick the owner. If the parent must see every keystroke, the parent holds `draft` and the input is `value` plus `onChange`. There is no copy. If the form owns the draft and a new user must discard it, set `key={userId}` on `Form`. React mounts a new instance, the initializer reads that user's `email`, and effects and uncontrolled DOM reset with it. Same `userId` and a new email string do not remount, so a background refetch does not wipe the draft. That is usually what an editor wants.

If one field must reset when `userId` changes and the rest of a larger tree must stay mounted, adjust state during render. Store the previous `userId`. When the prop differs, call `setPrevUserId(userId)` and `setDraft(email)` before returning JSX. React restarts the render with the new state and does not paint the previous user's draft. The condition is required. An unguarded `setDraft` during render loops. Compare the id, not the email object identity, or a parent that allocates a new string wrapper every render will clear the draft every time. Strings compare by value with `Object.is`.

An effect that copies props into state is justified when the target is an external system: an imperative editor instance that has `setContent(email)` and is not React state. The draft the input shows is still React state or a controlled value. It does not need a second writer.

React guarantees the initializer runs when the slot is created, that `key` creates a new slot list, and that a conditional `setState` during render restarts this pass before paint. Your code guarantees one writer for the draft. The effect's extra commit is the symptom of two writers.

**Practical Implementation:**

```tsx
function Form({ userId, email }: { userId: string; email: string }) {
  const [draft, setDraft] = useState(email);
  const [prevUserId, setPrevUserId] = useState(userId);
  if (userId !== prevUserId) {
    setPrevUserId(userId);
    setDraft(email);
  }
  return <input value={draft} onChange={(e) => setDraft(e.target.value)} />;
}
```

**Trade-offs and Alternatives:**

`key={userId}` is the better default when the whole form, its effects, and its DOM should reset. It is one line and it is hard to forget a field. The during-render adjustment is the better default when only the draft resets and sibling state above this component must survive. A controlled parent is the better default when submit validation lives in the parent. The effect version loses on all three because it paints the stale draft and treats every new email string as "replace the user's work." Debouncing the parent's fetch does not fix the two-writer design.

**Common Mistakes:**

Depending on `[user]` where `user` is a new object every render, so the effect overwrites the draft on every parent render. Copying `email` into state and also filtering it into a derived label stored in a third slot. Using the during-render `setDraft(email)` without a previous-id check. Lifting the draft and forgetting the input's `onChange`, so the input is frozen on the initial email.

**Senior-Level Follow-up:**

`key={userId}` remounts the form, and the form's `useEffect` fetches the user's avatar. The parent already has the avatar on the user object. What work did the key repeat, and what should stay derived?

The remount re-runs the fetch and resets local state, including fields the user had not finished if the key changes. The avatar URL is on the prop. Render `<img src={avatarUrl} />` from the prop and do not fetch it again in the form. Keep the effect for data this form exclusively loads and that must reload for the new id. The key already remounts that effect. A parent-level cache, if one exists, should still dedupe the request so a remount does not hit the network when the avatar is fresh.

### REACT-073 — State sits at the lowest common owner

**Difficulty:** Staff-Level

**Category:** State architecture

**Question:**

A canvas and a word count both need the draft. A modal's open flag is used only by the modal and its button. A theme string is read by dozens of distant components and changes rarely. A pointer position is read by one decoration and changes on every move. Where does each value live, and what is the cost of putting all four in one context?

**Context and Constraints:**

React 18. One tree, one root. No data-fetching library. The page is large enough that re-rendering it on every pointer move is visible in a profile. You may use context. You are not required to add a store.

**Senior Engineer's Answer:**

The draft lives in the closest parent of the canvas and the word count, and those children receive it as a prop. That parent is the lowest owner that can see both readers. Lifting it to the page, or to a context the page provides, re-renders every consumer of that context on every keystroke, including components that do not read the draft. Colocation is the default because a keystroke's render stays in the subtree that displays the draft.

The modal flag lives next to the button that opens it, either in that parent or inside a small widget that owns both the button and the modal. Nothing else reads it, so context only adds a provider and a subscription. If a keyboard shortcut far away must open the same modal, then the flag lifts to the common parent of the shortcut and the modal, or a small context whose only consumers are those two. Lift when a second reader appears, not before.

The theme string is a context. The readers are distant, the value changes rarely, and a string identity is stable under `Object.is`. The provider sits high enough to cover the readers and passes the heavy page as `children` so a theme change re-renders consumers rather than the whole page's parent. The pointer position stays in the decoration. If it were in the theme context, every theme consumer would re-render on pointer moves. If it were in its own context, only its consumer would run, which is acceptable and still more machinery than local state for a single reader.

One context object holding draft, modal, theme, and pointer makes every reader subscribe to every write. A pointer move re-renders the word count, the modal, and every themed component. Splitting by rate fixes the subscription. It does not fix an owner component that renders the heavy page inline. State architecture in React 18 is which component holds the slot, which value identity crosses a provider, and which children are passed in from above so they are not recreated by the writer.

React guarantees local slots, context identity subscriptions, and that a parent render runs the children it returns unless `memo` skips them. Your code guarantees one owner per fact and a value identity that matches the rate of the readers. `useCallback` and `useMemo` are how you keep props and context values stable after you have placed the state correctly. They do not replace placement.

**Practical Implementation:**

```tsx
function Editor() {
  const [draft, setDraft] = useState("");
  return (
    <>
      <Canvas draft={draft} onDraft={setDraft} />
      <WordCount draft={draft} />
    </>
  );
}
```

**Trade-offs and Alternatives:**

Props get noisy when ten layers forward the same draft and none of them use it. That is the moment for context, not the moment for a global store. A store subscribed with `useSyncExternalStore` is justified when many components need different slices of a value that changes often, because context cannot select. The store is a second ownership system: you have to define the snapshot, the subscription, and the update. Use it when context's fan-out shows up in a profile, not as the first place a boolean goes. A reducer in the editor parent is justified when canvas events and word-count actions are one protocol. It does not need to be global to be a reducer.

**Common Mistakes:**

Creating `AppStateContext` on the first shared boolean. Storing the draft in both the editor and a context "for convenience," so saves read one and the canvas reads the other. Memoizing every themed component to survive pointer updates instead of taking the pointer out of the theme value. Passing inline `onDraft={() => setDraft(...)}` into a memoized canvas and undoing the placement work.

**Senior-Level Follow-up:**

The word count is slow to render and the canvas is cheap. Both still need the draft. Where do you cut the render without duplicating the draft?

Keep one `draft` in the parent. Memoize `WordCount` on `draft` so it runs when the string changes and not when the parent renders for an unrelated reason such as a selection flag. If the parent renders only because of the draft, `memo` does not help the word count: the string changed and it must run. Then the cut is internal: the word count memoizes its expensive measurement with `useMemo` on `draft`, or you isolate a cheap `draft` display from a slow preview that receives a debounced string. The draft slot stays singular. The derived preview can lag on purpose because the product asked for a debounce, and that debounced string is a second state with a defined relationship, not a second copy of the source of truth.

### REACT-074 — A fetched user and a draft are different facts

**Difficulty:** Staff-Level

**Category:** State architecture

**Question:**

The detail screen fetches `/users/:id` into `useState`. The list screen fetches the same user into a different `useState` and shows the old name after the detail screen saves. The detail screen also copies `user.email` into a draft with an effect. What owns the server fact, what owns the draft, and why is one context of the whole response a weak fix?

**Context and Constraints:**

React 18. Two mounted screens can show the same user id. Saving is a PUT from the detail screen. You may introduce one module-level cache. You are not choosing a vendor library. `useSyncExternalStore` is available. No invented latency numbers.

**Senior Engineer's Answer:**

The server user is one fact. Two `useState` slots are two facts that happen to have been filled from the same URL. React will not reconcile them. A PUT that `setUser`s on the detail screen does not touch the list screen's slot. The list keeps the previous object until its own fetch happens to run. The owner of the fetched user should be one cache keyed by id. Both screens read that snapshot. A successful PUT writes the cache once, and every subscriber renders with the new snapshot. A module-level cache plus `useSyncExternalStore` is the React 18 primitive for that subscription. `getSnapshot` must return the same reference until the cache actually replaces that user's record. A snapshot allocated inside `getSnapshot` on every call looks like a store that changed during render, and React will keep rendering.

The draft is a different fact. It is the user's unsaved edit. It lives in the editor, initialized from the snapshot when the editor mounts for that id (`key={userId}` or the during-render reset). A background refetch that replaces the snapshot must not write the draft unless the product rule says the server wins. That rule should be explicit, for example "reset the draft if it is still equal to the previous snapshot." An effect that always `setDraft(user.email)` makes the server the writer of the input on every fetch, one paint late, which is the bug from the derived-state question. The save handler reads the draft, sends the PUT, and on success replaces the cache entry. On failure the draft stays so the user can retry. The cache stays on the last good snapshot.

A context whose value is the whole user object fixes the duplicate only for components under that provider, and only if there is exactly one provider. It re-renders every consumer on every field change. The list and the detail often mount under different routes and can both be alive. A provider high enough to cover both re-renders every consumer when any user in the cache changes, unless the value is split or the screens subscribe to a store by id. Context is a reasonable owner for "the current user id" if that string changes rarely. It is a weak owner for the cache of every user the list has fetched.

React guarantees that two hook slots are independent and that `useSyncExternalStore` will re-render when the subscription fires and `getSnapshot` returns a new reference. Your code guarantees one cache entry per user id, a pure `getSnapshot`, and a draft slot whose reset rule you can say out loud. Two roots on the page do not share React state, and they do share this module if both import it. That shared module is the point of the cache. Each root subscribes on its own.

**Practical Implementation:**

```tsx
type User = { id: string; email: string };
let users = new Map<string, User>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot(): Map<string, User> {
  return users;
}
function writeUser(user: User) {
  const next = new Map(users);
  next.set(user.id, user);
  users = next;
  listeners.forEach((listener) => listener());
}
// useSyncExternalStore(subscribe, getSnapshot)
```

**Trade-offs and Alternatives:**

The module cache is small and has sharp edges: tests must reset `users`, and a snapshot that is the `Map` itself notifies every subscriber on any `writeUser`. A per-id snapshot, where `getSnapshot(id)` returns the same `User` reference until that id is written, lets a list row subscribe to one user. That is more code and a better fan-out. A context of `Map` is fewer concepts and a worse fan-out. Keeping the duplicate `useState` is acceptable only when the two screens cannot be mounted together and a stale list after navigation is defined as fine. The moment both are visible, the duplicate is a defect. A vendor cache is the same architecture with deletions, retries, and mutation queues already written. Adopting one does not change the split between snapshot and draft.

**Common Mistakes:**

Writing the PUT response into the detail `useState` and assuming the list will "pick it up from React." Storing the draft in the cache on each keystroke so the list shows half-typed names. Returning `{ ...user }` from `getSnapshot` every time, which loops. Resetting the module cache on every route change and calling the resulting refetch storm a React effect bug.

**Senior-Level Follow-up:**

The PUT succeeds and the response body is missing `displayName`, which the cache previously had. What do you store, and what does the list show if you store the body as the whole record?

The list shows a user with no `displayName` if you replace the record with the partial body. The response is the server's representation only if the contract says it is the full user. If the contract is "the saved email," merge that field into the previous cache record and keep `displayName`. If the contract is the full user, the missing field is a server bug and the UI should show the absence rather than invent a name. The merge belongs in `writeUser`, in one place, not in each screen's `setState`.

### REACT-075 — The handler ref was frozen on mount

**Difficulty:** Advanced

**Category:** Effects

**Question:**

The parent re-renders and passes a new `handler` that closes over the latest draft. `type` stays `"resize"`. A resize then happens. Which handler runs, and what is the smallest change that both keeps the listener attached and calls the latest handler?

```tsx
function useWindowEvent(type: string, handler: (event: Event) => void) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, []);

  useEffect(() => {
    function listener(event: Event) {
      handlerRef.current(event);
    }
    window.addEventListener(type, listener);
    return () => window.removeEventListener(type, listener);
  }, [type]);
}
```

**Context and Constraints:**

React 18 client component. `type` is a string and does not change in this scenario. The parent passes an inline `handler`. The listener is attached after mount. Development Strict Mode is mentioned only for how many times the listener is added.

**Senior Engineer's Answer:**

The first effect writes `handler` into the ref after the mount commit and never again, because its list is `[]`. Later renders have a new `handler` and a new draft in that closure. The ref still points at the mount-time function. The second effect does not re-run, because `type` is unchanged, so the listener stays attached, which is the part that is right. The resize calls the mount-time handler. The draft it closes over is the mount-time draft. This is the stale-closure bug with an extra indirection. The ref is only as fresh as the last assignment.

Delete the dependency list on the assignment effect so it runs after every commit, and keep it declared above the subscription. After each committed render, `handlerRef.current` becomes that render's `handler`. The subscription still depends only on `[type]`, so a new inline handler does not remove and add the listener. The assignment effect has no cleanup. Strict Mode on mount will run it, clean it up, and run it again, which is a harmless extra write, and will add, remove, and add the listener. Production adds the listener once per `type`.

The assignment effect is passive, so it runs after the paint opportunity. A `resize` that arrives after commit and before that effect still sees the previous handler. Assigning `handlerRef.current = handler` during render closes that gap and also runs on a render that React discards. `useLayoutEffect` with no list writes the ref before paint and only for a committed render. Use the layout effect or the render assignment when the external source can call between commit and passive effects. For `window` `"resize"`, the passive assignment is usually soon enough, because the browser delivers the event after paint. For a socket that is already open, it may not be.

React guarantees effect order, `Object.is` on `[type]`, the stable ref object, and the Strict Mode mount cycle in development. Your code guarantees the ref is updated whenever `handler` should be the one that runs, and that the subscription list contains `type` and not `handler`. A parent `useCallback` with a missing draft dependency still hands you a stale function. The ref will faithfully store that stale function.

**Practical Implementation:**

```tsx
function useWindowEvent(type: string, handler: (event: Event) => void) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    function listener(event: Event) {
      handlerRef.current(event);
    }
    window.addEventListener(type, listener);
    return () => window.removeEventListener(type, listener);
  }, [type]);
}
```

**Trade-offs and Alternatives:**

Listing `handler` on the subscription effect is fresh and rebinds the DOM listener every parent render. That is simpler and correct when the parent passes a stable callback and wasteful or racy when the handler is inline. The ref split is the React 18 pattern for "this value is an event, not a reason to resubscribe." React 19's `useEffectEvent` names that pattern as an API. It is not a stable hook in React 18, so this codebase should not import it. Restarting the listener is still the right trade when `type` changes: the cleanup removes the old type and the setup adds the new one. Do not "fix" a type change by reading `type` from a ref and leaving `[]` on the subscription. The DOM registration itself depends on `type`.

**Common Mistakes:**

Adding `handler` to the second list and leaving the first effect on `[]`, so you pay for a rebind and still update the ref too late for the first event after mount. Reading `handlerRef.current` in the JSX. Omitting `type` because the ref pattern "handles props." Removing the removeEventListener cleanup, which Strict Mode will punish with duplicate listeners immediately in development and which a real `type` change will punish in production.

**Senior-Level Follow-up:**

The assignment effect stays correct, and the subscription list is `[type, handlerRef]`. Does the listener rebind every render? Does the linter want `handler` in that list?

`handlerRef` is the stable object from `useRef`, so `[type, handlerRef]` does not rebind when the parent renders. It rebinds when `type` changes. The linter does not want the `handler` binding in the subscription list if the effect never reads `handler` and only reads `handlerRef.current` inside the listener, which runs later. It will want `type`. Do not add `handler` to satisfy a reading of the rule that skips the ref. Do not list `handlerRef.current`. That value is whatever it was during render, and writing `current` does not re-run the effect, so the dependency would be stale by design.

### REACT-076 — One save action returns the status and the error together

**Difficulty:** Senior

**Category:** Reducers

**Question:**

`status` and `error` are two `useState` slots. `save` can resolve or reject. Which screens can this handler commit, and why does one `useReducer` transition remove the illegal pairs?

```tsx
async function onSave() {
  setStatus("saving");
  try {
    await save(draft);
    setStatus("saved");
  } catch (err) {
    setError(err instanceof Error ? err.message : "Save failed");
  }
}
```

**Context and Constraints:**

React 18, `createRoot`. `status` is `"idle" | "saving" | "saved" | "error"`. `error` is `string | null`, initially `null`. `draft` is a separate slot updated on each keystroke. `save` does not set state. No `flushSync`.

**Senior Engineer's Answer:**

`saveRequested` has to become a legal pair: status `"saving"` and error `null`. This handler sets status and leaves the previous error in its own slot. A failed save that is followed by a second attempt can paint `"saving"` next to the old message. The `catch` writes the message and never sets status, so a rejection leaves `"saving"` in place beside the new message. The `try` path sets `"saved"` and leaves whatever string was already in `error`. Each setter replaces its own slot. A batch commits them together and still commits whatever the other slot already held.

A reducer stores one object and returns the next object for one action. `saveRequested` returns `{ status: "saving", error: null }`. `saveSucceeded` returns `{ status: "saved", error: null }`. `saveFailed` returns `{ status: "error", error: message }`. There is no return value in which status is `"saving"` and `error` is still the previous string, unless you write that return on purpose. The handler awaits between dispatches. `saveRequested` can commit before the promise settles, and that screen is a real state the user should see. The promise result dispatches exactly one of the two outcomes. The illegal combinations are the ones no action returns.

The draft stays in `useState`. It changes on a different event from the save outcome. The handler reads the current draft and passes it to `save`. Putting the draft in the same reducer is justified when `saveRequested` must freeze the text that was sent, as a field on that action's resulting state, so later keystrokes do not rewrite the in-flight payload. The keystroke value and the frozen payload are different facts.

React applies the reducer's return value as the next slot and keeps `dispatch` stable. Your reducer returns a complete legal pair and does not mutate the previous state. In development, Strict Mode calls the reducer an extra time per dispatched action and keeps one result, so the reducer stays pure.

**Practical Implementation:**

```tsx
type State = {
  status: "idle" | "saving" | "saved" | "error";
  error: string | null;
};
type Action =
  | { type: "saveRequested" }
  | { type: "saveSucceeded" }
  | { type: "saveFailed"; message: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "saveRequested":
      return { status: "saving", error: null };
    case "saveSucceeded":
      return { status: "saved", error: null };
    case "saveFailed":
      return { status: "error", error: action.message };
  }
}
```

**Trade-offs and Alternatives:**

Two functional setters can write a legal pair when every path sets both slots. The reducer is the better fit once a new path is likely to touch only one of them, and when you want to test the transitions without rendering. Separate `useState` slots remain the better fit for the draft and the save pair, because a keystroke does not change the save outcome. Lifting this reducer above the editor is justified when a sibling reads `status`. A context of `{ state, dispatch }` is justified when those readers are far away. The context value still re-renders every consumer when `state` changes.

**Common Mistakes:**

Expecting the `catch` to imply `status === "error"` because the UI treats them as one idea. Clearing the error in an effect after `status` changes, one paint after the illegal pair was already committed. Folding `draft` into every save action so each keystroke goes through the save reducer.

**Senior-Level Follow-up:**

`saveSucceeded` is dispatched, and the user has typed since `save` was called. What should the reducer do with the draft?

Leave the keystroke draft alone. The action means the request finished, and the draft slot is the editor's current text. If the product needs the text that was sent, `saveRequested` copies that string into the save state at dispatch time. The success action does not read the draft from a later render and overwrite it.

### REACT-077 — The second dispatch is applied to the pending state

**Difficulty:** Senior

**Category:** Reducers

**Question:**

`items` starts as `[]`. The user activates `onAdd` once. What does the next commit contain, what does the reducer receive on the second call, and what is `state.items` inside `onAdd` after the first `dispatch` returns?

```tsx
function onAdd() {
  dispatch({ type: "added", item: "a" });
  dispatch({
    type: "added",
    item: state.items.length === 0 ? "first" : "later",
  });
}

function reducer(state: { items: string[] }, action: { type: "added"; item: string }) {
  switch (action.type) {
    case "added":
      return { items: [...state.items, action.item] };
  }
}
```

**Context and Constraints:**

React 18, `createRoot`. One `useReducer` slot. `onAdd` runs synchronously inside one click. No `await`, no `flushSync`. Production behavior for how many results commit. Mention Strict Mode only for the extra reducer call.

**Senior Engineer's Answer:**

Both dispatches join the same batch. React renders once. The committed items are `["a", "first"]`. The reducer runs for `"a"` with the current state `{ items: [] }` and returns `{ items: ["a"] }`. It runs for the second action with that pending result. The second action's `item` is already `"first"`, because `onAdd` computed it from the render's `state.items`, which is still `[]`. `dispatch` returns void. It does not assign the reducer's return value back into the handler's `state` binding.

The queue chains reducer results. The action objects do not. Anything the action should know about the pending list has to be decided inside the reducer, or passed as data the handler actually has. A single action `{ type: "addedPair", items: ["a", "b"] }` is the right shape when the click means one transition with both strings. Two dispatches are the right shape when two real events happen to be processed together and each event is complete on its own.

In development, Strict Mode invokes the reducer an extra time for each action and keeps one result. A pure reducer still commits `["a", "first"]`. A reducer that pushes into an outside array records the extra calls.

React guarantees queue order inside the batch and one commit for this synchronous handler. Your code treats the handler's `state` as this render's snapshot and treats the reducer argument as the pending snapshot.

**Practical Implementation:**

```tsx
function reducer(state: { items: string[] }, action: { type: "added"; item: string }) {
  switch (action.type) {
    case "added": {
      const item = state.items.length === 0 ? "first" : action.item;
      return { items: [...state.items, item] };
    }
  }
}
```

**Trade-offs and Alternatives:**

Computing `"first"` inside the reducer matches "the list was empty when this action was applied." Computing it in the handler matches "the list was empty on the screen when the user clicked," which is a different fact once an earlier dispatch in the same handler has already appended. Two `useState` slots would not give the second slot the first slot's pending value either. One reducer is how those fields share a queue. `flushSync` around the first dispatch would commit `["a"]` before the second action is built, so the handler could read the DOM for that commit, and the `state` binding in this handler would still be the old array.

**Common Mistakes:**

Logging `state.items` after `dispatch` and treating the log as the queue. Expecting the second action's ternary to see `"a"`. Splitting `items` and `count` into two setters and reading one closure to update the other.

**Senior-Level Follow-up:**

`onAdd` awaits `save()` between the two dispatches. What does the second reducer call receive?

The first dispatch is its own batch and can commit `["a"]` before `save` resolves. The dispatch after `await` is a later batch. Its reducer receives the state those earlier actions produced, including `"a"`, as long as nothing else changed the slot. The handler's `state` binding is still the render that created `onAdd`, so a payload built from `state.items` after the await is still that older array. Build the payload from the event, or decide it inside the reducer.

### REACT-078 — useId is stable for one mount and matches hydration

**Difficulty:** Intermediate

**Category:** Hooks

**Question:**

`EmailField` calls `useId` and sets both `htmlFor` and `id` from it. The field re-renders when the user types. A second `EmailField` is mounted beside it. The page is server-rendered and hydrated. What stays stable, what is unique, and why is `Math.random()` the wrong source for this id?

**Context and Constraints:**

React 18 client component, also rendered to HTML and hydrated with `hydrateRoot`. Each field stays mounted while its input changes. No list is involved. `identifierPrefix` is unset.

**Senior Engineer's Answer:**

`useId` returns a string for this hook slot on this mounted component. Re-rendering `EmailField` returns the same string, so the label's `htmlFor` and the input's `id` keep matching. The string is generated from the component's position in the tree, not from a global counter you increment and not from `Math.random()`. The server pass and the hydration pass walk the same tree, so they emit the same id and the hydrated label still points at the hydrated input. A random id is one value in the HTML and a different value on the client, which is a hydration mismatch, and it also breaks the label after hydration if you read it from the DOM before the client render.

A second `EmailField` occupies a different position, so it receives a different id. Two `useId` calls inside one component receive different ids because they are different slots. Unmounting the field and mounting it again can produce a different id. Typing does not. The id is allowed to contain colon characters. That is a valid HTML `id`. It is unique among `useId` values in this tree for this mount. It is not a database key, and it is not stable across visits.

React guarantees the match between server and client when the hook tree matches, and it guarantees the value is stable for the life of the slot. Your render calls `useId` unconditionally so the server and client allocate the same slots. In development, Strict Mode's extra render reuses this slot's id. A module-level `let n = 0` bumps again on that extra pass and can diverge from the HTML.

**Practical Implementation:**

```tsx
function EmailField() {
  const id = useId();
  const [email, setEmail] = useState("");
  return (
    <>
      <label htmlFor={id}>Email</label>
      <input id={id} value={email} onChange={(event) => setEmail(event.target.value)} />
    </>
  );
}
```

**Trade-offs and Alternatives:**

`useId` is the right source when the DOM needs an id and the component does not already have a stable one from data. An id that came from the email record is the right source when the field is "the input for user 42" and CSS or tests look up that known value. A hand-rolled counter is cheaper to read and wrong under hydration, Strict Mode, and a second copy of the component. Several related attributes can share one `useId` result with suffixes, which is the next decision when a single field grows a hint and an error.

**Common Mistakes:**

Generating the id in render with `Math.random` or `crypto.randomUUID` and watching hydration complain. Calling `useId` only when `showLabel` is true, so the server and client allocate different ids for every later hook. Storing the id in `useState` to "keep it," which is a second copy of a value the slot already keeps.

**Senior-Level Follow-up:**

The same page mounts two React roots. Both call `useId`. What can you pass so their ids do not collide?

Pass a distinct `identifierPrefix` in the options to each `createRoot`, and the same prefix to `hydrateRoot` for a root that hydrates server HTML. The prefix becomes part of the ids for that root. Two roots that omit it can generate the same id strings in one document. The server output for a hydrated root has to have been produced with the prefix the client passes, or the ids in the HTML and the ids from hydration differ.

### REACT-079 — useId is not a list key

**Difficulty:** Senior

**Category:** Hooks

**Question:**

A list of contacts has stable `contact.id` values. A teammate wants each row's React `key`, the checkbox `id`, and a `querySelector` lookup to come from `useId`. Which of those three is a valid use, and what fails for the other two?

**Context and Constraints:**

React 18. The contact list can grow, shrink, and reorder. `useId` may be called in the row component. It must not be called inside the parent's `contacts.map`. No third-party id library.

**Senior Engineer's Answer:**

The checkbox id is the valid use, and it belongs in the row. The row calls `useId` once at the top level and passes that string to the input and its label. Each mounted row has its own slot, so each checkbox gets its own id for as long as that row instance is mounted. That id labels the control. It does not identify the contact.

The React `key` has to be `contact.id`. The key is how React matches a row to a contact when the array reorders. `useId` is tied to the row instance's position in the hook tree, not to the contact. Using it as the key, or using the index, follows the wrong identity. The contact's id is already the stable name of the data.

`document.querySelector` with a raw `useId` string fails when the id contains a colon, because a colon starts a pseudo-class in a CSS selector. `document.getElementById(id)` takes the id as a literal and works. A selector needs `CSS.escape(id)` around the value. Prefer the ref you already have on the input when the code only needs the node. The id exists for the label and for attributes, not as a substitute for a ref.

Calling `useId` inside the parent's `map` is a hook inside a loop. The number of calls changes with the length of `contacts`, so slots no longer line up. One `useId` in the parent, reused for every row, gives every checkbox the same id. The row component is the place that has one call per mounted contact.

React guarantees per-slot ids and `Object.is` stability for a given mount. Your list keys come from the data. Your selectors either escape this id or avoid it.

**Practical Implementation:**

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

**Trade-offs and Alternatives:**

`contact.id` can also be the DOM id when it is unique in the document and safe to put in an attribute. That is better when tests and CSS already know the contact id. `useId` is better when the row can appear twice on one page, because two copies of contact `42` would otherwise duplicate a DOM id. Suffixes on one `useId` (`${labelId}-input`, `${labelId}-hint`) keep a single slot when one row has several related nodes. Extra `useId` calls also work. They add slots you do not need if the suffixes would do.

**Common Mistakes:**

`key={useId()}` inside the map. Stripping the colons to make a selector and then failing hydration because the client id no longer matches the HTML. Looking the input up with `querySelector("#" + id)` and concluding `useId` did not attach the node.

**Senior-Level Follow-up:**

The row also has an error message that `aria-describedby` must point at. Do you call `useId` a second time?

One call is enough. Pass `` `${labelId}-error` `` to the message and to `aria-describedby`. The suffix is your name for the node. The `useId` part is what makes the prefix unique in the tree and stable across hydration. A second `useId` is a separate slot with the same guarantees, and it is extra machinery for a node that only exists as part of this row.

### REACT-080 — useImperativeHandle assigns the handle before paint

**Difficulty:** Senior

**Category:** Refs

**Question:**

The parent holds `inputRef` from `useRef` and renders `<FancyInput ref={inputRef} />`. `FancyInput` is a function component. The parent wants `inputRef.current.focus()` from a button, and it wants a `getValue()` that sees the latest text. When is `inputRef.current` assigned, what is it during the parent's render, and which dependency list keeps `getValue` current?

**Context and Constraints:**

React 18. `FancyInput` is wrapped in `forwardRef`. The inner control is an `<input>`. No React 19 ref-as-prop behavior. The parent calls `focus` from a click handler, not during render.

**Senior Engineer's Answer:**

In React 18 a function component receives a `ref` only through `forwardRef`. `useImperativeHandle(ref, create, deps)` is a layout effect. After this commit's DOM updates, and before the browser paints, React calls `create` and assigns the returned object to `ref.current`. The matching cleanup assigns `null` before the next assignment. The parent's `useLayoutEffect` runs after the child's layout effects, so it can call `inputRef.current.focus()` and see the handle from this commit. The parent's render function runs before that assignment. On the first mount, `inputRef.current` is still `null` while the parent is rendering. A later parent render still sees the previous handle until this commit's layout phase replaces it. Read the handle in the click handler or in a layout effect.

The inner `<input ref={inputRef}>` is a host ref. React has attached that node by the time the imperative-handle effect runs, so `focus` can call `node.focus()`. You do not need `useImperativeHandle` if the parent should receive the DOM node itself: pass the forwarded ref straight to the input. The custom handle is for a smaller surface, `focus` and `getValue`, so the parent cannot start depending on the whole element.

`create` closes over the render that produced it. A dependency list of `[]` keeps one handle object and keeps `getValue` on the first `value`. Put `value` in the list and the handle is replaced before paint whenever the text changes. The click reads `inputRef.current` at click time, so it sees the replacement. A parent that copied `inputRef.current.getValue` into a variable during an earlier render keeps the old function. The other way to stay current is a ref updated every render with the latest `value`, read inside `getValue`, with `[]` as the dependency list so the handle identity stays put. Use that when something re-subscribes whenever the handle object changes. Use the `value` dependency when replacing the handle is acceptable.

Omitting the dependency argument recreates the handle on every commit. React also re-runs the effect when the `ref` identity changes. An inline `ref={(node) => ...}` from the parent is a new function every parent render, so React clears the previous callback with `null` and calls the next one with the handle on each commit. Pass the stable object from `useRef`.

React guarantees the layout-phase assignment and the cleanup to `null`. Your code keeps `create` pure aside from reading refs, and it does not read `inputRef.current` to choose what the parent returns from render.

**Practical Implementation:**

```tsx
type InputHandle = { focus(): void; getValue(): string };

const FancyInput = forwardRef<InputHandle, { value: string }>(
  function FancyInput({ value }, ref) {
    const nodeRef = useRef<HTMLInputElement>(null);
    const valueRef = useRef(value);
    valueRef.current = value;
    useImperativeHandle(ref, () => ({
      focus() {
        nodeRef.current?.focus();
      },
      getValue() {
        return valueRef.current;
      },
    }), []);
    return <input ref={nodeRef} value={value} readOnly />;
  },
);
```

**Trade-offs and Alternatives:**

A callback prop `onValue` or a controlled `value` already gives the parent the text, and it participates in render. Prefer that when the parent renders the text. The imperative handle is for a command the DOM understands: focus, scroll, select. Exposing the raw input is fewer lines and a wider API. A state update inside `create` is the wrong direction. Commands flow from parent to child through the handle. Data flows from child to parent through props and state.

**Common Mistakes:**

Calling `useImperativeHandle` in a function component that is not wrapped in `forwardRef`, so the parent ref never arrives. Calling `inputRef.current.focus()` during the parent's render on mount, when `current` is still `null`. Listing `[]` and returning `value` from a closure, then debugging a stale `getValue` as a DOM bug.

**Senior-Level Follow-up:**

The parent passes `ref={inputRef}` only some of the time, and otherwise passes `null`. What does the child do?

`forwardRef` receives `null`, and `useImperativeHandle` leaves it alone when `ref` is `null`. The child still renders the input. Methods on a handle are optional access for a parent that asked for them, which is why focus stays available on the node for the child's own effects. The parent that skipped the ref uses a prop or the child's own UI to focus.

### REACT-081 — The menu's open flag stays in the menu

**Difficulty:** Intermediate

**Category:** State architecture

**Question:**

`Page` holds `open` for a menu button and also renders `Editor`. Toggling the menu re-renders `Editor`. Nothing in `Editor` reads `open`. Where should `open` live, and what do you change if a shortcut elsewhere must toggle the same menu?

**Context and Constraints:**

React 18. `Editor` is expensive enough that a profile shows its render when the menu toggles. No context is required for the menu. The shortcut requirement is a separate case.

**Senior Engineer's Answer:**

`open` lives in the component that renders the button and the menu. That component calls `useState` and returns both. `Page` renders `<MenuWidget />` and `<Editor />` and does not mention `open`. A toggle updates `MenuWidget`. `Page` does not re-render, so this toggle does not re-render `Editor`. Colocation is that placement: the state sits in the smallest subtree that reads it.

`Page` holding `open` makes every menu toggle a `Page` render. `Editor` runs because its parent ran. Moving the `useState` call is what removes that work. Wrapping `Editor` in `memo` can also skip it when its props are unchanged, and it leaves the state too high. The next boolean someone adds to `Page` has the same shape. Put the flag next to the UI that owns the interaction.

When a shortcut outside the menu must toggle it, the flag moves up to a component that contains both the shortcut and the menu. That is the first time a second reader exists. If that owner would otherwise re-render `Editor`, the owner takes `Editor` as `children` from a parent that does not hold `open`. The owner's render then passes the same `children` element through, and the editor subtree is not re-rendered for the toggle. The menu still subscribes by being rendered from the owner's own JSX, where it receives `open`.

React re-renders the component that called `useState` and the elements that component creates. Your job is to make the component that called `useState` the menu, until a second reader appears.

**Practical Implementation:**

```tsx
function MenuWidget() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen((value) => !value)}>Menu</button>
      {open ? <Menu /> : null}
    </>
  );
}

function Page() {
  return (
    <>
      <MenuWidget />
      <Editor />
    </>
  );
}
```

**Trade-offs and Alternatives:**

Local state is enough for one widget. Lifting is the move when a second component must read or write the same flag. Context is the move when those components are far apart and threading `open` through layers that do not use it is the cost. A store is unnecessary for a boolean that changes on a click. `memo` on `Editor` is a patch when you cannot move the state yet. It is not the placement.

**Common Mistakes:**

Putting `open` in a page-level context so "anything can toggle the menu later," and re-rendering every consumer on each toggle. Duplicating `open` inside `MenuWidget` and also in `Page` so the shortcut and the button disagree. Resetting `Editor` draft state because the menu's parent re-rendered.

**Senior-Level Follow-up:**

The menu button lives in a toolbar that is a sibling of `Editor`, and the panel is rendered in a portal. Does the portal force `open` back up to `Page`?

The portal changes where the DOM node is attached. The state can still live in `MenuWidget` if that component renders both the button and the portaled panel. The shortcut case is what lifts the state. The portal is not a second owner.

### REACT-082 — The shared query is lifted to the parent

**Difficulty:** Intermediate

**Category:** State architecture

**Question:**

`SearchBox` and `Results` each call `useState("")` for the query. The user types `ada` in the box. What does the list show, and what is the smallest lift that makes them agree? The list must be filtered during render.

**Context and Constraints:**

React 18. Both components are children of `Page`. `items` is a prop of `Page` from a parent that already has the data. No context and no store. The filter is a pure `includes` check.

**Senior Engineer's Answer:**

Each `useState` is a different slot. Typing updates the slot inside `SearchBox`. `Results` still has `""`, so it shows every item. React has no link between two states because they were initialized from the same string.

Lift `query` into `Page`, the closest owner of both children. `Page` passes `query` and `setQuery` into `SearchBox`, and passes `query` into `Results`. `setQuery` is stable. `Results` computes `const visible = items.filter((item) => item.name.includes(query))` while it renders. There is one query, the input is controlled, and the list matches what the box shows on the same commit. `Results` does not declare a query state and does not copy the prop into a slot in an effect.

This is the same placement rule as keeping a private flag local, applied to a value that already has two readers. The owner is the lowest component that can see both. Leaving `query` in `SearchBox` and passing a callback up on every change is the same lift with the state sitting in the child: the parent would still need a slot if `Results` must render the text. One slot in the parent is the direct version.

React keeps the slot in the component that called `useState`. Your tree gives both readers that slot's value as a prop.

**Practical Implementation:**

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

function Results({ items, query }: { items: Item[]; query: string }) {
  const visible = items.filter((item) => item.name.includes(query));
  return (
    <ul>
      {visible.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

**Trade-offs and Alternatives:**

Props are the right channel for one parent and two children. Context becomes reasonable when `query` has to cross several components that do not read it. A store is reasonable when many distant lists subscribe to different slices of a frequently changing query model. Filtering in the parent and passing `visible` also works. Filtering in `Results` keeps the derivation next to the list. Either way the query slot is singular. An uncontrolled input whose DOM holds the text cannot update `Results` until you read the DOM in a handler and put that string in state, which is the lift again.

**Common Mistakes:**

Syncing the two slots with an effect that copies one into the other. Lifting `items` into `Page` state when `items` is already a prop. Writing `onQuery={(value) => setQuery(value)}` and then adding `memo` to `SearchBox` without noticing the wrapper is a new function every render. Passing `setQuery` itself keeps the stable setter.

**Senior-Level Follow-up:**

`Results` is slow, and `Page` also holds an unrelated `banner` string that changes on a timer. Where do you cut the extra `Results` render without a second copy of `query`?

Keep one `query` in `Page`. If a profile shows `Results` costing the timer ticks, wrap `Results` in `memo` so equal `items` and `query` props skip it while `banner` changes. The skip depends on those prop identities. The query still lives in one place. Moving `banner` into a child that `Page` does not re-render for is the placement fix when the timer should not render `Page` at all.

### REACT-083 — A new key mounts a new copy of the state

**Difficulty:** Senior

**Category:** State

**Question:**

`NoteScreen` renders `<NoteEditor key={noteId} noteId={noteId} />`. The user types a draft, then `noteId` changes and `NoteEditor` stays at the same place in `NoteScreen`'s output. What happens to the draft, to the editor's effect, and to state that lives in `NoteScreen`? What happens if the key is instead placed on the `<textarea>` inside `NoteEditor`?

**Context and Constraints:**

React 18, `createRoot`. `NoteEditor` holds the draft in `useState` and subscribes in `useEffect` with `[noteId]`. `NoteScreen` may hold other state. This question is only about resetting this component's state. List reconciliation beyond this key change is out of scope.

**Senior Engineer's Answer:**

`noteId` changed, so the `key` on `NoteEditor` changed. React unmounts the editor instance that belonged to the previous id and mounts a new one in that place. The old instance runs its effect cleanup and drops its `useState` slots. The new instance runs the `useState` initializer, so the draft starts at the initial value again, and it runs the effect setup for the new `noteId`. The textarea from the old instance is gone with it, including text the DOM was holding. The new instance shows the new initial draft.

State in `NoteScreen` is a different component. It stays. A selected tab, a scroll flag, or a draft that `NoteScreen` itself stores is still there after the child is replaced. The key resets the component it is on. The same `noteId` keeps the same key, so typing continues to update the same slot.

A `key` on the inner `<textarea>` remounts that DOM node. It does not remount `NoteEditor`. The `useState` draft in `NoteEditor` survives, and the effect in `NoteEditor` does not clean up because of that textarea key. If the textarea is controlled by `draft`, the new DOM node receives the surviving draft on the next paint. The key has to sit on the component that owns the slots you intend to drop.

Changing the key on every `NoteScreen` render, for example `key={Math.random()}`, mounts a fresh editor every time and the draft never survives a parent render. The key should change when the identity of the note changes.

React treats a new key at that position as a new instance and runs the mount and unmount lifecycles for it. Your initializer and your effect are written to be correct on a fresh mount. Cleanup still has to release the old subscription, because unmount runs it.

**Practical Implementation:**

```tsx
function NoteScreen({ noteId }: { noteId: string }) {
  return <NoteEditor key={noteId} noteId={noteId} />;
}

function NoteEditor({ noteId }: { noteId: string }) {
  const [draft, setDraft] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    loadNote(noteId, controller.signal).then(setDraft).catch(() => {});
    return () => controller.abort();
  }, [noteId]);
  return <textarea value={draft} onChange={(event) => setDraft(event.target.value)} />;
}
```

**Trade-offs and Alternatives:**

The key is the right reset when the whole editor, its effects, and its DOM should start over for a new note. Adjusting state during render is the right reset when this component must stay mounted and only the draft should change. A controlled draft in `NoteScreen` is the right model when a sibling preview reads every keystroke. Then the key on `NoteEditor` does not clear the preview's source, because the source is above the key. Clear that parent slot in the same transition that changes `noteId`, or move the draft back down and let the key replace it. An effect that sets the draft to `""` when `noteId` changes paints the old draft first and is the late version of the same reset.

**Common Mistakes:**

Expecting `useState("")` to run again because `noteId` changed, while the key stayed the same. Putting the key on a host child and expecting the parent's slots to reset. Using the key as a substitute for aborting the old request in an editor you intentionally keep mounted.

**Senior-Level Follow-up:**

The draft is lifted into `NoteScreen` so a preview can render it, and `NoteEditor` still has `key={noteId}`. The user types, then navigates to another note. What does the preview show?

The preview shows the previous draft. The key replaced `NoteEditor` and left `NoteScreen`'s slot as it was. Reset the draft in `NoteScreen` when its `noteId` changes, or move the draft into `NoteEditor` if the preview can read it from a parent that re-renders for a different reason. The key resets the instance it names.

### REACT-084 — An async effect cannot return a cleanup

**Difficulty:** Senior

**Category:** Effects

**Question:**

`userId` changes while `fetchUser` is in flight. What cleanup runs for this effect, and what does the inner `return` actually return?

```tsx
useEffect(async () => {
  const controller = new AbortController();
  const user = await fetchUser(userId, controller.signal);
  setUser(user);
  return () => controller.abort();
}, [userId]);
```

**Context and Constraints:**

React 18, `createRoot`. `fetchUser` honors the signal. The component stays mounted across the `userId` change. Development and production both lack a cleanup here. Strict Mode is a separate sentence.

**Senior Engineer's Answer:**

The function passed to `useEffect` is `async`, so calling it returns a Promise. React uses a returned function as the cleanup. A Promise is not that function. React does not await it and does not call the function the Promise later resolves to. The `return () => controller.abort()` is the resolution value of the Promise, after the `await`. By then the effect has already finished from React's point of view, with no cleanup registered. In development React warns that the effect returned something other than a cleanup function.

When `userId` changes, React has nothing to run before the next setup. The previous `fetchUser` keeps going. Its `setUser` can still apply. Moving the `return` above the `await` does not fix it. An `async` function wraps every return value in a Promise, including a function returned immediately.

The effect function itself has to be synchronous and return the cleanup synchronously. An `async` function declared inside the effect can `await`, and the effect calls it without returning it. The `return () => controller.abort()` sits in the effect, so it is registered before the request settles. Cleanup then aborts the request that this setup started. After an abort, `fetchUser` rejects. The inner `catch` returns on `AbortError` and does not call `setUser` or `setError`.

On unmount, that same cleanup runs and the next setup does not. In development, Strict Mode runs setup, cleanup, and setup on mount, so the first controller is aborted and the second request is the one that may set state. Production does not add that extra mount cycle.

React guarantees it will call a cleanup function you returned, before the next setup and on unmount. Your effect returns that function from the synchronous effect, and the async work is started inside it.

**Practical Implementation:**

```tsx
useEffect(() => {
  const controller = new AbortController();
  async function load() {
    try {
      setUser(await fetchUser(userId, controller.signal));
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err);
    }
  }
  load();
  return () => controller.abort();
}, [userId]);
```

**Trade-offs and Alternatives:**

`.then` and `.catch` without an inner `async` function are the same structure. A boolean closed over by this setup is the alternative when the API cannot take a signal: cleanup sets the boolean, and the resolution checks it before `setUser`. The request still finishes. Abort is the one that stops the work when the API allows it. A fetch that should run because the user clicked Save belongs in the click handler, where there is no effect cleanup to return.

**Common Mistakes:**

Treating the warning as a lint preference and leaving the effect `async`. Assuming the `return` after `await` still registers because it is syntactically inside the effect callback. Clearing the warning by deleting the dependency array so the effect runs once and the overlap is rarer.

**Senior-Level Follow-up:**

`load` is called without `await` inside the effect, and `userId` changes before it finishes. The cleanup aborts. Can `load` still reach `setUser` if `fetchUser` ignores the signal?

Yes. Abort is a request to the caller you passed the signal to. If `fetchUser` never reads the signal, the promise resolves and `setUser` runs. Cleanup still ran. It aborted a controller nobody checked. Pass the signal into something that honors it, or set a flag in that same setup's closure and check it after the `await`. The flag works even when the request cannot be cancelled.

### REACT-085 — Cleanup must remove the listener it added

**Difficulty:** Senior

**Category:** Effects

**Question:**

`shortcut` changes from `"a"` to `"b"`. How many `keydown` listeners are on `window` afterward, and which keys call `run`? What does the corrected cleanup close over?

```tsx
useEffect(() => {
  function onKey(event: KeyboardEvent) {
    if (event.key === shortcut) run();
  }
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", () => {});
}, [shortcut, run]);
```

**Context and Constraints:**

React 18 client component. The component stays mounted. `run` is stable across this change. No other effect touches `keydown`. Production sequence.

**Senior Engineer's Answer:**

`removeEventListener` removes a listener only when the function argument is the same function that was added. The cleanup creates a new arrow and removes that. The `onKey` from the `"a"` setup stays on `window`. The `"b"` setup adds a second `onKey`. Two listeners are active. A keydown of `"a"` calls the first, which still closes over `"a"` and calls `run`. A keydown of `"b"` calls the second. Unmount runs the same cleanup and still removes nothing.

The corrected cleanup is `return () => window.removeEventListener("keydown", onKey)`. That `onKey` is the function this setup added. When `shortcut` changes, React runs this previous cleanup before the next setup. The cleanup closes over the `"a"` render: that is the listener to detach. It then adds the `"b"` listener. The cleanup is supposed to see the old shortcut. The new shortcut is the next setup's closure.

`run` is in the list, so a new `run` identity rebinds the listener the same way. If `run` is an inline function, the listener is removed and added on every parent render. That removal still has to be the same function reference. Rebinding is a separate choice from removing correctly.

React runs the cleanup from the render that created the effect, then runs the new setup, and it runs the cleanup on unmount. Your cleanup undoes that setup's `addEventListener` with the same function.

**Practical Implementation:**

```tsx
useEffect(() => {
  function onKey(event: KeyboardEvent) {
    if (event.key === shortcut) run();
  }
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [shortcut, run]);
```

**Trade-offs and Alternatives:**

Depending on `shortcut` is what you want when a new shortcut should replace the listener. Depending on a stable `run` avoids rebinding when the parent renders. When `run` must see the latest draft and must not rebind, store `run` in a ref updated from the render and leave it out of this list. The cleanup identity problem remains either way. One listener with `{ once: true }` is a different product. It does not fix a cleanup that removes the wrong function.

**Common Mistakes:**

Writing the remove call with a fresh function that "does the same thing." Reading `shortcut` inside the cleanup and thinking it should already be `"b"`. Removing `run` from the list by deleting the lint warning, so the listener keeps the first `run` while the shortcut updates.

**Senior-Level Follow-up:**

Two effects in this component both register `keydown`, and both clean up correctly. In what order do their cleanups and setups run when `shortcut` changes?

React runs the cleanups for the effects that are re-running, in declaration order, and then their setups, in declaration order. The first effect has removed its previous listener and added the new one before the second effect's setup runs. Each cleanup still removes only the function that its own previous setup added. Order between them does not make a mismatched function match.

### REACT-086 — The aborted request's finally clears the next loading flag

**Difficulty:** Senior

**Category:** Effects

**Question:**

`userId` changes from `"a"` to `"b"` while the fetch for `"a"` is in flight. After the `"b"` effect has started and before the `"b"` response arrives, what is `loading`, and which callback set it?

```tsx
useEffect(() => {
  const controller = new AbortController();
  setLoading(true);
  fetch(`/users/${userId}`, { signal: controller.signal })
    .then((res) => res.json())
    .then((user) => {
      setUser(user);
    })
    .catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err);
    })
    .finally(() => {
      setLoading(false);
    });
  return () => controller.abort();
}, [userId]);
```

**Context and Constraints:**

React 18, `createRoot`. Browser `fetch`. The component stays mounted. `"b"` has not resolved yet when you answer. Production timing. Strict Mode's extra mount is a separate sentence.

**Senior Engineer's Answer:**

`loading` is `false` while the `"b"` request is still in flight. The `"a"` cleanup calls `abort()` and returns. Abort rejects that fetch's promise as a microtask, so it does not run inside `abort()`. The `"b"` setup then runs in the same effect flush and calls `setLoading(true)`. When the `"a"` promise rejects, its `catch` returns on `AbortError` and its `finally` still runs. That `finally` calls `setLoading(false)`. It closed over the `"a"` setup, and it does not know that `"b"` has since set the flag to `true`. The `"b"` response has not arrived, so nothing has a reason to show loading. The flag that the screen reads is shared, and the old request is still allowed to write it.

`finally` runs when the promise settles, including abortion. Returning from `catch` does not skip it. The `AbortError` check protects `setError`. It does not protect the `finally` below it.

Create the controller inside the effect so each setup has a signal that starts unaborted. Check that same controller in `finally` and skip the flag when `controller.signal.aborted` is true. The `"a"` closure's controller is the aborted one. The `"b"` closure has a different controller. A generation number stored in a ref is the same idea when you cannot abort: `finally` returns when its id is no longer the ref's id.

The stronger fix removes the loading slot. Store the snapshot as `{ userId, user }` when a request succeeds. `const loading = snapshot?.userId !== userId` during render. The render that receives `"b"` is already loading, because the snapshot still belongs to `"a"`. The aborted `finally` has no flag to clear. When `"b"` resolves, one store of `{ userId: "b", user }` makes `loading` false. A real error should be stored with the `userId` it belongs to, or the next id will display the previous failure.

In development, Strict Mode aborts the first mount's request and starts a second. The first request's `finally` has the same bug if it clears a flag the second request is using.

React guarantees the previous cleanup runs before the next setup, and that the cleanup is the `"a"` closure. Your `finally` may write state only for a request that is still the current one.

**Practical Implementation:**

```tsx
function Profile({ userId }: { userId: string }) {
  const [snapshot, setSnapshot] = useState<{ userId: string; user: User } | null>(null);
  const [error, setError] = useState<{ userId: string; error: unknown } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/users/${userId}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((user) => {
        if (controller.signal.aborted) return;
        setSnapshot({ userId, user });
        setError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError({ userId, error: err });
      });
    return () => controller.abort();
  }, [userId]);

  const failed = error?.userId === userId;
  const loading = snapshot?.userId !== userId && !failed;
  return <p>{loading ? "Loading" : failed ? "Error" : snapshot?.user.email}</p>;
}
```

**Trade-offs and Alternatives:**

Deriving `loading` from the snapshot id shows the new id as loading on the same render that received it, and it leaves the previous user on screen so the UI can keep showing it. A `loading` slot plus an aborted check in `finally` is the local patch when a boolean already exists. It still sets `true` from the effect, which is after the render that changed `userId`. A ref generation counter is what you use when the client cannot pass a signal. Reusing one `AbortController` from a ref across setups is a different bug: after the first abort the signal stays aborted, and the next `fetch` fails immediately. Construct a new controller in each setup.

**Common Mistakes:**

Treating `finally` as "success or failure" and forgetting abortion. Clearing `loading` in `catch` and also in `finally`, so the `AbortError` return is bypassed. Setting `loading` to `true` in the effect and to `false` in a second effect, so the two writers race.

**Senior-Level Follow-up:**

The controller is created once with `useRef(new AbortController())`, and every cleanup calls `controllerRef.current.abort()`. What does the `"b"` fetch do?

It starts already aborted. `abort()` does not reset a controller. The `"b"` `fetch` rejects with `AbortError`, the catch returns, and the profile never loads `"b"`. Assign `controllerRef.current = new AbortController()` at the start of each setup if you need the ref for something else, or skip the ref and keep the controller in the effect's local variable, which is all the cleanup needs.

### REACT-087 — A missing selection is cleared during render

**Difficulty:** Advanced

**Category:** Derived state

**Question:**

`items` is a prop. `selectedId` is state. A parent render removes the selected item. What does this effect show first, and how do you clear the selection before paint without copying `items` into state?

```tsx
function Picker({ items }: { items: Item[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    if (selectedId !== null && !items.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [items, selectedId]);

  return <p>{selectedId ?? "none"}</p>;
}
```

**Context and Constraints:**

React 18. `Item` is `{ id: string; name: string }`. The parent can pass a new array that still contains the selected id, or an array that does not. The user can click to change `selectedId`. No fetch in this component.

**Senior Engineer's Answer:**

The initializer stores an id only on the mount of this slot. Later `items` props do not enter the slot. When the selected id disappears, this render still returns the old `selectedId`. The effect runs after that commit's paint opportunity and then sets `null`. The user can see a selection that is no longer in the list. The effect also depends on `items`. A parent that passes a new array with the same ids re-runs the effect, finds the id, and does not set state. The extra dependency does not by itself reset a valid selection. It does mean the validity check is a second commit late whenever it matters.

The selection is state because the click is user input. Whether it is still allowed is a pure check of this render's props and state. Do it while rendering. If `selectedId` is not `null` and no item has that id, call `setSelectedId(null)` before the return. React throws away this render's output and restarts with `null` before paint, so the invalid id is not shown. On that next pass the condition is false, so it does not set state again. If the id is still in the list, there is no update, including when `items` is a new array with the same ids.

Do not store `items` in state. The prop is the list. Do not clear the selection from an effect in order to "wait until the list is committed." The list is already an argument of this render.

`useState(items[0]?.id ?? null)` still only seeds the first mount. If the product wants "select the first item whenever the list identity changes," that is a different rule from "drop an id that is gone." The drop is the condition above. Selecting a replacement the user did not click should be explicit, and a `key` on `Picker` is the reset when the whole picker belongs to one list identity.

React restarts the render when this component sets its own state during render under a condition that becomes false. Your condition compares ids and does not allocate a new selection on every pass.

**Practical Implementation:**

```tsx
function Picker({ items }: { items: Item[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectionIsValid =
    selectedId !== null && items.some((item) => item.id === selectedId);
  if (selectedId !== null && !selectionIsValid) {
    setSelectedId(null);
  }
  return <p>{selectedId ?? "none"}</p>;
}
```

**Trade-offs and Alternatives:**

Adjusting during render keeps `Picker` mounted and preserves its other state. `key` on `Picker` is better when changing the list should reset every slot and effect in the picker. A controlled `selectedId` in the parent is better when a sibling reads the selection. The parent then does the same check, or it never offers a stale id. The effect version is the one that can paint the stale id. Deriving a `selected` item as `items.find(...)` during render is still required: the id may be `null`, and the object to display comes from the prop, not from a stored copy of the row.

**Common Mistakes:**

Calling `setSelectedId(null)` during every render with no condition, which loops. Copying `items` into state so the effect can depend on a slot. Using the effect because `items` is an array and assuming React will deep-compare it. The dependency uses `Object.is` on the array reference. The during-render check uses ids, so a new array that contains the id does not clear it.

**Senior-Level Follow-up:**

The product wants the first remaining item selected when the current one disappears. How do you express that without an effect?

Compute `const nextId = selectionIsValid ? selectedId : (items[0]?.id ?? null)`. If `nextId !== selectedId`, call `setSelectedId(nextId)` during render. The restart paints the replacement. When `nextId` and `selectedId` are both `null`, the condition is false and the render finishes. That auto-advance is a product rule. The version that sets `null` refuses to pick a substitute the user did not choose.

### REACT-088 — The total is derived during render

**Difficulty:** Intermediate

**Category:** Derived state

**Question:**

`lines` is state. Each line has a `price`. What does a commit show if the total is stored in a second slot and copied in an effect, and what should the component compute instead? Where would a cache of that number be justified?

```tsx
function Cart({ lines }: { lines: Line[] }) {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setTotal(lines.reduce((sum, line) => sum + line.price, 0));
  }, [lines]);

  return <p>{total}</p>;
}
```

**Context and Constraints:**

React 18. `Line` is `{ id: string; price: number }`. `lines` changes when the user adds a line. The reduce is synchronous and pure. No profile has shown the reduce to be expensive.

**Senior Engineer's Answer:**

The first render stores `total` as `0` and can paint `0` while `lines` is already non-empty. The effect runs after that paint opportunity and sets the sum, so a second render shows the number. Every later `lines` change repeats the gap: the render that has the new lines still holds the previous total until the effect replaces it. The sum is determined by `lines`. Nothing external has to happen before the screen can show it.

Compute it while rendering: `const total = lines.reduce((sum, line) => sum + line.price, 0)`. The commit shows the sum that matches these lines. There is no second slot to drift, and there is no second render whose only job is to copy a calculation.

A cache around that reduce is justified only after a profile shows the reduce dominating this render, or if a child requirement needed a stable identity. The result is a number. `Object.is` on a number already compares the value, so identity is not the reason. Until a profile says otherwise, the reduce runs during render and the effect stays deleted. A large `lines` array does not move the sum into an effect. The effect is what paints the stale `0`.

React lets render read state and return the total in the same output. An effect runs too late for a value this render already knows.

**Practical Implementation:**

```tsx
function Cart({ lines }: { lines: Line[] }) {
  const total = lines.reduce((sum, line) => sum + line.price, 0);
  return <p>{total}</p>;
}
```

**Trade-offs and Alternatives:**

Deriving during render is the default. Keeping `total` in a reducer by recomputing it in every action is a second writer: one action that forgets the recompute stores a lie. Derive it, and let the reducer store `lines` only. A server total is a different fact. If the server is the authority, display the server field and do not also reduce on the client unless the product is explicit that the client sum is an estimate. A debounced total is a product delay: store the debounced lines or the debounced number as its own state with a defined update, and keep the live sum available if the UI shows both.

**Common Mistakes:**

Initializing `useState(0)` and calling the first paint a formatting bug. Adding `useMemo` around the reduce on the first implementation because the array might be large someday. Writing the total back onto each line in the effect so the two slots "stay in sync."

**Senior-Level Follow-up:**

The user can type a tip percent. The payable amount is the total plus the tip. What is state?

The tip percent is state. The merchandise total and the payable amount are calculations from `lines` and that percent, both during render. One slot for the percent is enough. A slot for the payable amount reintroduces the effect, or a handler that forgets to update it when the lines change.

### REACT-089 — Context consumers re-render without a selector

**Difficulty:** Senior

**Category:** Context

**Question:**

`AppContext` provides `value={{ user, notifications }}`, and that object is created in the provider's render. `notifications` updates. `AccountName` is wrapped in `memo`, receives no props, and only uses `user.name`. Does `AccountName`'s function run? What does the `useMemo` inside it skip?

```tsx
const AccountName = memo(function AccountName() {
  const { user } = useContext(AppContext);
  const label = useMemo(() => user.name, [user.name]);
  return <span>{label}</span>;
});
```

**Context and Constraints:**

React 18. One provider. `user` did not change. `notifications` is a new array. No selector library and no `useSyncExternalStore` in this component yet. `AccountName` is a child of a component that did not re-render except through context.

**Senior Engineer's Answer:**

`AccountName`'s function runs. `useContext` subscribes to the context value's identity. The provider rendered a new object, so `Object.is` fails and every consumer of `AppContext` re-renders, including one that reads `user.name` and ignores `notifications`. `memo` compares props. This consumer has no props. A context update does not go through `memo`. `memo` can skip a component when its parent re-rendered and its props are equal and the context value is unchanged. It does not filter fields inside the value.

`useMemo` runs only after `AccountName` has already been called. Here it stores the name string. Computing the name was already a property read. The cache does not stop the function, the child render, or the subscription. React 18's `useContext` takes the context object and returns the whole value. It does not take a selector function. A call that passes `(value) => value.user.name` is not the React 18 API.

Split `user` and `notifications` into two providers when they change at different rates. `AccountName` calls `useContext` on the user context and does not run for a notification update whose user value is `Object.is` equal. A component that needs both calls both hooks. If many consumers each need a different field of a frequently changing value, an external store plus `useSyncExternalStore` lets `getSnapshot` return the name string. That subscription follows the snapshot identity. `useContext` will not grow a selector in this version.

React guarantees a per-context `Object.is` subscription. Your provider decides whether a notification update produces a new value for the context `AccountName` reads.

**Practical Implementation:**

```tsx
function AccountName() {
  const user = useContext(UserContext);
  return <span>{user.name}</span>;
}
```

**Trade-offs and Alternatives:**

Two contexts are the straightforward React 18 fix and stay visible in DevTools. They get awkward when every field has its own provider. The store is the step after a profile shows one context waking too many readers, not the first place a name goes. Passing `user` as a prop avoids a subscription when the parent already has the user and is the one rendering `AccountName`. Colocating notifications in the component that renders them removes them from the provider entirely. `useMemo` on the provider value helps when the fields in that value are unchanged and you would otherwise allocate a new object. It does not help a consumer ignore one field of an object that did change.

**Common Mistakes:**

Wrapping the consumer in `memo` and expecting the notification update to stop at the provider. Adding `useMemo` inside the consumer to "select" the name. Passing a selector as the second argument to `useContext` and debugging the type error as a bundler issue.

**Senior-Level Follow-up:**

The provider memoizes `{ user, notifications }` with those dependencies, and `notifications` is the same array as last time. Does `AccountName` run?

It does not run because of context. The memoized object is `Object.is` equal to the previous value, so this context does not notify consumers. `AccountName` still runs if its parent rendered it. The memoized object is the right tool when both fields are unchanged. It is the wrong tool when `notifications` changed and `AccountName` should stay still. That case is a different context, or a snapshot of the name.

### REACT-090 — Hooks stay above any early return

**Difficulty:** Intermediate

**Category:** Hooks

**Question:**

The first render has a `user`. A later render passes `user={null}`. What goes wrong, and where can `useState` be called? What happens if `useState` is moved into `onEdit`?

```tsx
function Editor({ user }: { user: User | null }) {
  if (user === null) {
    return <p>Signed out</p>;
  }
  const [draft, setDraft] = useState(user.email);
  return (
    <input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  );
}
```

**Context and Constraints:**

React 18 function component. `user` can flip between an object and `null` while `Editor` stays in the same position. No custom hook yet.

**Senior Engineer's Answer:**

The first render calls `useState` once. The signed-out render returns before that call, so this component runs zero hooks. React matches slots by call order and throws because the hook count changed. The draft is not "skipped." The slot list no longer lines up with the previous render, including any hooks that might be added below this one later.

Call `useState` before the branch, on every render. The signed-out return can come after it. The slot then survives while `user` is `null`, which is harmless if a later sign-in should still see the draft, and surprising if the draft should disappear with the user. To drop the slot, render a child that calls `useState` and do not render that child when `user` is `null`. Unmounting the child is the conditional. The parent's hook list stays the same length.

`useState` inside `onEdit` runs when there is no render dispatcher. React rejects the call. Hooks run during render of a function component or a custom hook, at the top level of that render, in a stable order. Event handlers, timeouts, and conditions are outside that sequence. The `use` prefix is the lint rule's signal. The runtime enforces the dispatcher and the order. Renaming the call does not make an event-handler hook legal, and a legal top-level call does not become illegal because the variable has an ordinary name. A helper that calls `useState` and is itself called unconditionally at the top of the component matches slots at runtime, and the linter accepts it when the helper is named `useSomething` and called from a component or another hook.

The initializer `user.email` runs only when the slot is created. Signing out and back in, while `Editor` stayed mounted and the hook stayed unconditional, does not re-seed the draft from the new email. A child that unmounts with `user === null` does.

**Practical Implementation:**

```tsx
function Editor({ user }: { user: User | null }) {
  if (user === null) return <p>Signed out</p>;
  return <SignedInEditor user={user} />;
}

function SignedInEditor({ user }: { user: User }) {
  const [draft, setDraft] = useState(user.email);
  return (
    <input value={draft} onChange={(event) => setDraft(event.target.value)} />
  );
}
```

**Trade-offs and Alternatives:**

The child keeps the "no draft while signed out" behavior and a legal hook list. Calling `useState` before the return keeps one slot for the life of `Editor`, which is the right model when the draft should survive a brief `null`. Resetting that surviving slot when `user` changes is the key or the during-render adjustment, not a hook under the `if`.

**Common Mistakes:**

Guarding the hook with `user && useState(...)`. Catching the hooks error and rendering `null` from an error boundary as a permanent fix. Calling the hook inside `onChange` so the draft "exists only after the first keystroke."

**Senior-Level Follow-up:**

`useDraft(user)` is called only in the signed-in branch, and `useDraft` calls `useState`. Does naming it `useDraft` make the branch legal?

The name satisfies the linter's prefix when the call is unconditional. The branch is still a different number of hook calls across renders. `useDraft` expands to its inner `useState` at the call site. The signed-out render skips that slot. Call `useDraft` on every render of `Editor`, or call it only inside `SignedInEditor`, which is absent when the user is absent.

### REACT-091 — A custom hook does not share state across rows

**Difficulty:** Senior

**Category:** Custom hooks

**Question:**

`Checklist` maps `tasks` and calls `useToggle` inside the map. Each row should have its own boolean, and two checklists on the page must not flip together. What does React do with the map, and where does each boolean live? Does a module-level `let on = false` inside `useToggle` solve the sharing?

**Context and Constraints:**

React 18. `tasks` can gain and lose entries. `useToggle` calls `useState`. Both checklists are mounted under one root. No context unless the answer needs it.

**Senior Engineer's Answer:**

The map callback runs a different number of `useState` calls when `tasks.length` changes. Hook order is the identity of the slots. A shorter list shifts every later slot, so one task's boolean appears on another task, and React throws when the count changes between renders. A constant length can line up by accident. The rules still forbid the loop, because the next length change attaches state to the wrong row. The `use` prefix on `useToggle` does not create a slot per task id. It marks the function so the linter can follow the calls.

Each boolean lives in the component that should own that row. `TaskRow` calls `useToggle` once at the top level. `Checklist` renders `<TaskRow task={task} />` per item and does not call a hook in the loop. Each mounted `TaskRow` has its own slot list. Unmounting a row drops that row's boolean. A second `Checklist` has its own rows and its own slots. Calling the same `useToggle` function in both places runs the same code and stores different state. A custom hook shares the logic. It does not share the slots.

A module-level `let on = false` is one binding for the whole module. Every row and every checklist would read and write that same variable, and assigning it would not re-render any of them. That is shared mutable data, not a hook slot. Share a boolean only when the product says two rows are one switch: one `useState` in the parent, or one context, or a store those rows subscribe to.

React gives each mounted component its own hook list and matches it by call order. Your map renders children. The children call the hooks.

**Practical Implementation:**

```tsx
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = () => setOn((value) => !value);
  return { on, toggle };
}

function TaskRow({ task }: { task: string }) {
  const { on, toggle } = useToggle();
  return (
    <li>
      <button onClick={toggle}>{task}:{String(on)}</button>
    </li>
  );
}

function Checklist({ tasks }: { tasks: string[] }) {
  return (
    <ul>
      {tasks.map((task) => (
        <TaskRow key={task} task={task} />
      ))}
    </ul>
  );
}
```

**Trade-offs and Alternatives:**

Per-row state is the right model when each checkbox is independent. An array of booleans in `Checklist`, updated by index or id, is the right model when the parent submits every toggle as one value. That array is one slot, and the rows stay presentational. Context around one checklist shares the array with descendants of that provider and does not share it with the other checklist, as long as each checklist has its own provider. A module variable shares too widely and renders too little.

**Common Mistakes:**

Moving `useToggle` into the map and adding `key` on the `<li>`, expecting the key to give the hook call its own state. The key matches elements. The illegal calls are still in `Checklist`. Expecting two `Checklist` components to share toggles because they import one hook. Expecting them to stay isolated after introducing a module-level `Map` from task name to boolean.

**Senior-Level Follow-up:**

`useToggle` is changed to take `task` and return the same `on` for every row with that task name, across both checklists. What React feature does that?

None inside the hook. The hook would be hiding a store: a module map plus a subscription that re-renders every mounted row on a write, or a context whose value is that map provided above both checklists. `useState` inside `useToggle` remains per call. The shared layer has to notify both callers. If the product does not want the two lists to move together, do not add that layer.

### REACT-092 — Setters in one effect body commit together

**Difficulty:** Senior

**Category:** Batching

**Question:**

On mount, how many renders does this effect add for the synchronous setters, and how many does the `fetch` continuation add, on React 18 with `createRoot`? What did React 17 do with each group? The continuation runs once, and `ignore` stays false.

```tsx
useEffect(() => {
  setCount((count) => count + 1);
  setReady(true);

  let ignore = false;
  fetch("/boot")
    .then((res) => res.json())
    .then((data) => {
      if (ignore) return;
      setBoot(data);
      setReady(true);
    });
  return () => {
    ignore = true;
  };
}, []);
```

**Context and Constraints:**

React 18 `createRoot` unless a sentence says React 17 or `ReactDOM.render`. `count`, `ready`, and `boot` start as `0`, `false`, and `null`. `fetch` resolves. No `flushSync` and no `await` inside the `then`. The effect body does not call `setBoot`.

**Senior Engineer's Answer:**

The two setters in the effect function run synchronously while React is flushing the effect. They join one batch and produce one render, with `count` incremented and `ready === true`. React 17 already batched setters it ran inside an effect flush. This pair is not the React 18 batching change. The render that mounted the component has already been committed before the effect runs, so the screen can show the initial `0` and `false` before this extra render. Batching here means the user does not get a further frame where only `count` has changed.

The `then` callback is a later task. `setBoot` and `setReady` batch with each other on React 18 `createRoot` and add one render. On React 17 those two promise setters are two renders. A React 18 app mounted with `ReactDOM.render` keeps the React 17 behavior for that promise. The effect's own pair is still one render on that legacy root.

`await` inside the effect's async work is the boundary that starts another batch. Setters before the `await` and setters after it do not share a batch. `flushSync` around one of the synchronous setters forces a commit before the effect function continues, which splits a pair you usually want together and does extra synchronous render work inside the effect.

`useLayoutEffect` follows the same batching rule for the synchronous pair, and that render is flushed before paint. The promise continuation is still later, after the request, and it is not pulled forward into the layout flush.

After either setter returns, the locals from this effect closure do not become the new state. The next render of the component sees them. `ignore` only skips the continuation if cleanup ran first. It does not merge the two batches.

React 18 `createRoot` batches the setters that run in one effect call, and it batches the setters that run in one promise callback. It does not batch across the promise boundary, and it does not rewrite the mount render to include the effect's updates.

**Practical Implementation:**

```tsx
useEffect(() => {
  setCount((count) => count + 1);
  setReady(true);
}, []);
```

**Trade-offs and Alternatives:**

One render for the synchronous pair is what you want when both values belong to the same "booted" screen. If `ready` should be true in the mount render, initialize it to `true` or set it in the event that mounted this UI, so the effect is not a second writer for a flag render already knew. The promise pair belongs in one callback so React 18 paints `boot` and `ready` together. Splitting them across two `then` calls is two batches. A reducer action `{ type: "booted", data }` stores both in one slot when they are one outcome.

**Common Mistakes:**

Counting two renders for the synchronous pair because "effects are async." Counting one render for the whole effect including the `fetch`, because automatic batching sounds global. Explaining the single render as the three slots merging into one state object. They stay separate slots and commit together.

**Senior-Level Follow-up:**

The `then` callback calls `setBoot(data)` and then `await log(data)` and then `setReady(true)`. How many renders does that continuation produce on React 18 `createRoot`?

Two. `setBoot` is the batch before the `await`. `setReady` is the batch after it. The `await` is a new task even though both lines sit in one function. Put both setters on the same side of the `await` when they should paint together. `ready` is already `true` from the effect body in the snippet above, so the later `setReady(true)` is a same-state update if nothing flipped it back.

### REACT-093 — useDeferredValue compares its argument with Object.is

**Difficulty:** Senior

**Category:** Hooks

**Question:**

`text` is a string in `useState`. The slow child receives `useDeferredValue({ text })`, and the object is allocated in render. The user types one character, then the parent re-renders again because a banner string changed and `text` did not. What does the deferred hook compare, and what does the slow child render with?

**Context and Constraints:**

React 18, `createRoot`. `useDeferredValue` is called with one argument, the React 18 signature. The slow child is slow because its render is expensive, not because it fetches. No `useMemo` is in place. No numeric budget has been measured.

**Senior Engineer's Answer:**

`useDeferredValue` keeps a value and compares the next one with `Object.is`. On the first render the deferred value is the value you passed. When `text` changes, the urgent render can still return the previous deferred value, and React schedules a follow-up render at transition priority with the new value. The input that reads `text` from state can update on the urgent render. The slow child that receives the deferred value can keep showing the previous one until the transition render commits. A newer keystroke can interrupt that transition. The hook is not a timer and it does not delay by a fixed interval.

`{ text }` is a new object every render. `Object.is` on two different objects is false even when both contain the same characters. The keystroke defers a new object, which is the behavior you wanted for the text, and the later banner render also passes a new object while `text` is unchanged. That schedules deferred work for the slow child again. The comparison never gets to see "the same text." It sees "a different object."

Pass `useDeferredValue(text)`. The banner render passes the same string, `Object.is` succeeds, and the deferred value does not move. The slow child receives the string. Build any object the child needs from that deferred string during the child's render. A pending hint for a string is `text !== deferredText`. That is true while the deferred string lags. It is not a fetch status, and it is true on every render if you compare objects with `!==`.

Do not allocate the object and wrap it in `useMemo` as the default way to make this hook settle. The string is already comparable. A cache around the slow child's element is a separate choice when a profile shows the urgent render recreating that child while the deferred string is unchanged. It is not required to express the deferral.

React 18's `useDeferredValue` takes the value only. Your call passes the primitive that should lag, not a fresh container around it.

**Practical Implementation:**

```tsx
function Search({ banner }: { banner: string }) {
  const [text, setText] = useState("");
  const deferredText = useDeferredValue(text);
  return (
    <>
      <p>{banner}</p>
      <input value={text} onChange={(event) => setText(event.target.value)} />
      <SlowList text={deferredText} />
    </>
  );
}
```

**Trade-offs and Alternatives:**

`useDeferredValue` fits when the heavy child takes a value this component already updated. `startTransition` around the expensive `setState` fits when you own the update that is slow and can leave the input's setter outside it. Copying `text` into a deferred slot from `useEffect` updates the child on a later urgent render and does not mark that work as interruptible. A debounce belongs on a request you want to send less often. It waits even when the machine is idle. None of these make the slow child's algorithm cheaper.

**Common Mistakes:**

Deferring a fresh object or a fresh filtered array and treating the repeated work as the hook failing to catch up. Using `text !== deferredText` when both are objects and leaving a stale indicator up after every parent render. Wrapping the input's `setText` in `startTransition` so the caret waits on the list.

**Senior-Level Follow-up:**

`SlowList` filters `items` by the deferred text inside its render. The parent instead does `useDeferredValue(items.filter(...))` with a new array every time. What reaches the child on a banner render?

A new array, so the deferral sees a change even though the filtered contents may be the same. Filter inside `SlowList` from the deferred string, or filter in the parent from the deferred string during that render. The value you pass to `useDeferredValue` should be the input that changed, which is the text, and the list should be a result of rendering with it.

### REACT-094 — getSnapshot returns a cached snapshot

**Difficulty:** Advanced

**Category:** External stores

**Question:**

`useOnline` subscribes to `online` and `offline` and returns `useSyncExternalStore`. What goes wrong if `getSnapshot` returns `{ online: navigator.onLine }` from every call? Why is the subscription in this hook instead of in `useEffect`? The component is server-rendered.

**Context and Constraints:**

React 18. One boolean from the browser. No third-party store. `getServerSnapshot` is part of the question because the component renders on the server. Do not invent a polling interval.

**Senior Engineer's Answer:**

`useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` reads the snapshot during render and compares it with `Object.is`. React also calls `getSnapshot` again to check that the snapshot is stable. `{ online: navigator.onLine }` allocates a new object every call, so the check fails even when `navigator.onLine` did not change. React warns that the snapshot should be cached and does not settle, because every read looks like a new store value. Return the boolean itself, or keep one object in the module and allocate the next object only when the boolean changes, then return that same reference until then.

`subscribe` registers the callback React gives you and returns an unsubscribe function. React calls that unsubscribe in cleanup and during the development Strict Mode cycle, so a missing unsubscribe stacks listeners. The callback is the store saying "read `getSnapshot` again." It is not a place where you pass the next value into React. `getSnapshot` does that on the following read, and it has to be pure.

A `useEffect` that does `setOnline(navigator.onLine)` subscribes after paint. Under concurrent rendering, one component can read the store during a render that another component has already passed, and the committed tree can show two versions. `useSyncExternalStore` participates in the render. If the snapshot changes, React renders again so the tree commits one snapshot. That is why this hook exists in React 18. The effect subscription is too late to provide that guarantee.

On the server there is no `navigator`. Pass `getServerSnapshot` as a third function that returns a fixed boolean, and render the same function's result into the HTML. Hydration uses `getServerSnapshot` so the first client render matches the HTML. If the client's `getSnapshot` then differs, React updates after hydration. Omitting the third function on a server-rendered component is a missing snapshot, not a hint to call `getSnapshot` on the server.

React guarantees the consistent read and the `Object.is` check. Your module guarantees a cached snapshot and a subscribe function that removes the same listeners it added.

**Practical Implementation:**

```tsx
function subscribe(onStoreChange: () => void) {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

function useOnline() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

**Trade-offs and Alternatives:**

The boolean snapshot is the whole API when the UI only needs on or off. An object snapshot is justified when several fields move together, and only when you reuse the reference for an unchanged store. Context is a worse fit for `navigator.onLine` because the browser, not a provider render, is the source of the change. An effect plus `useState` is acceptable in a fully synchronous legacy tree where you have accepted the extra paint and you are not relying on concurrent rendering to keep two readers together. In React 18 the store hook is the one that states that requirement. Tearing is a consistency bug, not a number of extra renders to tune.

**Common Mistakes:**

Returning a fresh object and caching it in `useMemo` inside the component. `getSnapshot` is called outside that component's memo slot and has to be stable on its own. Calling `setState` from `getSnapshot`. Forgetting `getServerSnapshot` and reading `navigator` during server render. Treating the server boolean as a live socket status. It is the HTML's value, and the client snapshot replaces it after hydration when they differ.

**Senior-Level Follow-up:**

`getSnapshot` returns the cached object, and the event handler mutates `snapshot.online = navigator.onLine` before calling the listener. What does the next render see?

The same reference, so `Object.is` says nothing changed and a render can skip the update. The field has changed underneath the previous snapshot. Assign a new object when the boolean changes, and leave the previous object alone. Mutation makes the cache check succeed for the wrong reason.

### REACT-095 — startTransition does not follow an await

**Difficulty:** Senior

**Category:** Scheduling

**Question:**

`isPending` from `useTransition` is shown as the search spinner. The user submits a query. When is `isPending` true, and which `setRows` is a transition?

```tsx
const [isPending, startTransition] = useTransition();

async function onSearch(next: string) {
  startTransition(async () => {
    setQuery(next);
    const rows = await search(next);
    setRows(rows);
  });
}
```

**Context and Constraints:**

React 18, `createRoot`. `search` resolves with rows and does not set state. The input's own change handler is not this function. No Suspense is wrapped around the rows in this question.

**Senior Engineer's Answer:**

`startTransition` runs the function you pass immediately. It does not await a Promise that function returns. Updates scheduled synchronously inside the call are transition updates. `setQuery(next)` is one of those. The function then hits `await` and returns a Promise that React does not track. When `search` resolves, `setRows(rows)` runs in a later task, outside that transition. It is an urgent update.

`isPending` is true while a transition update from this hook has not committed. It becomes false when that transition commits. If `setQuery` commits before `search` resolves, `isPending` is false for the rest of the request. The spinner is not "the search is in flight." It is "a transition render is unfinished." If the synchronous part of the callback schedules no update, there is no transition update for `isPending` to follow during the await.

Mark the row update by calling `startTransition` again after the await, around `setRows`, when the expensive part is rendering those rows and a newer search should be allowed to interrupt it. That second call's `isPending` covers the row render, and it still does not cover the time before `setRows` is invoked. A spinner for the request is ordinary state: set a status to `"loading"` before the await and to `"ready"` or `"error"` when the promise settles. Those status updates are urgent because the spinner should move with the request, not wait behind a slow list.

Putting `setQuery` inside the transition also defers the query render. If the field should show `next` immediately, set the query outside `startTransition` and transition only the slow update.

React 18 applies transition priority to the updates scheduled in the synchronous `startTransition` callback. Your request status is a state machine you update around the promise.

**Practical Implementation:**

```tsx
async function onSearch(next: string) {
  setQuery(next);
  setStatus("loading");
  try {
    const rows = await search(next);
    startTransition(() => setRows(rows));
    setStatus("ready");
  } catch (err) {
    setStatus("error");
    setError(err);
  }
}
```

**Trade-offs and Alternatives:**

The status slot is the honest spinner. `useDeferredValue` on a query string fits a list that re-renders as the user types, without a request. Suspense fits a data source that suspends during render, which this `search` call in a handler does not do. Keeping `setRows` urgent is the right trade when the row render is cheap and you want it in the same paint as `status === "ready"`. The snippet above may paint `"ready"` before the transitioned rows commit. Set the status inside the same `startTransition` as `setRows` when those two must be one transition, and keep a separate urgent `"loading"` update before the await so the spinner does not wait for the rows.

**Common Mistakes:**

Awaiting `startTransition` as if it returned the search promise. Leaving `isPending` up in the UI as the network spinner and watching it drop while the request runs. Wrapping an `async` function so that `setRows` "stays in the transition" without another `startTransition` after the await.

**Senior-Level Follow-up:**

`setStatus("ready")` stays outside `startTransition`, and `setRows` stays inside, as in the implementation. The list is slow. What can the user see before the rows commit?

The urgent status update can commit first, so the screen can read ready while the previous rows are still showing and the new rows are a pending transition. Put `setStatus("ready")` in the same `startTransition` callback as `setRows` when that combination is the bug. Keep the earlier `setStatus("loading")` outside it so the loading state stays urgent.

### REACT-096 — The reducer init function runs when the slot is created

**Difficulty:** Intermediate

**Category:** Reducers

**Question:**

`Editor` stays mounted. The parent first passes `userId="a"` and later `userId="b"`. What is `state.userId` after the second render, and which of `init`, the reducer, and the draft reset run because of that prop change?

```tsx
function init(userId: string) {
  return { userId, draft: "" };
}

function Editor({ userId }: { userId: string }) {
  const [state, dispatch] = useReducer(reducer, userId, init);
  return <textarea value={state.draft} />;
}
```

**Context and Constraints:**

React 18. `reducer` handles `{ type: "typed", draft: string }` by returning the next draft and leaving `userId` as it was. The parent does not change the key. No effect syncs `userId`. Development Strict Mode applies to mount only.

**Senior Engineer's Answer:**

`useReducer(reducer, userId, init)` calls `init(userId)` when the slot is created and stores that object. Later renders pass the new `userId` and the same `init` and do not call `init` again. After the parent passes `"b"`, `state.userId` is still `"a"` and `draft` is whatever the user typed. The prop changed. The slot did not. The reducer does not run, because nothing dispatched.

`init` exists so expensive initial state is built once. It is not a dependency list and it does not subscribe to `userId`. `useReducer(reducer, { userId, draft: "" })` without `init` also uses that argument only when the slot is created, and it allocates the object on later renders only to ignore it. The lazy form avoids that allocation. Neither form tracks the prop.

In development, Strict Mode calls `init` twice on creation and keeps one result. `init` must be pure. A dispatch inside `init`, or a write to a server, runs twice in development and still does not run again when `userId` becomes `"b"`.

Reset by changing the key on `Editor` when a new user should drop the draft, the effects, and the DOM together. `init("b")` then runs because the new instance is a new slot. Or dispatch a `reset` action whose payload is the new id, from a during-render comparison of the prop to `state.userId`, so this instance stays mounted and one action replaces `userId` and `draft` together. An effect that dispatches the reset runs after the `"a"` draft can paint under `"b"`.

React uses `init` for the creation of the slot and then uses the reducer for actions. Your reset is either a new slot or a dispatched action.

**Practical Implementation:**

```tsx
function init(userId: string): State {
  return { userId, draft: "" };
}

const [state, dispatch] = useReducer(reducer, userId, init);
```

**Trade-offs and Alternatives:**

The key is the smallest reset when the whole editor belongs to `userId`. The `reset` action is the smallest reset when a sibling slot in this component must survive the user change. Separate `useState` for the draft plus a key on a child is the same choice with the draft isolated. Re-calling `init` yourself in render and passing the result to `dispatch` duplicates the initial object and still needs a condition, or it will reset on every keystroke's render.

**Common Mistakes:**

Adding `userId` to a dependency array that `useReducer` does not take. Expecting the third argument to behave like `useEffect`'s setup. Dispatching `reset` from an effect on `[userId]` and treating the extra paint of the old draft as unavoidable.

**Senior-Level Follow-up:**

`init` reads `localStorage` to restore a draft for that `userId`. What does Strict Mode change, and what does a later `userId` change restore?

On mount in development, Strict Mode calls `init` twice. Both calls must return the same state from the same storage contents, with no write. The later prop change does not call `init`, so it does not restore `"b"`'s draft. Restoration for `"b"` happens in the `reset` path or in the new mount's `init` after a key change. A storage read in the reducer runs on actions, not on the prop change, and it makes the reducer impure.

### REACT-097 — Two useState calls in one component share its render

**Difficulty:** Senior

**Category:** State

**Question:**

One component stores `theme` and `cursor` in a single `useReducer`. `theme` changes rarely. `cursor` changes on pointer moves. A teammate says splitting them into two `useState` calls will stop the theme label from re-rendering. What still runs, and which change actually separates the renders?

**Context and Constraints:**

React 18. Both values are read by JSX in the same component today. The theme label can be extracted into a child. No profile numbers are available. No `useMemo`.

**Senior Engineer's Answer:**

Any update to state in a component re-renders that component. Two `useState` calls and one `useReducer` are different slot layouts in the same function. A `setCursor` still runs the function, which still executes the theme JSX that sits in that function. Splitting the hooks does not create a render boundary. The reducer has the same boundary. It also forces one object to change together, which is useful for a protocol and useless for two values that change for different reasons.

The separation is a child that owns `cursor`. The decoration component calls `useState` for the pointer and renders the dot. The parent keeps `theme` and renders `<Decoration />` plus the theme label. A pointer move re-renders `Decoration`. It does not re-render the parent, so it does not re-render the theme label. That is colocation. If the parent must own `cursor` because something else there reads it, the theme label can be a child that receives the theme string. Wrapping that child in `memo` skips it when the string is unchanged and the parent rendered for the cursor. `memo` is justified when that child is expensive and the parent cannot shed the cursor state. It is not the first fix, and it does nothing while the label is inline in the component that called `setCursor`.

Passing the whole reducer state into the label defeats a memoized child, because every cursor action returns a new object. Pass `state.theme`, the string. The same string comparison works if the parent holds `theme` in its own `useState`. The hook choice is not the comparison.

React re-renders the component that owns the slot. Your tree puts the high-frequency slot in the component that displays it.

**Practical Implementation:**

```tsx
function ThemeLabel({ theme }: { theme: string }) {
  return <p>{theme}</p>;
}

function Decoration() {
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  return <div style={{ left: cursor.x, top: cursor.y }} />;
}

function Frame() {
  const [theme, setTheme] = useState("light");
  return (
    <>
      <button onClick={() => setTheme((value) => (value === "light" ? "dark" : "light"))}>
        Theme
      </button>
      <ThemeLabel theme={theme} />
      <Decoration />
    </>
  );
}
```

**Trade-offs and Alternatives:**

Two slots in one component are the right model when both values are cheap and the component is small. A reducer is the right model when one event must update both under an invariant. Neither model is a performance boundary. Context for `theme` is justified when distant components read it and the pointer stays out of that value. A store is justified when many readers need different slices of a fast value. Moving `Decoration` is the change that matches this question.

**Common Mistakes:**

Replacing `useReducer` with two `useState` calls and expecting the theme JSX in the same function to stop running. Memoizing the label while it closes over `cursor` from the same function, which `memo` cannot see. Keeping both fields in one context object so the split hooks are undone at the provider.

**Senior-Level Follow-up:**

`Frame` must read `cursor` to disable a button at the left edge. Where does `cursor` go?

It lifts to `Frame`, and `Decoration` receives it as a prop. `Frame` renders on pointer moves again. The theme label then needs `memo` and a theme prop that did not change, or the label moves under a parent that does not hold `cursor` and receives the theme from context or from props passed as `children`. The button's requirement is what moved the state up. The two hooks inside `Frame` still share `Frame`'s render.

### REACT-098 — useInsertionEffect runs before layout effects

**Difficulty:** Senior

**Category:** Effects

**Question:**

A CSS-in-JS library needs the component's generated rules to be in the document before a `useLayoutEffect` measures the node. Why does the library use `useInsertionEffect` instead of `useLayoutEffect` or `useEffect`? What is the hook forbidden to do?

**Context and Constraints:**

React 18 client render. The library inserts a `<style>` element. The product component measures in `useLayoutEffect`. The component is also server-rendered. You are not adopting a specific library.

**Senior Engineer's Answer:**

`useInsertionEffect` has the same setup, cleanup, and dependency arguments as `useEffect`, and it runs synchronously before any `useLayoutEffect`. The library inserts the style rules there so a later layout effect in the tree measures layout that already includes those rules. A `useEffect` insertion runs after the browser has had a chance to paint, so the measurement and the first paint can use the previous rules. A `useLayoutEffect` insertion runs in the same phase as the measurement. Layout effects run in tree and declaration order, so a measurement declared elsewhere can run before the insertion's layout effect and read the old layout. The insertion hook exists so style injection is ordered before that phase.

The hook is for that injection. It is not a third effect for fetching, subscribing, or setting state. Scheduling an update from `useInsertionEffect` is unsupported, and React warns that it must not schedule updates. Do not read layout from it. The DOM timing relative to this hook is not a measurement API. `useLayoutEffect` remains the place that reads `getBoundingClientRect` after styles are in place.

`useInsertionEffect` does not run on the server. Server HTML does not gain the `<style>` tag from this hook. A library that needs the rules in the HTML collects them during render on the server by its own path. The client hook still runs before layout effects after hydration so the client measurement matches the client styles. Using it in product code for a click subscription hides work in a phase that forbids updates and does not run on the server.

React guarantees the order relative to layout effects on the client. Your library keeps the effect body to inserting and removing style nodes, with a cleanup that removes the same nodes.

**Practical Implementation:**

```tsx
useInsertionEffect(() => {
  const style = document.createElement("style");
  style.textContent = rules;
  document.head.appendChild(style);
  return () => {
    document.head.removeChild(style);
  };
}, [rules]);
```

**Trade-offs and Alternatives:**

Product code that needs a measurement uses `useLayoutEffect` and leaves insertion to the styling system. A static stylesheet does not need either hook. `useLayoutEffect` for the insertion is the fallback only when you control every measurement and can guarantee it runs after that effect, which you cannot guarantee across components. `useEffect` is the right phase for a log that the rules were applied. It is the wrong phase for a measurement that must match this commit.

**Common Mistakes:**

Calling `setMeasured` inside `useInsertionEffect` because the style was just inserted. The measurement belongs in `useLayoutEffect`. Using the insertion hook for a window listener because it "runs earlier than `useEffect`." Fetching in it so data arrives before paint. The hook does not block on a network, and it is not allowed to schedule the render that would show the data.

**Senior-Level Follow-up:**

`rules` is a new string on every render because it embeds a generated class name that did not change. What does the effect do?

The dependency changes by `Object.is`, so React removes the previous `<style>` and inserts a new one before layout effects, on every commit. Memoizing the rule string in the library when the class and declarations are unchanged keeps the style node. That cache is the library's dependency, not a default cache around product render logic. A changing string that represents new declarations should update the node.

### REACT-099 — A hook around useContext does not select

**Difficulty:** Senior

**Category:** Custom hooks

**Question:**

`useUserName` calls `useContext(AppContext)` and returns `user.name`. `Header` and `Sidebar` both call `useUserName`. The provider value is a new `{ user, notifications }` object when a notification arrives, and `user.name` is unchanged. Which components render, and what would a real selector have to subscribe to?

**Context and Constraints:**

React 18. `AppContext` is one context. Both components stay mounted. No `useMemo` inside `useUserName`. A store is allowed only as the alternative.

**Senior Engineer's Answer:**

Both `Header` and `Sidebar` render. `useContext` subscribes the component that called it. A custom hook does not sit between the component and the context. The call inside `useUserName` runs as part of `Header`'s render and as part of `Sidebar`'s render. Each caller is a consumer of the whole value. A new object fails `Object.is`, so both run, even though the string they return is the same. The hook did not create a shared subscription, and it did not create a per-field subscription. Two callers are two consumers. They do not share a slot of state. They share the context.

Returning `user.name` from the hook filters the JavaScript value the caller sees. It does not filter the notification. `useMemo(() => user.name, [user.name])` inside the hook has the same limit: the caller has already started rendering, and the context update is why it started.

A selector has to subscribe to the name. In React 18 that means a different context whose value is the user or the name string, or `useSyncExternalStore` whose `getSnapshot` returns the cached name string and returns the same reference when the name is unchanged. A notification write then does not change the snapshot those callers read. `useContext` inside the hook cannot express that. Calling `useUserName` only when `showHeader` is true also changes `Header`'s hook count. The custom hook follows the same top-level rule as `useState`.

React subscribes at the `useContext` call, in the component that is rendering. Your hook's return value is just a value.

**Practical Implementation:**

```tsx
function useUserName() {
  return useContext(UserContext).name;
}
```

**Trade-offs and Alternatives:**

A `UserContext` whose value is the user object is the small fix when the name and the rest of the user change together and notifications are the hot field. A store snapshot of the name is the fix when the user object itself is large and only the name is needed by many readers. Props are the fix when the parent already rendered and can pass `name`. The custom hook is still worth having so the `useContext` call and the empty-user fallback live in one function. The hook is a readability boundary. It is not a render boundary.

**Common Mistakes:**

Moving `useContext` into `useUserName` and telling the profiler the header no longer depends on notifications. Adding an equality check inside the hook that returns the previous name and expecting React to skip the rest of `Header`. The function already ran. Sharing one `useUserName` call at the top of `App` and passing the string down is the actual way to subscribe once. That is lifting the read, not a property of the hook.

**Senior-Level Follow-up:**

`useUserName` also calls `useState` to store the last name, and an effect copies `user.name` into that state when the context changes. Does `Header` stop rendering on a notification?

`Header` renders because of the context change, the effect runs, and the name is often the same string so the state update bails out. The render already happened. The extra state does not unsubscribe `Header`. Split the context or subscribe to a snapshot of the name.

### REACT-100 — A null draft leaves the prop on screen

**Difficulty:** Intermediate

**Category:** Derived state

**Question:**

The field must show `email` from props until the user types, and a later `email` prop must appear while the user has not typed. It must keep a typed value across a new `email` prop. What is wrong with seeding `useState(email)` and syncing it in an effect, and what state represents "the user has not typed"?

**Context and Constraints:**

React 18. `email` is a string prop. The input is controlled. No key change and no `userId` in the first part. The entity-change case is the follow-up. No profile has justified a cache.

**Senior Engineer's Answer:**

`useState(email)` copies the prop into a slot on mount and then ignores later props. An effect that calls `setDraft(email)` when `email` changes writes over a typed draft after the render that received the new prop, so it can paint the user's text and then replace it. It also cannot tell "the user typed the same characters as the prop" from "the user has not touched the field" if the only stored value is the string on screen.

Store `string | null`. `null` means the user has not overridden the prop. The value to show is `draft ?? email`, computed during render. A new `email` prop shows up on that render while `draft` is `null`, with no effect and no second slot. `onChange` stores the typed string, including a string that happens to equal `email`, so a later prop does not wipe an explicit edit. A reset button sets `draft` back to `null`, and the prop is on screen again. There is nothing to memoize. The displayed string is a local expression.

The effect mirror has two writers for one input. The null override has one: the user, plus an explicit reset. The prop remains the source whenever the override is empty.

React renders the value you return from this expression. The initializer is not a subscription to `email`.

**Practical Implementation:**

```tsx
function EmailField({ email }: { email: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? email;
  return (
    <input
      value={value}
      onChange={(event) => setDraft(event.target.value)}
    />
  );
}
```

**Trade-offs and Alternatives:**

A fully controlled parent is better when the parent must see every keystroke. Then there is no draft slot here at all. Seeding `useState(email)` and ignoring later props is the uncontrolled-initial pattern, and it is right when a later prop must not affect the field. The null draft is the pattern when an untouched field stays linked to the prop. Comparing in `onChange` and storing `null` when the typed text equals `email` treats "matches the server" as clean. That is a product choice on top of the same slot. An effect is still the wrong writer for either choice.

**Common Mistakes:**

Storing `draft ?? email` back into state so the slot "has the value the input shows." The next prop change is then stuck behind the copied string. Using `useState(email)` and a `key` on every `email` change, which also drops the draft the user typed. Resetting to `null` in an effect on every `email` change, which clears a dirty field one paint late.

**Senior-Level Follow-up:**

`userId` changes while `draft` is `"hello"`. The new user's `email` is different. What does this field show, and what reset matches a new entity?

It shows `"hello"` on top of the new user's prop, because `draft` is still a string. The null means "not overridden," not "still the same user." Remount the field with `key={userId}` so the draft starts at `null` and the new email shows. If this component must stay mounted, set `draft` to `null` during render when `userId` differs from the previous id. That is the entity reset. The `??` expression stays the way an untouched field reads the prop.
