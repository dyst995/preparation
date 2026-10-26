# R01 — React fundamentals and internal mechanics

React 18 unless a question says otherwise. Questions REACT-001–REACT-050.

### REACT-001 — A function component is a render function

**Difficulty:** Intermediate

**Category:** Components

**Question:**

What does React treat a function component as? When does React call it, and what is the return value for?

**Context and Constraints:**

React 18, function components, app mounted with `createRoot`. The component returns JSX, `null`, or a string.

**Senior Engineer's Answer:**

React treats a function component as a function from props plus the hook state stored for that instance to a description of UI. React calls it during the render phase. The return value is a React element tree (or `null`, a boolean, a string, a number, or an array of those). That description is not a DOM node. Host DOM nodes are created and updated later, in the commit phase, and only where the description differs from what is already committed.

A single user action is not a promise that the function runs once. In development, Strict Mode calls the function twice to surface side effects. In concurrent rendering, React can start a render, abandon it, and call the function again. The body has to be pure with respect to props, state, and context: compute the description, and leave subscriptions, network, and DOM writes to event handlers and effects.

React guarantees the phase (render, possibly repeated, result used as a description). Your code guarantees purity and a stable hook order. React does not guarantee "one click, one execution."

**Practical Implementation:**

```tsx
function Greeting({ name }: { name: string }) {
  return name ? <h1>Hello {name}</h1> : null;
}
```

**Trade-offs and Alternatives:**

Function components are the model hooks and concurrent rendering are built on. Class components still render and still go through the same render and commit phases, and they still make sense while you are maintaining existing class code. New state in React 18 belongs in functions: classes do not call hooks, so they do not get `useId`, `useSyncExternalStore`, or transitions written as hooks. Rewriting a working class only to change style is a poor trade.

**Common Mistakes:**

Treating the function as a constructor that runs once at mount. Starting a fetch or a subscription in the body, where a repeated or discarded render will repeat it. Reading the returned JSX as an HTML string rather than as an element description.

**Senior-Level Follow-up:**

Why does Strict Mode call the component twice in development, and does production do that?

Strict Mode's extra render is a development check for impure render. It does not commit two trees. Production does not add that extra call. Concurrent rendering can still repeat or discard a render for scheduling reasons; that repetition is the scheduling model, and it exists in production when a render is actually interrupted.

### REACT-002 — Props are owned by the parent

**Difficulty:** Intermediate

**Category:** Props

**Question:**

Who owns a prop value? What happens if the child writes `props.title = "Edited"`, or if it does `const [title, setTitle] = useState(props.title)` and the parent later passes a new title?

**Context and Constraints:**

`title` is a string prop. The parent re-renders and passes a different string. The child is a function component that stays mounted at the same position with the same key.

**Senior Engineer's Answer:**

The parent owns the value. For one render, the child receives it as an argument. React will pass the next value the next time the parent renders that child. The child displays the current title by reading the prop during render.

Copying the prop into `useState` stores the first value only. Later renders receive a new argument and ignore it; `useState` uses the initial argument when that hook slot is created. The local state stays at the first title until something calls `setTitle`. That is state persistence, not a subscription to the prop.

Assigning `props.title = "Edited"` writes the props object for this render. In development, React freezes that object, so the assignment throws. In production it changes this render's props object and does not change the parent's state; the next parent render passes the original title again. Mutating a nested object the parent passed, such as `props.user.name`, changes the parent's object in both builds, because the development freeze is shallow. The contract is that props are read-only inputs. `props.children` is the same kind of input: whatever was nested in the JSX.

**Practical Implementation:**

```tsx
function Field({ title }: { title: string }) {
  const [draft, setDraft] = useState(title);
  // `draft` stays at the first title after the parent passes a new one.
  return <input value={draft} onChange={(e) => setDraft(e.target.value)} />;
}
```

**Trade-offs and Alternatives:**

Read the prop when the parent is the source of truth (a controlled input: parent holds the value, child calls `onChange`). Keep local state when the child owns an edited draft and the prop is only the initial value, and say that in the component's API so callers do not expect live updates. When a new entity should discard the draft, change the child's `key` to the entity id so React mounts a new instance. A controlled parent wins when validation or submit logic must see every keystroke. A keyed local draft wins when the widget owns the interaction.

**Common Mistakes:**

Expecting `useState(prop)` to track the prop. Mutating `props.user.name` and hoping the parent will re-render. Reading `props.key` to get the list id. `key` is not a prop; pass `id` separately if the child needs the id.

**Senior-Level Follow-up:**

When is storing a prop in state a real API, rather than a stale copy?

When the prop is documented as an initial value and later parent updates are defined to be ignored, the same way an uncontrolled input ignores later changes to `defaultValue`. If callers need those updates to appear, the honest API is a controlled `value` plus `onChange`, or a `key` that remounts when the source identity changes.

### REACT-003 — JSX is an element description

**Difficulty:** Intermediate

**Category:** JSX

**Question:**

What does `<Profile user={user} />` compile to, why must `Profile` be capitalized, and what does React do with `{user.name}`, `false`, `0`, and a plain object as a child?

**Context and Constraints:**

A current React 18 toolchain (the automatic JSX runtime). `user` is `{ name: "Ada" }`.

**Senior Engineer's Answer:**

JSX compiles to a call that creates a React element, a plain object describing this render. With the classic transform that call is `React.createElement(Profile, { user })`. With the automatic runtime shipped for the React 17 JSX transform, and used by current React 18 toolchains, it is `jsx` or `jsxs` from `react/jsx-runtime` (`jsxs` when there are several static children). The object carries `$$typeof: Symbol.for("react.element")`, `type`, `props`, and `key`. `$$typeof` is how React tells an element from a plain object. Creating the object does not call `Profile` and does not touch the DOM.

Capitalization chooses `type`. `<Profile />` passes the `Profile` function. `<profile />` passes the string `"profile"`, which is a host component (a DOM tag in the browser renderer). A lowercase custom component looks for an unknown HTML tag.

`{user.name}` embeds the JavaScript value. It is not HTML concatenation. Strings and numbers become text. `null`, `undefined`, and `false` render nothing, which is why `cond && <Row />` can hide a row. `0` renders the character `"0"`, so a count of zero shows up. A plain object is not a valid child. `key` is extracted by the compiler and stored on the element; it is not a field of `props`.

**Practical Implementation:**

```tsx
const element = <Profile user={user} />;
// automatic runtime, approximately:
// jsx(Profile, { user })
// element.type === Profile
// element.props.user === user
```

**Trade-offs and Alternatives:**

The automatic runtime does not require `React` in scope. The classic `React.createElement` runtime remains if the compiler option says so. Both produce the same kind of element and the same reconciliation rules. Writing `createElement` by hand is useful when the type is dynamic (`createElement(type, props)`); JSX is the readable form when the type is static. Neither runtime merges props or runs the component.

**Common Mistakes:**

Writing `class` instead of `className`, or `for` instead of `htmlFor`, because the surface looks like HTML. Using `count && <List />` when `count` can be `0`. Passing a plain object as a child and expecting React to print it. Assuming the component function ran because the element object exists.

**Senior-Level Follow-up:**

What is the difference between an element and a component?

The component is the function or class. The element is the `{ type, props, key }` object whose `type` points at that function or class. You can create many elements from one component. React runs the component while rendering an element, at a position in a parent, not at the moment the element object is allocated.

### REACT-004 — Elements, fibers, and DOM nodes

**Difficulty:** Senior

**Category:** Elements

**Question:**

Define a component, a React element, a fiber, and a DOM node. Which one holds hook state? If the module creates `const element = <Counter />` once and two different parents return that same object, do those parents share Counter state?

**Context and Constraints:**

React 18 function components. `Counter` calls `useState`. Both parents are mounted at the same time.

**Senior Engineer's Answer:**

The component is your function. The element is the description JSX produced for one render: type, props, and key. The fiber is the reconciler's object for one mounted position. It points at the type, holds the hook list and memoized state, and links to its child, sibling, and parent. The DOM node is the host object the browser shows. React creates or updates it at commit for a host component (`div`, `input`), not for `Counter` itself. `Counter`'s fiber has a child host fiber, and that child holds the DOM node.

Hook state lives on the fiber. A new element object every render is normal. Reconciliation reuses the fiber when the type and key at that position match, then applies the new props. The element object's identity is not the instance's identity.

Returning the same element object from two parents mounts two fibers. Each has its own hook state. What they share is the object: the same `type` and the same `props` reference. A later mutation of a value inside those props is visible through both positions because it is one object, not because React merged the instances.

In React 18, `ref` is not a prop on a function component. `forwardRef` receives it as the second argument. React 19 allows `ref` as a normal prop on function components; that is a later major version, and it does not change where state lives.

**Practical Implementation:**

Not applicable.

**Trade-offs and Alternatives:**

Creating elements during render is the normal path and is cheap relative to DOM work. Hoisting a constant element (`const icon = <Icon />`) avoids reallocating a subtree that never changes and is a reasonable way to pass a static child. Hoisting loses when the element closes over data that changes: every consumer of that object sees the closed-over values from the time it was created. Two mounts that should share state need the state lifted to a common parent or stored outside the tree. Reusing an element object will not do it.

**Common Mistakes:**

Saying "virtual DOM" for all four and then losing where state lives. Expecting two uses of one element object to share `useState`. Expecting a new element object at the same position to remount. Reading `props.ref` on a React 18 function component.

**Senior-Level Follow-up:**

Does a parent re-render that returns `<Counter />` again destroy Counter's state?

No, when the type and key at that position are unchanged. React updates the existing fiber with the new props. State is destroyed when the type changes, the key changes, or that position unmounts.

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

**Context and Constraints:**

React 18, `createRoot`. `onClick` is the `onClick` prop on a `<button>`. `count` comes from `useState(0)`. No `flushSync`.

**Senior Engineer's Answer:**

The log prints `0`. `count` is the value from this render, closed over by the handler. `setCount` schedules an update. It does not assign the local binding, and it does not return a promise. The next line still reads this render's snapshot. The DOM still shows `0` on that line, because commit has not run.

For a discrete event such as this click, React 18 flushes the scheduled update before it hands control back to the browser. The component function runs again after the handler returns, with `count === 1`, and commit updates the DOM before paint. From the handler's point of view the update is asynchronous: you cannot observe the new state or the new DOM on the next line. The flush is still soon — the end of this event — rather than "some later second."

React guarantees that this render's `count` stays `0` for the rest of the handler, and that the update is applied in a later render of this fiber. Your code chooses the next value. React does not guarantee a specific frame time, and a transition (a later question) is scheduled differently from this discrete click.

**Practical Implementation:**

```tsx
setCount(count + 1);
console.log(count); // 0, the snapshot this handler closed over
```

**Trade-offs and Alternatives:**

Read the next value from the event (`e.currentTarget.value`) when the DOM event already has it. Use the functional updater `setCount(c => c + 1)` when the next state depends on the previous state. Use a `useEffect` that depends on `count` when logic must run after the new value has committed. A ref updated during render can be read from an async callback without waiting for a render, and it does not cause a render by itself. The ref is the wrong tool when the UI must show the value.

**Common Mistakes:**

Expecting the log to print `1`. Awaiting `setCount` — the setter does not return a promise. Putting a `setTimeout` around a read of `count` to "wait for setState," which races the next render and can still close over `0`.

**Senior-Level Follow-up:**

`useState(expensive())` versus `useState(() => expensive())` — what runs on the second render?

The call `expensive()` is an ordinary argument. It runs on every render, and React discards the result after the hook slot exists. The function form is the initializer: React calls it when the slot is created and uses the return value as the first state. In development Strict Mode, React invokes that initializer twice to expose side effects. After mount, neither form re-reads an initializer to replace state.

### REACT-006 — useState replaces object state

**Difficulty:** Intermediate

**Category:** State

**Question:**

A component holds `useState({ a: 1, b: 2 })` and calls `setPair({ a: 3 })`. What is `b` on the next render? How does that differ from class `this.setState({ a: 3 })`?

**Context and Constraints:**

One update, inside a click handler. No other fields are written. React 18 function component.

**Senior Engineer's Answer:**

The next state is `{ a: 3 }`. `b` is gone. `useState`'s setter replaces the state for that slot with the value you pass or the value your updater returns. Class `this.setState({ a: 3 })` shallow-merges into `this.state`, so `b` would stay `2`. That merge is a class-component API. Hooks do not do it.

A merge is your code: `setPair(prev => ({ ...prev, a: 3 }))`. The spread copies one level. Nested objects stay shared until you copy them too. React stores the value you returned. It does not deep-merge, and it does not track which fields changed.

Each `useState` slot is independent. Replacing the pair does not reset a different `useState` in the same component. If the next value is `Object.is` equal to the current value, React skips re-rendering this component for that update. A freshly allocated object is a different reference, so `{ ...prev }` always counts as a change even when every field is the same.

**Practical Implementation:**

```tsx
setPair((prev) => ({ ...prev, a: 3 }));
// next state: { a: 3, b: 2 }
```

**Trade-offs and Alternatives:**

Separate `useState` slots win when the fields change independently and you do not want to copy the rest. One object wins when the fields are always passed around and updated as a single value. `useReducer` wins when the next value depends on several fields and several event types, because the transition logic lives in one function instead of several setters that must agree. A reducer still replaces the state you return; it does not add class-style merge.

**Common Mistakes:**

Expecting the class shallow merge. Mutating `pair.a = 3` and calling `setPair(pair)` with the same reference, which can bail out and leave other closures observing a mutated object. Spreading once and assuming nested state was copied.

**Senior-Level Follow-up:**

What does React guarantee about the identity of the `setPair` function across renders?

The setter identity is stable for that hook slot. You can omit it from a dependency list when it is a dependency in name only. Stability does not freeze the state value. The value still changes when an update commits a different one.

### REACT-007 — Updates in one batch run in order

**Difficulty:** Senior

**Category:** State

**Question:**

`count` is `5` in this render. Three handlers run, each entirely inside one click. What is `count` after each handler?

```tsx
function plain() {
  setCount(count + 1);
  setCount(count + 1);
}
function functional() {
  setCount((c) => c + 1);
  setCount((c) => c + 1);
}
function mixed() {
  setCount((c) => c + 1);
  setCount(count + 1);
  setCount((c) => c + 1);
}
```

**Context and Constraints:**

React 18, `createRoot`. Each function is its own click, starting again from `count === 5`. All setters are for the same `useState` slot.

**Senior Engineer's Answer:**

React queues the updates from one handler and applies them in order during the next render. A non-function value replaces the pending result with the value computed in this render. A function receives whatever the queue has computed so far and returns the next pending result.

`plain` schedules "set to 6" twice, because both expressions read `5`. The second replace stores `6`. The next render's `count` is `6`.

`functional` chains. The first updater receives `5` and returns `6`. The second receives `6` and returns `7`. The next render's `count` is `7`.

`mixed` chains, then overwrites, then chains again. The first updater returns `6`. The middle update replaces the pending state with `count + 1`, which is `6` from this render, not "whatever the queue had, plus one." The last updater receives `6` and returns `7`. The next render's `count` is `7`.

React guarantees this queue order inside the batch. Your expressions close over the render that created them. They do not close over the pending queue unless you use the updater argument.

**Practical Implementation:**

```tsx
setCount((c) => c + 1);
setCount((c) => c + 1);
// 5 → 6 → 7 in one render
```

**Trade-offs and Alternatives:**

The functional form is the right tool when the next value depends on the previous one, including when several handlers or effects might schedule updates before the next paint. Computing the next number yourself (`setCount(count + 1)`) is clear when you have a single replace and the value does not depend on other updates in the same batch. A reducer makes a sequence of named events (`incremented`, `reset`) explicit when the queue of raw setters becomes hard to read. Neither alternative changes the rule that a bare value overwrites the pending state.

**Common Mistakes:**

Expecting `plain` to finish at `7`. Expecting the middle `setCount(count + 1)` in `mixed` to mean "add one to the pending value." Logging `count` after the calls and treating that log as the queued result.

**Senior-Level Follow-up:**

If `mixed` used two different slots — `setCount(c => c + 1)` and `setFlag(f => !f)` — does one slot see the other's pending value?

No. Each slot has its own queue. They share the batch, so they commit in one render, and they do not feed each other's pending values. Derive a value from both during render (`const label = flag ? count : 0`) instead of writing one slot from the other inside the same handler.

### REACT-008 — React 18 batches outside React events

**Difficulty:** Senior

**Category:** Batching

**Question:**

In one callback, the code calls `setCount(c => c + 1)` and `setFlag(f => !f)`. Compare a React `onClick`, a `setTimeout` callback, a `fetch().then` callback, and a native `element.addEventListener("click", ...)` callback. How many renders does each produce on React 18 with `createRoot`, and what did React 17 do?

**Context and Constraints:**

Both setters run synchronously inside the callback, with no `await` between them. The app is mounted with `createRoot`. State is not wrapped in `flushSync`.

**Senior Engineer's Answer:**

On React 18 with `createRoot`, each of those callbacks produces one render. Both updates are applied, then React renders once and commits once. Automatic batching covers React event handlers, timeouts, promise callbacks, and native listeners. The screen does not pass through a state where only the count has changed.

React 17 batched updates inside React event handlers. The same pair inside `setTimeout`, a promise callback, or a native listener rendered twice: once for `setCount`, once for `setFlag`. React 18's legacy root, `ReactDOM.render`, keeps that React 17 behavior. If a timeout still renders twice, the mount path is the first thing to check.

Batching changes how many render-and-commit passes run. It does not make the current function's state variables update in place. After either setter returns, the closures from this render still hold the previous values.

**Practical Implementation:**

```tsx
setTimeout(() => {
  setCount((c) => c + 1);
  setFlag((f) => !f);
}, 0);
// React 18 createRoot: one render
// React 17: two renders
```

**Trade-offs and Alternatives:**

Automatic batching is the behavior you want for a coherent UI. React 17 code sometimes called `unstable_batchedUpdates` from `react-dom` to opt into a batch inside a timeout. On a `createRoot` app that wrapper is unnecessary for the cases above. The opt-out is `flushSync`, for the rare handler that must observe committed DOM before the next line. Splitting the two setters on purpose, so a user sees a half-updated screen, means yielding between them (`await`, a timeout, or `flushSync` around the first) — a product choice, not the default.

**Common Mistakes:**

Describing React 18 with the React 17 rule that "async setState is unbatched." Assuming `ReactDOM.render` in a React 18 bundle has automatic batching. Explaining a single render as "React merged the two state slots into one object." They stay separate slots that happen to commit together.

**Senior-Level Follow-up:**

A click handler calls `setQuery(next)` and, inside `startTransition`, `setResults(expensive(next))`. Is that still one render because it is one handler?

No. Batching groups updates of the same priority. `startTransition` marks `setResults` as a transition, which React may render and commit separately from the urgent `setQuery`, and which it may interrupt. One handler can produce more than one pass when the updates are intentionally different priorities.

### REACT-009 — An await starts a new batch

**Difficulty:** Advanced

**Category:** Batching

**Question:**

```tsx
async function onClick() {
  setA(1);
  setB(2);
  await save();
  setA(3);
  setB(4);
}
```

How many renders run on React 18 with `createRoot` if `save` resolves? How many ran on React 17? What is `a` if you remove the `await` and both pairs stay in the synchronous handler?

**Context and Constraints:**

`a` and `b` are two `useState` number slots, both initially `0`. `save` returns a promise and does not set state. The handler is a React `onClick`. No `flushSync`.

**Senior Engineer's Answer:**

The lines before `await` run synchronously inside the React event. On React 18 they are one batch: one render with `a === 1` and `b === 2`. The continuation after `await` is a separate task. `setA(3)` and `setB(4)` batch with each other and produce a second render. The result is two renders.

On React 17 the synchronous prefix is inside the React event, so it is one render. The continuation is a promise task, which React 17 does not batch, so `setA(3)` and `setB(4)` are two further renders. Three renders.

Remove the `await` and all four calls are one batch. Each slot's queue runs in order, and a later replace wins: the render sees `a === 3` and `b === 4`. There is no intermediate committed state with `a === 1`.

React guarantees those batch boundaries for `createRoot`: one synchronous turn is one batch, and the code after `await` is the next one. It does not guarantee that `save` resolving implies the second render has already painted by the time your continuation reads a DOM node.

**Practical Implementation:**

```tsx
setA(1);
setB(2);
await save();
setA(3);
setB(4);
// createRoot: render (1, 2), then render (3, 4)
```

**Trade-offs and Alternatives:**

Two renders across the await are usually what you want: show "saving" only if you set that state before the await, then show the server result after. If the prefix state is pointless work (set `a` to `1` and then to `3` with nothing to show in between), delete the prefix. If you must commit `a === 1` to the DOM before `save` reads layout, `flushSync` around the prefix does that, and it costs a synchronous render. Collapsing everything into the continuation is the right shape when the UI should change only when `save` settles.

**Common Mistakes:**

Counting four renders on React 18. Counting one render because "automatic batching batches everything in the function," including across `await`. Expecting the state variables in the continuation to already be `1` and `2` without a closure from the render that committed those values. The continuation still closed over the render that created the handler.

**Senior-Level Follow-up:**

`save` rejects before the second pair. What has the user seen, and what is a sound way to show the failure?

The first batch has already rendered `a === 1`, `b === 2`, unless you never scheduled it. The second pair does not run. Set an error value in the `catch`, in the same continuation, if the UI should leave the "in progress" state. Leaving `a === 1` on screen means the prefix update was a visible "saving" state; make that state an explicit status field so a rejection has a value to show.

### REACT-010 — flushSync commits before it returns

**Difficulty:** Advanced

**Category:** Batching

**Question:**

A click appends a row and must read that row's `getBoundingClientRect()` before any later logic in the same handler. What does `flushSync` change about batching and commit, and what does it leave unchanged about the `count` binding?

**Context and Constraints:**

React 18, `createRoot`. The new row's height is needed to position a popover in the same handler. The list is not so large that a synchronous render is known to be cheap; the handler has no measurement yet.

**Senior Engineer's Answer:**

`flushSync` from `react-dom` runs the updates inside its callback through render and commit before `flushSync` returns. After it returns, the new row is in the DOM, so a layout read sees it. Updates outside the callback are not part of that forced commit. They stay scheduled on the normal path.

The binding from this render does not change. If the callback calls `setCount(count + 1)`, a log of `count` after `flushSync` still prints the old value. The component function has run again inside `flushSync`, and that newer render has its own `count`. This handler's local is the previous snapshot. Work inside `flushSync` commits synchronously before the call returns. It is not left on the transition path to be interrupted.

React guarantees the DOM for those updates is committed before the call returns. It does not guarantee the flush is cheap. A large tree flushed here blocks the main thread the same way any synchronous render and commit does. Use it because the next imperative line must see the DOM, not because state felt "async."

**Practical Implementation:**

```tsx
import { flushSync } from "react-dom";

flushSync(() => {
  setRows((rows) => [...rows, nextRow]);
});
const height = listRef.current?.lastElementChild?.getBoundingClientRect().height;
```

**Trade-offs and Alternatives:**

`useLayoutEffect` runs after every commit that needs it and before the browser paints, which is the right place to measure and adjust layout without splitting a handler. Prefer it when the measurement can live with the committed tree every time, not only mid-handler. `flushSync` wins when the handler must read layout and then branch before it returns. Restructuring so the popover position is derived from state avoids the read. That wins when the position is a pure function of the rows. It loses when you must ask the browser for a wrapped line's height.

**Common Mistakes:**

Calling `flushSync` so the next line can read the new `count` variable. Wrapping every setter in it and disabling batching for the whole feature. Nesting it inside `startTransition` and expecting the flushed update to stay interruptible.

**Senior-Level Follow-up:**

The handler calls `flushSync` to append the row, then updates an unrelated `savedAt` outside the callback. Are those one commit?

No. The append commits inside `flushSync`. `setSavedAt` is a later update and a later render. That split is the point of the API. If the timestamp must appear in the same commit as the row, set both inside the same `flushSync` callback, or set both outside it and let the normal batch stand.

### REACT-011 — Reconciliation matches type at a position

**Difficulty:** Senior

**Category:** Reconciliation

**Question:**

A parent renders `<UserCard /><Details />` and later renders `<Details /><UserCard />`, with no keys. Does React move the existing instances? What happens to state inside them? Why does React use this rule instead of a general tree diff?

**Context and Constraints:**

Both components are function components with `useState`. They stay under the same parent. No `key` props. React 18.

**Senior Engineer's Answer:**

Without keys, React matches siblings by index. Index 0 was `UserCard` and is now `Details`, so the type at that position changed. React unmounts the `UserCard` subtree and mounts a new `Details`. Index 1 was `Details` and is now `UserCard`, so that subtree is unmounted and a new `UserCard` is mounted. State inside both is destroyed. Effects clean up and run again for the new mounts. React does not search the sibling list for a matching type and slide the old fibers into new slots. Reordering JSX without keys is a type change at each index, not a move.

The same rule applies to host components: a `div` that becomes a `span` at the same index unmounts the `div` and mounts a `span`. The same type at the same index updates props on the existing fiber and keeps state. A new element object is still an update, not a remount, when type and key match.

A general tree edit can be cubic in the size of the tree. React's reconciler uses a linear heuristic that matches how UI is written: different type means a different subtree, and identity inside a list is explicit via `key`. React guarantees that heuristic, not a minimal DOM edit script. Your tree structure decides whether a fiber survives.

**Practical Implementation:**

```tsx
// First render:  [UserCard, Details]
// Next render:   [Details, UserCard]
// Index 0 and index 1 both change type → both subtrees remount
```

**Trade-offs and Alternatives:**

Position matching is the right model for a fixed skeleton: a header slot and a body slot that do not swap types. Keys are the right model when siblings represent data that can move; that is the next question's topic. Lifting state above the swap preserves data when the subtree should remount and the data should not. Splitting into two stable slots (`<UserCard />` always at index 0) preserves the fiber when the product allows the slot to stay.

**Common Mistakes:**

Expecting React to match by component name across indexes. Expecting a reorder of two JSX lines to preserve state. Defining the child component inside the parent, so the function reference changes every render and the type never matches.

**Senior-Level Follow-up:**

The parent declares `function UserCard() { ... }` inside its own function body and returns `<UserCard />` every time. Why does `UserCard` state reset on every parent render?

Element type is compared by reference. The inner `function UserCard` is a new function each time the parent runs, so the type at that position changed. React unmounts the previous tree and mounts the new function. Declare `UserCard` at module scope (or otherwise keep a stable function reference) so the type matches and state stays.

### REACT-012 — Index keys work while order is identity

**Difficulty:** Senior

**Category:** Keys

**Question:**

A todo list renders `<TodoRow key={index} todo={todo} />`. Each row holds a draft in `useState` and an uncontrolled note input. When is an index key correct, and what breaks if the user inserts a todo at the front or sorts the list? What should the key be?

**Context and Constraints:**

Todos have stable string `id`s from the server. The row component stays the same function. React 18. The list is the set of siblings being reconciled.

**Senior Engineer's Answer:**

A key tells React which sibling is the same item across renders. Matching is among siblings at that level, not across the whole app. Index keys are correct when index and identity stay the same for as long as the row holds state: the list is not reordered, and items are not inserted or removed in front of other items. A static three-item legend with no per-item state fits. In that situation the index key matches React's default index matching.

Index keys are the wrong identity when order and identity diverge. Insert at the front and the fiber at index 0 is reused: it receives the new todo's props and keeps the draft and the uncontrolled input that belonged to the old index 0. Sort does the same. The user sees the note stick to the row position. Delete in the middle shifts later drafts onto different ids.

Use `key={todo.id}` on the element the array returns, the sibling React reconciles. A stable id lets React move that fiber with the item, including the DOM node for an uncontrolled input. Keys must be unique among these siblings. A duplicate key makes the match unreliable (development warns). A key generated during render (`Math.random()`, a new `crypto.randomUUID()` each pass) changes every time, so every row remounts, state is wiped, and the DOM is recreated.

**Practical Implementation:**

```tsx
{todos.map((todo) => (
  <TodoRow key={todo.id} todo={todo} />
))}
```

**Trade-offs and Alternatives:**

Id keys win as soon as the list can change shape and rows hold state, focus, or uncontrolled DOM. Index keys remain honest for a fixed presentational list. Generating an id when the todo is created (and storing it on the todo) beats generating one during render. If you have no id and the list is static, index is the identity you actually have. If the list later becomes editable, that choice has to be revisited. Using the title as a key fails when two titles collide or a title is edited.

**Common Mistakes:**

Treating every index key as a bug, including on a static list with no row state. Treating index keys as acceptable on a sortable list of inputs. Putting the key on a `<div>` inside `TodoRow` while the array element itself is unkeyed. Reading `props.key` inside `TodoRow` instead of passing `id`.

**Senior-Level Follow-up:**

The list is filtered to a subset and keyed by `todo.id`. Do the surviving rows keep their drafts?

Yes. Reconciliation matches the surviving keys and keeps those fibers, including hook state and the uncontrolled input. The same filter with index keys shifts indexes: a row that moved from index 2 to index 1 keeps the draft that used to live at index 1.

### REACT-013 — State stays where type and key stay

**Difficulty:** Senior

**Category:** State preservation

**Question:**

This parent toggles `isUser`. For each version, does `Panel` (or the panel that is on screen) keep its `useState`?

```tsx
{isUser ? <Panel /> : <Panel />}
{isUser ? <UserPanel /> : <GuestPanel />}
{isUser ? <Panel kind="user" /> : <Panel kind="guest" />}
{isUser ? <Panel key="user" /> : <Panel key="guest" />}
```

**Context and Constraints:**

Each of the four lines is a separate experiment. `Panel`, `UserPanel`, and `GuestPanel` are distinct component functions. All of them call `useState`. One slot in the parent, React 18.

**Senior Engineer's Answer:**

React keeps a fiber's state while that fiber stays mounted. The fiber stays when the component type and the key at that position stay the same.

The first line is one position and one type, `Panel`. Writing it in both branches does not mount two panels; only the taken branch is in the tree. Toggling `isUser` re-renders the same fiber. State remains.

The second line changes type. React unmounts `UserPanel` and mounts `GuestPanel`, or the reverse. Each starts from its initial state. Effect cleanup runs for the one that leaves.

The third line keeps type `Panel` and changes the `kind` prop. State remains. If `Panel` copied `kind` into `useState` on the first render only, the prop changes and the state does not. Read `kind` from props, or reset on purpose.

The fourth line changes the key. Different keys at one position are different fibers. Toggling unmounts one and mounts the other, so state and effects start over. That is the supported way to reset a component you want to keep as the same function.

React guarantees preservation from type, key, and position. A prop change does not reset state. Similar JSX in two branches does not create two simultaneous instances.

**Practical Implementation:**

```tsx
<Panel key={isUser ? "user" : "guest"} kind={isUser ? "user" : "guest"} />
```

**Trade-offs and Alternatives:**

One component and a mode prop wins when most state should survive the toggle. Two component types win when the trees share nothing and separate state is what you want for free. An explicit key wins when it is the same component and a different entity (a different user, a new draft). Lifting the state above the branch wins when the state must survive a type change. Choose from whether the state should survive, not from which syntax is shorter.

**Common Mistakes:**

Expecting a prop change to reset state. Expecting the first example to hold two independent states. Forgetting that a key change re-runs effects and drops focus. Resetting with a key that also changes when unrelated parent state changes, so the panel remounts on every keystroke.

**Senior-Level Follow-up:**

The key changes on `Panel`, and `Panel` renders a `textarea` with its own `useState`. Does the textarea keep its text?

No. Changing the key unmounts `Panel` and its subtree. The textarea fiber is destroyed with it. DOM focus and uncontrolled text inside that subtree go too. State that must survive the key belongs above `Panel`.

### REACT-014 — Two conditional slots are two positions

**Difficulty:** Senior

**Category:** State preservation

**Question:**

`Editor` stores a draft in `useState`, initialized from `doc.text`. The user types in document A, switches to document B, then switches back. What does the draft do in each tree?

```tsx
{tab === "a" ? <Editor doc={docA} /> : <Editor doc={docB} />}
{tab === "a" && <Editor doc={docA} />}
{tab === "b" && <Editor doc={docB} />}
<Editor doc={tab === "a" ? docA : docB} />
```

**Context and Constraints:**

`docA` and `docB` are different objects with stable ids `"a"` and `"b"`. `Editor` is one module-level function. React 18. The third snippet is a single `Editor` whose `doc` prop switches.

**Senior Engineer's Answer:**

The first tree is one position and one type. Switching the tab updates `doc` and keeps the fiber. The draft, initialized from A's text, stays in state while the props now describe B. The user sees A's draft on B. Switching back still shows that same draft, not a fresh read of `docA.text`.

The second tree is two sibling positions. One of them is `false` on any given render, and `false` renders nothing, but the two expressions are still two slots. Switching unmounts the editor that was showing and mounts the other. The draft is destroyed. Returning to A mounts a new `Editor`, and `useState(doc.text)` reads A's text again. Typed text is gone.

The third tree is the same single fiber as the first. The draft survives, and it survives attached to whichever doc is current, which is wrong if each document has its own draft.

React guaranteed fiber identity from position, type, and key. The bug in the first and third trees is the component storing a second copy of `doc.text` and never tying that copy's lifetime to the document id.

**Practical Implementation:**

```tsx
<Editor key={tab} doc={tab === "a" ? docA : docB} />
// remounts when the document changes, so the draft matches the doc
```

**Trade-offs and Alternatives:**

`key={doc.id}` on one `Editor` resets the draft when the document changes. That matches "each visit starts from the doc." Rendering both editors and hiding the inactive one with CSS keeps both drafts, because both fibers stay mounted; effects in the hidden one still run, so a subscription there stays alive. Lifting a draft per id into the parent (`Record<string, string>`) keeps both texts without a hidden tree. The hidden tree wins when the editor's internal state is large and awkward to lift. The map in the parent wins when you want unmounts to cancel effects and you still need every draft.

**Common Mistakes:**

Assuming the two branches of a ternary are two instances. Assuming `{cond && <Editor />}` in two places shares state because the function is the same. Hiding with CSS and forgetting the hidden editor's effects are still active.

**Senior-Level Follow-up:**

`Editor` is rendered under `TabPanelA`, then that tree is replaced so the only `Editor` is under `TabPanelB`. The function reference is the same. Does the draft move?

No. State is stored on the fiber at a position. Unmounting under `TabPanelA` destroys that fiber. Mounting under `TabPanelB` creates another. The function identity does not carry hook state. Lift the draft above both panels if it must survive the switch.

### REACT-015 — Render describes, commit applies

**Difficulty:** Senior

**Category:** Render and commit

**Question:**

What work happens in the render phase, and what work happens in the commit phase? Which phase can run for an update the user never sees? Where do a DOM read for layout and a subscription belong?

**Context and Constraints:**

React 18 with `createRoot`. One state update that does commit. The component is a function component.

**Senior Engineer's Answer:**

The render phase calls component functions, reconciles the element tree onto fibers, and records what commit should do. It does not mutate the DOM. In concurrent rendering this phase can be paused, restarted, or discarded. A discarded render never commits, so the user never sees it. Development Strict Mode can also call the function twice before one commit. The phase has to be pure: same props and state in, same description out, no required side effects.

The commit phase applies that finished tree. It updates the DOM, attaches refs, runs `useLayoutEffect` cleanup and setup synchronously, and then the browser can paint. `useEffect` cleanup and setup run after that paint opportunity. Commit is not interrupted to start another render. Once React starts applying this tree, it finishes that commit.

A subscription belongs in `useEffect` (or in an event handler if it is the direct result of an event), with a cleanup that undoes it. A layout read or a DOM write that must match the committed layout before the user sees the frame belongs in `useLayoutEffect`. Neither belongs in the component body. React guarantees the order: render, then commit's DOM updates, then layout effects, then a chance to paint, then passive effects. Your code guarantees the body stays pure. React does not guarantee a paint actually occurred before every `useEffect` on a busy main thread; it guarantees when the effect is scheduled relative to commit.

**Practical Implementation:**

```tsx
function Profile({ userId }: { userId: string }) {
  const label = userId.toUpperCase(); // render: derive
  return <h1>{label}</h1>;
  // fetch(userId) here would run for discarded and double renders
}
```

**Trade-offs and Alternatives:**

`useEffect` is the default for network, subscriptions, and logging because it runs after paint and does not block the frame. `useLayoutEffect` blocks paint, so it is justified when a measurement must correct the DOM in the same frame (a tooltip position, a caret). An event handler is the right place for a POST the user just submitted; an effect is the wrong place for that POST, because the effect re-runs when dependencies change and in Strict Mode's development remount. Deriving a label during render beats storing it in state and copying it in an effect.

**Common Mistakes:**

Fetching in the component body. Calling "render" the paint. Using `useEffect` for a measurement that must not flicker, so the user sees one frame of the wrong position. Assuming every re-execution of the function writes to the DOM. Commit skips host updates whose rendered output did not change.

**Senior-Level Follow-up:**

`useLayoutEffect` calls `setState`. Does the user see the first committed tree before the second?

React flushes the update from `useLayoutEffect` synchronously, before paint. The user sees the tree from the follow-up render. That is why a layout effect can correct a measurement in the same frame, and why a `setState` loop there blocks the frame. The same `setState` inside `useEffect` runs after the browser had a chance to paint the first tree, so the intermediate screen can appear.

### REACT-016 — A fiber is the unit of work

**Difficulty:** Advanced

**Category:** Fiber

**Question:**

What is a fiber, and how is it different from the element JSX just created? Why did React replace the stack reconciler with this structure? What is the `alternate` link for?

**Context and Constraints:**

React 18. Explain the architecture, not a specific internal field layout from a particular minor version.

**Senior Engineer's Answer:**

A fiber is the mutable work node for one component instance or one host node. The element is the description for the current pass (`type`, `props`, `key`) and is cheap to recreate. The fiber survives across renders. It stores the type, the pending and last-committed props, the memoized state (for a function component, the hook list), and pointers to its first child, its next sibling, and its parent (`return`). It also stores flags for what commit should do: insert, update, or delete. Hook state lives here, matched by call order, which is why the rules of hooks exist.

The pre-Fiber reconciler walked the tree with recursion and did not pause. A large update held the main thread until the walk finished, so the browser could not handle input in the middle of that walk. Fiber makes the next step an explicit pointer on the tree. React can do one unit of work, yield, and resume, or throw the in-progress tree away. That architecture is what later concurrent features use. The fiber tree exists for ordinary synchronous renders too. Fiber is the reconciler, not a synonym for `startTransition`.

React keeps two trees. The current tree matches what is committed. The work-in-progress tree is what render writes. Each fiber's `alternate` points at its twin in the other tree. When render finishes, commit swaps: work-in-progress becomes current, and the old current becomes scratch space for the next pass. If render is abandoned, the current tree stays on screen. You do not allocate or read these objects from application code. The observable consequence is the preservation rule: state follows the fiber (position, type, key), not the element object's identity.

**Practical Implementation:**

Not applicable.

**Trade-offs and Alternatives:**

There is no application setting that picks the stack reconciler in React 18. The design trade is already made: a linked unit of work, plus double buffering, so render can be repeated safely and commit can swap a finished tree. The cost is on authors: render must be pure, because React may run it and discard the result. Libraries that need a stable read of external data during that walk use `useSyncExternalStore` rather than a subscription started in the component body.

**Common Mistakes:**

Saying Fiber replaced elements. Elements are still the render description. Saying Fiber means concurrent mode is on. A small update can finish in one turn and never yield. Memorizing every internal field name and missing `alternate`, the hook list, and "commit swaps the finished tree." Trying to read fiber fields from product code.

**Senior-Level Follow-up:**

If render writes only the work-in-progress tree, why can an impure render still corrupt the screen the user already has?

Commit has not changed the DOM yet, so the corruption is not a half-applied React mutation. The impurity wrote somewhere else: a module variable, a store, `document.title`, a mutated prop object the current tree still points at. Discarding work-in-progress does not undo those writes. Purity is what makes discard safe.

### REACT-017 — Render can yield; commit runs through

**Difficulty:** Advanced

**Category:** Fiber

**Question:**

Under React 18 concurrent rendering, a transition render is in progress and the user clicks. What can happen to the in-progress render? What can happen in the middle of commit? Do effect cleanups run for a render that is thrown away?

**Context and Constraints:**

The app uses `createRoot`. The in-progress work was marked with `startTransition`. The click updates state at default (urgent) priority. React 18.

**Senior Engineer's Answer:**

Render walks one fiber at a time: begin that fiber, walk its children, complete it, and record flags. Between units React may yield so the browser can process input. A click scheduled at a higher priority than the transition can make React abandon the in-progress work-in-progress tree and start a render that includes the click. Component functions for the abandoned pass have already run. Their returned elements are discarded. The DOM still shows the last committed tree, because that pass never committed.

Commit does not yield to another React render. DOM updates, ref attachment, and `useLayoutEffect` for the finished tree run to completion. The urgent update waits until that commit finishes, then renders. Large commit work and layout effects block input even though render can be interrupted. Yielding is also a heuristic: a small render often finishes without a pause. React does not promise a yield after every fiber.

Effects are part of commit. A discarded render never ran them, so there is no effect cleanup for that pass. The previous commit's effects stay in place. If the component body subscribed or fetched during the abandoned render, React has no cleanup to call, because that work was not an effect. The legacy `ReactDOM.render` root does not provide this interruptible path. Concurrent rendering here is the `createRoot` behavior.

**Practical Implementation:**

Not applicable.

**Trade-offs and Alternatives:**

`createRoot` plus transitions lets a large render yield to input. The requirement is purity. A fully synchronous tree (no transition, work that finishes in one turn) is easier to reason about and is what you already have for a discrete click. Keep discrete input synchronous in feel by leaving the input's own `setState` urgent, and mark only the expensive follow-up as a transition. Staying on `ReactDOM.render` to avoid interruption also keeps you on the legacy batching and rendering path. The fix for a component that breaks when rendered twice is to make the render pure.

**Common Mistakes:**

Expecting a discarded render to roll back DOM changes. There were none from that pass. Expecting effect cleanup to undo a fetch started in the body. Assuming every update yields. Treating a half-finished walk as a half-updated screen. The screen changes at commit.

**Senior-Level Follow-up:**

Why does React 18 Strict Mode run effect setup, cleanup, and setup again on mount in development, if a discarded render never runs effects?

That extra cycle is a development check, not the scheduler aborting a render. On the initial mount, Strict Mode commits, runs the effect, simulates an unmount and runs cleanup, then remounts and runs the effect again. It finds subscriptions whose cleanup does not undo setup. Production mounts once. Removing Strict Mode hides the finding.

### REACT-018 — Transitions keep the keystroke urgent

**Difficulty:** Senior

**Category:** Scheduling

**Question:**

A controlled input updates `query` on each keystroke, and the same keystroke filters a 20,000-row table from `query`. Typing feels late. How do you keep the input urgent and the table interruptible in React 18? What do you give up? What does this not speed up?

**Context and Constraints:**

React 18, `createRoot`. The filter is synchronous JavaScript during render, not a network request. One state update currently does both. No measurement has been done yet beyond "typing stalls."

**Senior Engineer's Answer:**

By default both updates are urgent and, if they are the same event and the same priority, one render does both. The input cannot paint until that render and commit finish, so the keystroke waits on the table.

`startTransition(() => setQueryForTable(next))`, or `useDeferredValue(query)` when you pass `query` into a heavy child, marks the table work as a transition. React can commit the urgent input first and continue the table render at a lower priority. Another keystroke can abandon the in-flight table render and start one for the newer text. `useTransition` also returns `isPending` while the transition has not committed. The table may show rows for the previous query for one or more frames. That staleness is the trade.

This does not make the filter algorithm faster. It changes when that work can be interrupted and whether a newer update replaces an in-flight one. It does not debounce a network call. A transition is a rendering priority, not a timer and not `isPending` as a fetch status. The urgent `setState` for the input stays outside the transition. Putting the input update inside `startTransition` defers the caret.

**Practical Implementation:**

```tsx
const [query, setQuery] = useState("");
const deferredQuery = useDeferredValue(query);

return (
  <>
    <input value={query} onChange={(e) => setQuery(e.target.value)} />
    <Table query={deferredQuery} />
  </>
);
```

**Trade-offs and Alternatives:**

`startTransition` wins when you own the expensive `setState`. `useDeferredValue` wins when the heavy child takes a value you already updated, including a value from a parent you do not control. On the first render the deferred value equals the input. On updates React can render once with the previous deferred value, then render the new one as a transition. Pagination, windowing, or a cheaper filter wins when one transition render is still too expensive to finish comfortably. A debounce wins when you are limiting requests to a server. It adds a fixed delay on fast machines, which a transition does not. Measure which of those costs you actually have before picking one.

**Common Mistakes:**

Wrapping the input's `setState` in `startTransition`. Treating `isPending` as "the fetch is in flight." Expecting the transition to commit before the next line of the handler. Using a transition in place of fixing an accidental quadratic render, or in place of windowing a list that should not mount 20,000 rows.

**Senior-Level Follow-up:**

How is `useDeferredValue` different from copying the value in a `useEffect` and setting deferred state there?

The effect copy commits the urgent render, paints, runs the effect, then renders again with the new copy. That second render is ordinary urgent work, and the user can see a frame of the old table only by accident of effect timing. `useDeferredValue` participates in scheduling: the follow-up render is a transition, it can be interrupted by the next keystroke, and React can keep showing the previous value without you storing a second state slot.

### REACT-019 — Lanes are the internal priority model

**Difficulty:** Staff-Level

**Category:** Scheduling

**Question:**

An interviewer asks "what is a lane in React 18?" Answer at a level you can stand behind: what an update carries, how a render chooses work, how an urgent update and a transition interact, and which parts are public API. Do not invent the bit layout.

**Context and Constraints:**

React 18 reconciler. The question is about the scheduling model, not about quoting a specific minor version's constants.

**Senior Engineer's Answer:**

Publicly, updates have priority, and React can finish an urgent update without waiting for a lower-priority one. Internally, an update is tagged with a lane: its priority and which batch it belongs to. The root and the fibers track which lanes have pending work. A render selects a set of lanes and processes updates in those lanes. Updates in other lanes stay queued. That is how a click can commit while a transition render is abandoned and restarted, and how several transition updates can be replaced by a newer one before paint.

Discrete input (clicks, typing) is scheduled more urgently than a transition. Starvation is handled by an internal expiration heuristic that eventually runs a low-priority update more urgently. The bit assignments, how many transition lanes exist, and the timeout numbers are reconciler internals. They are not an application API, and product code should not branch on them.

What you can rely on is the public surface: `startTransition` and `useTransition`, `useDeferredValue`, and `useSyncExternalStore` for an external store read during render. The scheduler may yield between units of work by posting a continuation so the browser can process events. The host API it uses and the millisecond budget are implementation details. A small update often never yields. Batching still groups same-priority updates into a pass; lanes decide which pass that is and whether it can be interrupted.

**Practical Implementation:**

Not applicable.

**Trade-offs and Alternatives:**

Ship against the public scheduling APIs. Read the reconciler when you are debugging React or writing a library that must not tear (`useSyncExternalStore`) or must inject styles before layout (`useInsertionEffect`). Branching on internal lane numbers will break across upgrades that product code is allowed to take. Doing your own cooperative scheduling with `requestIdleCallback` for React state fights the reconciler: React will not know those chunks are one update, and you reimplement interruption badly. Use a transition for React work, and a worker or pagination when the work should leave the render path entirely.

**Common Mistakes:**

Quoting a blog diagram's bitmask as the React 18 contract. Assuming every `setState` has the same priority even inside `startTransition`. Assuming the render of a transition yields after every component. Explaining lanes as "React threads." Rendering stays on the main thread; lanes are priority groups for that work, not OS threads.

**Senior-Level Follow-up:**

Why can an external store tear during concurrent rendering, and what does `useSyncExternalStore` change?

One component can read the store during an urgent render and another during a restarted or deferred render, and both results can be committed together, showing two snapshots. `useSyncExternalStore` subscribes in a way React understands and re-reads `getSnapshot` during render. If the snapshot changed, React renders again synchronously so the tree does not commit a mix. `getSnapshot` has to return a cached snapshot; a new object on every call looks like a store that never stops changing. A subscription that only `setState`s in `useEffect` updates too late to prevent the tear.

### REACT-020 — A parent render runs child functions

**Difficulty:** Intermediate

**Category:** Rendering

**Question:**

Parent state changes. `Child` receives the same string and number props as last time and has no state of its own. Does `Child`'s function run? Does the DOM under `Child` get rewritten? What should you change first if this shows up in a profiler?

**Context and Constraints:**

React 18. `Child` is not wrapped in `memo`. The parent re-rendered because its own `useState` updated. Props are primitives.

**Senior Engineer's Answer:**

`Child`'s function runs. A parent render creates new elements for its children and reconciles them. Same type and key reuse the child fiber, and React still calls the child to learn the next description. Equal primitive props do not, by themselves, skip that call.

The call is render-phase JavaScript. Commit writes DOM for host nodes whose output changed. If `Child` returns the same host structure and the same host props, commit leaves those DOM nodes alone. The cost you pay by default is the function execution and the reconciliation walk, not a DOM rebuild.

Change the tree before you change the skipping rules. If the state that updated is only needed by a small part of the parent, move that state down so the expensive sibling is not a child of the component that renders. If the child is cheap, leave the re-render. Skip the child's render only after a profile shows it is expensive and it often receives unchanged props.

**Practical Implementation:**

Not applicable.

**Trade-offs and Alternatives:**

The default (children render with the parent) wins until a measurement says otherwise. Moving state down wins when a keystroke lives in a leaf and an expensive sibling does not need it: the sibling's function does not run, and you did not add a comparison. `memo` shallow-compares props and can reuse the last rendered output. It wins when the expensive child must stay where it is and its props are stable. The comparison has a cost, and a new object or callback prop defeats it. Windowing or splitting the expensive work wins when the child is expensive because it renders thousands of rows, which skipping one extra parent render does not fix.

**Common Mistakes:**

Reaching for `memo` and `useCallback` on every child of a `setState`. Assuming a child re-render rewrote the DOM. Lifting state to the page root so every input renders the whole page, then memoizing the entire page underneath. Wrapping a child in `memo` while passing `style={{ color: "red" }}`, which is a new object every time, so the compare fails and the child runs anyway.

**Senior-Level Follow-up:**

`Child` is wrapped in `memo` and also calls `useContext(ThemeContext)`. The provider value changes and the props do not. Does `memo` skip `Child`?

No. `memo` compares props. Context is not a prop. A consumer of that context re-renders when the value changes, including under `memo`. An intermediate `memo` child that does not read the context can skip, and React still renders the consumer below it.

### REACT-021 — Hook identity is call order

**Difficulty:** Intermediate

**Category:** Components

**Question:**

This component throws on the second render when `enabled` becomes `false`. Why?

```tsx
function Panel({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  const [open, setOpen] = useState(false);
  return <button onClick={() => setOpen((o) => !o)}>{String(open)}</button>;
}
```

**Context and Constraints:**

React 18 function component. The first render has `enabled === true`. The second has `enabled === false`. No custom hooks other than what is written.

**Senior Engineer's Answer:**

Hooks are a linked list on the fiber, matched by call order. The first render calls `useState` and stores `open` in the first slot. The second render returns before `useState`. React still walks the list and expected the same slot. The mismatch is a rules-of-hooks violation, and React throws in development: fewer hooks than the previous render.

The early `return null` is legal for the element tree and illegal for hooks. Call `useState` unconditionally, then return `null`. Conditions inside the initializer expression, or after every hook call, do not change the number of slots.

React guarantees a stable slot mapping only when the sequence of hook calls is the same every time that fiber renders. Your component has to keep that sequence. React does not match hooks by the variable name `open`.

**Practical Implementation:**

```tsx
function Panel({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  if (!enabled) return null;
  return <button onClick={() => setOpen((o) => !o)}>{String(open)}</button>;
}
```

**Trade-offs and Alternatives:**

Hooks first, then `return null`, keeps `open` while the fiber stays mounted, including across frames where the UI is `null`. Rendering a child only when enabled (`enabled ? <PanelBody /> : null`) resets `PanelBody` state on each hide, because that child unmounts. Pick the child when the hidden panel should forget its state and drop its effects. Keep the hooks in the parent when the state should survive the hidden period. A custom hook does not create a separate list. Its `use*` calls are inlined into the caller at the line you called it, so a conditional custom hook shifts every slot after it the same way.

**Common Mistakes:**

Thinking "`null` means the hooks do not count." Disabling the lint rule and shipping the conditional call. Putting `useState` inside a loop whose length changes. Naming two state variables the same in your head and expecting React to bind by name.

**Senior-Level Follow-up:**

`useAuth()` calls three hooks. The component calls `useAuth()` only when `enabled` is true, after another `useState`. What breaks?

The three inner calls occupy three slots in this fiber's list at the point `useAuth()` runs. Skipping the call shifts every hook after it and changes the length of the list. The failure is the same class as a conditional `useState`, even though the component source shows one line. Call `useAuth()` unconditionally.

### REACT-022 — The timeout closes over the render that scheduled it

**Difficulty:** Senior

**Category:** State

**Question:**

```tsx
function Example() {
  const [count, setCount] = useState(0);
  function onClick() {
    setTimeout(() => {
      console.log(count);
      setCount(count + 1);
    }, 500);
  }
  return <button onClick={onClick}>add</button>;
}
```

The user clicks three times within 500ms, before any timer fires. What is logged, what is `count` afterward, and why did the clicks not each close over a newer count?

**Context and Constraints:**

React 18, `createRoot`. No other updates. The three timers all fire after the third click, as three separate timer tasks.

**Senior Engineer's Answer:**

Each click runs a handler from the render where `count` is still `0`. The handler does not call `setCount`. It only schedules a timer, so React has nothing to flush, and there is no new render between the clicks. All three timers close over `0`.

Each timer logs `0` and calls `setCount(1)`. They are three tasks. The first commits `count === 1`. The second and third schedule `1` again. `Object.is(1, 1)` is true, so those updates bail out. The value the user is left with is `1`. Three zeros were logged.

React guaranteed that each timeout sees the snapshot from the render that created that handler, and that a click which does not set state does not re-render. The component chose a replace with the closed-over `count + 1`, which is `1` for every timer. If a timer had fired between clicks, the later click would have closed over the committed count. The 500ms overlap is what keeps all three on `0`.

**Practical Implementation:**

```tsx
setTimeout(() => {
  console.log(count); // still the closed-over snapshot
  setCount((c) => c + 1);
}, 500);
```

**Trade-offs and Alternatives:**

The functional updater fixes the final count and does not fix the log. The log reads the closure; the updater reads the queue or the latest committed state. If the three timers use `setCount(c => c + 1)`, the logs are still `0` and the final count is `3`, because each task increments the committed value (first `0 → 1`, then `1 → 2`, then `2 → 3`). If you need the timeout to see a value that changes, read a ref that you update during render, or read the value inside the updater. The ref does not render. State does.

**Common Mistakes:**

Expecting logs `0`, `1`, `2` because "each click incremented." The click did not increment. Expecting the final count to be `3` with the code as written. Assuming React 18 batching merged the three timers into one update. They are separate tasks; batching is why each individual timer callback would group its own setters, and each callback here has only one setter.

**Senior-Level Follow-up:**

Change the body to `setCount(c => c + 1)` and keep the `console.log(count)`. After the same three overlapping clicks, what is logged and what is the final count?

Three logs of `0`. Final count `3`. The log and the updater read different things: the log reads the closure, the updater receives the pending or committed state at the time React processes that update. Batching is not what produced the `3`. Sequential functional updates in three later tasks did.

### REACT-023 — Same state skips the render

**Difficulty:** Intermediate

**Category:** State

**Question:**

`count` is already `0`, and the handler calls `setCount(0)`. Does this component's function run again because of that update? What if state is `{ n: 0 }` and the handler calls `setPair({ n: 0 })`? What if it calls `setPair(pair)` after `pair.n = 1`?

**Context and Constraints:**

React 18 function component. This update is the only update. No parent render is forcing this component. Compare `Object.is`, not a deep equal.

**Senior Engineer's Answer:**

`useState` bails out when the next state is `Object.is` equal to the current state. `Object.is(0, 0)` is true, so this update does not re-render the component or its children. `Object.is(NaN, NaN)` is also true, so a `NaN` state set again to `NaN` bails out too.

`setPair({ n: 0 })` allocates a new object. `Object.is` on two different references is false, even when both fields are `0`. React re-renders. There is no deep compare.

`pair.n = 1` followed by `setPair(pair)` passes the same reference. `Object.is` is true, so React skips the render. The mutation is already visible to anything else that holds that object, including the current render. The UI can stay on the old description while the object has changed underneath it.

React guarantees the `Object.is` bailout for that update. It does not guarantee the function is never called for any other reason: a parent render still calls this component unless something else skips it. The React docs also note that in some cases React may still call the component before skipping its children; the bailout is an optimization with that caveat, and the component still has to be pure. Class `setState` did not use this bailout unless you added `shouldComponentUpdate` or `PureComponent`.

**Practical Implementation:**

```tsx
setCount(0); // count is already 0 → no re-render from this update
setPair({ n: pair.n }); // new object → re-render
```

**Trade-offs and Alternatives:**

Rely on the bailout for primitives and for stable references you intentionally keep. Return the previous state from a functional updater when nothing changed (`return prev`) so the bailout can apply. Allocating a new object to "be safe" opts out of the bailout. A deep compare in the setter is usually more work and easier to get wrong than rendering a cheap component. `memo` is a different mechanism: it compares props from the parent. It does not replace the state bailout, and the state bailout does not skip a render the parent caused.

**Common Mistakes:**

Expecting a deep compare of `{ n: 0 }` and `{ n: 0 }`. Mutating and setting the same reference, then wondering why the screen did not update. Expecting the bailout to protect a child from the parent's render. Using `===` in your own mental model for `NaN` and getting the bailout wrong: React uses `Object.is`.

**Senior-Level Follow-up:**

`setCount(c => c)` runs when `c` is `0`. Does that bail out? What if the updater returns `{ ...c }` for object state with the same fields?

The return value is compared with `Object.is` to the previous state. Returning `c` when `c` is `0` bails out. Returning a new object does not, even if every field matches. "The reducer decided nothing changed" only bails out when the value you return is the same reference (or the same primitive).

### REACT-024 — The key has to sit on the sibling

**Difficulty:** Advanced

**Category:** Reconciliation

**Question:**

```tsx
<dl>
  {items.map((item) => (
    <>
      <dt key={item.id}>{item.term}</dt>
      <dd>{item.def}</dd>
    </>
  ))}
</dl>
```

`items` can be reordered. Each definition row will later hold local state. What is wrong with this tree, and where does the key have to go? Why is a wrapper `<div>` a bad fix inside a `<dl>`?

**Context and Constraints:**

React 18. `items` have stable unique `id`s. The HTML structure should stay a description list: `dt` and `dd` as children of `dl`.

**Senior Engineer's Answer:**

The short fragment `<>...</>` accepts no key or other props. The array's immediate children are fragments without keys, so those siblings fall back to index identity. The `key` on `dt` is a key among the fragment's own children, where there is a single `dt`. It is not the list identity. Reordering `items` reuses the fragment at that index. Local state you add on the row will stick to the index. Development also warns that the list child is missing a key.

The key belongs on the element that is the direct child of the array. The explicit fragment accepts a key: `<Fragment key={item.id}>`. Reconciliation then matches `dt`/`dd` pairs by id and can move them. Keys are still only unique among these siblings, not globally.

A `<div key={item.id}>` around each pair would key the right node and would put a `div` inside the `dl`. That breaks the description-list content model and the accessibility tree (terms and descriptions should be the `dl`'s children). The keyed fragment exists so the list identity is real and the DOM stays flat.

**Practical Implementation:**

```tsx
import { Fragment } from "react";

{items.map((item) => (
  <Fragment key={item.id}>
    <dt>{item.term}</dt>
    <dd>{item.def}</dd>
  </Fragment>
))}
```

**Trade-offs and Alternatives:**

A keyed fragment keeps valid `<dl>` structure. A wrapper element is simpler when the parent is a `div` or `ul` and an extra node is fine for layout. Two maps — all the `dt`s, then all the `dd`s — keys each array and destroys the term/description pairing. Don't split the list to avoid `Fragment`. When each row is a component, put the key on the component in the map (`<Row key={item.id} />`) and let `Row` return the `Fragment`. The key on `Row` is the sibling key; a key inside `Row` does not replace it.

**Common Mistakes:**

Leaving the key on the inner `dt` only. Writing `key` on `<>`, which the syntax does not accept. Using index keys on the fragment once the list reorders and rows have state. Wrapping each pair in a `div` to silence the warning and shipping invalid description-list markup.

**Senior-Level Follow-up:**

Why can `<Fragment key={item.id}>` take a key when `<>...</>` cannot, if both are fragments?

The short syntax compiles to a fragment with no props and no key. The explicit `Fragment` component accepts `key` and `children`. That is a compile-time limitation of the shorthand. At reconciliation time a keyed fragment is a normal keyed sibling: same key and type, keep the subtree; the key changed or moved, match it among the list.

### REACT-025 — The draft followed the index, not the id

**Difficulty:** Staff-Level

**Category:** State preservation

**Question:**

A form renders 50 line items. Each row is:

```tsx
function Line({ item }: { item: Item }) {
  const [draft, setDraft] = useState(item.amount);
  return (
    <input value={draft} onChange={(e) => setDraft(e.target.value)} />
  );
}
```

The parent renders `lines.map((item, index) => <Line key={index} item={item} />)`. On blur of a row, the parent sends that row's amount and, in the `fetch` `.then`, calls `setLines(payload.lines)` and `setSavedAt(Date.now())`. `payload.lines` has the same ids in a new order and server-normalized amounts. React 18, `createRoot`.

The user had typed in the row for id `"L3"`, which was index 2. After the response, those characters appear on a different id, and the row now showing `"L3"` shows an old amount. Walk through what React did. What do you change so the draft stays with `"L3"`? What do you change instead if a normalized server amount must replace an in-progress draft?

**Context and Constraints:**

`Item` is `{ id: string; amount: string }`. Ids are stable and unique. The `.then` runs after a successful save of the blurred row. The user may still be looking at the list. No `flushSync`. Do not treat a re-render skip (`memo`) as the fix.

**Senior Engineer's Answer:**

The two setters in `.then` run in one promise callback. On `createRoot`, React batches them into one render and one commit: the new order and the new timestamp land together. Which fiber keeps the typed draft is decided by the key.

`useState(item.amount)` uses `item.amount` only when that hook slot is created. Later parent renders pass a new `item` and leave `draft` as it is. After the first keystroke, `draft` is the source of truth inside the fiber.

`key={index}` names the fiber by position. The response reorders ids. The fiber at index 2 stays index 2. It keeps the draft the user typed and receives whichever item is now at index 2. The fiber that now receives `"L3"` is a different index, with that fiber's own draft, still the amount from when that slot was created or last edited. The characters show up on the wrong id because the draft stayed on the index the key named.

Key the sibling by id: `<Line key={item.id} item={item} />`. Reconciliation moves that fiber with `"L3"`, so the draft and the input stay with that id across the sort. Do that when in-progress typing should survive a reorder.

When the server amount must replace the draft, an id key keeps the typed copy, so the server value stays unused until you reset. A key such as `` `${item.id}:${item.amount}` `` remounts when the normalized amount changes and discards focus and any other state in the row. The React 18 pattern below keeps the fiber and replaces the draft during render. React restarts that render before paint, so the committed input is the server amount. The condition has to become false on the restarted render, or it loops. Overwrite when this response is the normalization of the save the user just made. When a background refresh can land during a second edit, compare a version or `updatedAt` you define, so an older echo does not replace newer typing.

```tsx
const [draft, setDraft] = useState(item.amount);
const [prevAmount, setPrevAmount] = useState(item.amount);
if (item.amount !== prevAmount) {
  setPrevAmount(item.amount);
  setDraft(item.amount);
}
```

**Practical Implementation:**

```tsx
{lines.map((item) => (
  <Line key={item.id} item={item} />
))}
```

**Trade-offs and Alternatives:**

An id key plus local draft keeps typing across a reorder and ignores a new server amount until you reset. A controlled input (`value={item.amount}` and `onChange` writes the parent list) makes the server payload the next paint, and it also means any parent update replaces the text, including a stale response. That wins when the parent is the only source of truth and the row does not own a draft. A version key wins when a new server revision should drop every piece of row state, including focus. The during-render adjustment wins when you must replace the amount and keep the row mounted. An effect that copies `item.amount` into `draft` renders the stale draft, commits it, then updates: the user can see the old text for a frame. Lifting every draft to the parent by id also survives the reorder; it is more state at the parent and it is the right shape when the parent must submit all drafts together.

**Common Mistakes:**

Blaming the single batched render for the shifted input. Wrapping `Line` in `memo` and leaving `key={index}`. Generating a new key on each payload so every row remounts. Copying the prop into state in `useEffect`, which paints the old draft for a frame, or overwriting `draft` on every `amount` echo so a slow response replaces a newer edit.

**Senior-Level Follow-up:**

The list is keyed by `item.id`, the fiber for `"L3"` is stable, and the server amount changed. The input still shows the typed draft. Why, and which mechanism would paint the server amount without a frame of the draft?

The type and key matched, so React kept the fiber, and `useState` does not re-read its initial argument. Preservation is doing what an id key asked. Setting state during render, guarded by a comparison to the last seen server amount, restarts the render before paint, so the committed input is the server amount. A key that includes the amount remounts instead, which also shows the server amount and also resets the rest of the row.

### REACT-026 — `children` is an element the parent already created

**Difficulty:** Intermediate

**Category:** Props

**Question:**

`<Card><Counter /></Card>` renders a `Card` whose body is `<section>{children}</section>`. Who creates the `Counter` element, when does `Counter` run, and where does its state live? What is the difference between `{children}`, `{children()}`, and `<children />`?

**Context and Constraints:**

React 18 function components. `Counter` calls `useState`. `Card` receives `children` and does not call `useState` for the counter. The parent of `Card` is the component that contains the JSX `<Card><Counter /></Card>`.

**Senior Engineer's Answer:**

The parent of `Card` creates the `Counter` element while the parent is rendering. That allocation does not call `Counter`. `Card` receives the element as `props.children`, the same way it receives any other prop. Placing `{children}` in `Card`'s return value puts that element into the tree `Card` described. React then renders `Counter` at that position, under the `section`. `Counter`'s fiber and its hook state live there. The source line that wrote `<Counter />` is not the fiber parent.

`children` is whatever was nested: nothing, text, one element, an array, or a fragment. It is not always an array. For a composition slot, render it. When the data is a list you need to map, pass an `items` array. `Children.map` exists for the case where you must wrap opaque children and keep the keys React already assigned; it is a poor substitute for a real array prop.

`{children()}` is a different contract. The parent passed a function, and `Card` calls it during `Card`'s render. The call has to be pure. The elements it returns become part of `Card`'s output, and their state lives under `Card`. `<children />` is a third contract: `children` is a component type, and this JSX creates an element of that type. An element object is not a component type. A new function identity on every parent render, used as `<children />`, is a new type at that position, so state resets. An inline render prop `() => <Counter />` does not do that: `Counter`'s type stays the `Counter` function.

React guarantees that `children` is the value the parent passed for this render, and that state follows the fiber where the element is placed. Your component decides which of the three contracts it implements. React does not subscribe the slot to later parent state except by rendering again and passing a new value.

**Practical Implementation:**

```tsx
function Card({ children }: { children: React.ReactNode }) {
  return <section>{children}</section>;
}

<Card>
  <Counter />
</Card>
```

**Trade-offs and Alternatives:**

`{children}` wins for layout wrappers: the parent composes the inside, the child supplies the frame. A render prop wins when the child must pass a value back into the composition (`({ close }) => <Editor onClose={close} />`). A component prop (`Panel={Editor}`) wins when the child should choose the props and the mount. An `items` array wins when the child owns the list behavior. Hiding the slot with `{open ? children : null}` unmounts it and drops its state. Keeping it mounted and hiding it with CSS or a `hidden` attribute preserves the state and also keeps its effects alive.

**Common Mistakes:**

Treating `children` as a special React channel rather than a prop the parent created. Assuming `Counter` ran because the parent evaluated `<Counter />`. Calling `children()` when the parent passed an element, or writing `<children />` when the parent passed an element. Mapping `children` as if it were a stable array of data objects.

**Senior-Level Follow-up:**

`Card` renders `{children}` in two sibling slots. `Counter` has state. Do the two slots share that state? What if the element also carries a ref?

They do not share state. Each slot mounts its own fiber. What they share is the element object: one `type` and one `props` reference. A ref on that element cannot point at both mounts; it ends up attached to one of them. Reuse an element in two places only when both mounts are intentional and neither needs an exclusive ref.

### REACT-027 — A fragment has no host node

**Difficulty:** Intermediate

**Category:** Reconciliation

**Question:**

A component returns `<>...</>` around two elements instead of a `<div>`. What appears in the DOM? What fiber, if any, does the fragment add? In React 18, can a click handler or a ref sit on the fragment?

**Context and Constraints:**

React 18. The parent of this component renders a host node (`div`, `li`, `td`). The question is about one fragment used as a grouping construct, not about a list key.

**Senior Engineer's Answer:**

A fragment is a fiber whose type is `React.Fragment`. It has children and a place in the React tree. It has no host instance. Commit places the fragment's host descendants into the nearest host parent. The extra `<div>` you did not render is absent: no box, no extra layout, no DOM node for CSS or for a native listener.

The fragment fiber still matters to reconciliation. Its children are its own child list. State in those children follows the usual type-and-key rule under that fragment. Replacing the fragment with a `<div>`, or the reverse, changes the host structure: the wrapper's children unmount and mount under the new parent shape.

In React 18 a fragment does not take a `ref`, and it does not take `onClick`. There is no node to attach either to. Put the ref and the listener on a host child, or wrap with a host element when you need a box. React 19 allows a ref on a fragment; that is a later major version. The React 18 component cannot measure "the fragment."

`<>...</>` and `<Fragment>` are the same fiber type. The shorthand cannot carry a key or any other prop. That limitation is the compiler, and it is the whole of the difference for this question.

**Practical Implementation:**

```tsx
function Row({ term, def }: { term: string; def: string }) {
  return (
    <>
      <dt>{term}</dt>
      <dd>{def}</dd>
    </>
  );
}
```

**Trade-offs and Alternatives:**

A fragment wins when the parent host already supplies the box and an extra node would break layout or the HTML content model (`tr` inside `table`, `dt`/`dd` inside `dl`, several cells). A host wrapper wins when you need a ref, a click target, a grid item, or a CSS container. Returning an array of elements also produces multiple host children and no wrapper node; the array is flattened into the parent's child list, which is a different reconciliation shape from a fragment fiber. Use the fragment when those children are one group.

**Common Mistakes:**

Expecting `<>` to produce a DOM node you can query. Putting `onClick` or `className` on `<>` and watching the compiler reject it. Putting `ref={node}` on `<Fragment>` in a React 18 app. Wrapping table rows in a `<div>` because a fragment "felt too invisible."

**Senior-Level Follow-up:**

The component returns `<><span /></>` one render and `<div><span /></div>` the next, with no key change on the component itself. Does the `span`'s state survive?

The component fiber can survive, because its type and key did not change. The child under it changed from a fragment to a `div`. Those are different types at that child position, so that subtree remounts. State that lived on the `span` was under the fragment and is gone with it. A stable host parent around the `span` is what keeps the `span` fiber.

### REACT-028 — Two arrays are one sibling list

**Difficulty:** Senior

**Category:** Keys

**Question:**

```tsx
<div>
  {todos.map((todo) => (
    <Row key={todo.id} todo={todo} />
  ))}
  {done.map((todo) => (
    <Row key={todo.id} todo={todo} />
  ))}
</div>
```

`todos` and `done` can contain the same string id. Each `Row` holds a draft. Why do those drafts cross lists? Where do you put a boundary so an id may exist in both lists? What does a single `<>...</>` around both maps change?

**Context and Constraints:**

React 18. Ids are unique inside each array and are not unique across the two arrays. Rows stay mounted while items move between the arrays. No index keys.

**Senior Engineer's Answer:**

The `div`'s children are two arrays. React flattens arrays into the parent sibling list before matching keys. Every `Row` is a sibling of every other `Row`. Keys are unique among siblings, so `"a"` in `todos` and `"a"` in `done` are a duplicate key. Development warns. Reconciliation may reuse the fiber from the first `"a"` for the second. The draft follows that confused match.

A fragment fiber is not flattened away. It is one child, and the rows inside it are siblings of each other only:

```tsx
<div>
  <Fragment key="open">
    {todos.map((todo) => (
      <Row key={todo.id} todo={todo} />
    ))}
  </Fragment>
  <Fragment key="done">
    {done.map((todo) => (
      <Row key={todo.id} todo={todo} />
    ))}
  </Fragment>
</div>
```

`"a"` under `open` and `"a"` under `done` are different sibling lists. Each draft stays in its group. The keys on the two fragments matter when those groups themselves move. A host element or a component around each map creates the same kind of boundary, because each has its own child list.

One `<>...</>` around both maps does not split the key space. The shorthand is one fragment, and the two arrays still flatten into that fragment's single child list. You still have one sibling list and the same collision.

**Practical Implementation:**

```tsx
function Group({ items }: { items: Todo[] }) {
  return items.map((todo) => <Row key={todo.id} todo={todo} />);
}

<div>
  <Group items={todos} />
  <Group items={done} />
</div>
```

**Trade-offs and Alternatives:**

A keyed fragment keeps the DOM flat and splits identity. A wrapper component does the same and gives you a place for group state, at the cost of another fiber. A host wrapper does the same and adds a DOM node, which is what you want for two visible columns and what you do not want inside a `<dl>` or a `<tr>` group. Prefixing keys (`open:${id}`) also avoids the collision and keeps one sibling list; a move between lists is then a different key, so the draft remounts. Pick the boundary when a draft should stay with the row inside its group. Pick a prefixed key, or lift the draft by id, when the row should move between groups without losing the draft. Flattened siblings do not move a fiber from one group to the other; a shared parent and one key space can.

**Common Mistakes:**

Assuming each `.map()` has a private key space because it is a separate expression. Wrapping both maps in `<>` and expecting that to namespace keys. Ignoring the duplicate-key warning because both lists look correct on first paint. Using the fragment boundary and also expecting a row's draft to survive a move from `todos` to `done` without a shared parent.

**Senior-Level Follow-up:**

Both groups are keyed fragments, and you move todo `"a"` from `todos` to `done` without changing its id. The `Row` in the open group had a draft. Does that draft arrive in the done group?

No. The done fragment's child list gains key `"a"`, and the open fragment's child list loses it. Keys are matched inside one parent. React unmounts the open row and mounts a done row. The draft is destroyed. To keep it, render both groups' rows as one keyed sibling list, or store the draft above both groups under the id.

### REACT-029 — State does not follow an element across parents

**Difficulty:** Senior

**Category:** State preservation

**Question:**

`Editor` keeps a draft in `useState`. This board swaps which column receives `<Editor id="a" />` and which receives `<Editor id="b" />`:

```tsx
function Board({ flipped }: { flipped: boolean }) {
  return (
    <div>
      <Column title="Left">{flipped ? <Editor id="b" /> : <Editor id="a" />}</Column>
      <Column title="Right">{flipped ? <Editor id="a" /> : <Editor id="b" />}</Column>
    </div>
  );
}
```

`Column` renders `<section>{children}</section>`. After the flip, which draft does the user see in each column? What tree keeps each draft with its id?

**Context and Constraints:**

React 18. `Editor` and `Column` are module-level functions. `Editor` initializes the draft from a constant for that id and then lets the user type. No key is written in the snippet above. Both columns stay mounted.

**Senior Engineer's Answer:**

Each `Column` is a stable parent. Its `section` has one child slot. On the first render the left slot's type is `Editor` and the right slot's type is `Editor`. After the flip both slots are still type `Editor` at the same position. React reuses the left fiber and the right fiber. The left fiber keeps the draft the user typed for `"a"` and now receives `id="b"`. The right fiber keeps the draft typed for `"b"` and now receives `id="a"`. The element objects moved. The fibers did not. React matches children inside one parent. It does not search the rest of the tree for an element with the same id or the same object identity.

Putting `key={id}` on each `Editor` does not move the fiber into the other column. The left `section` used to have key `"a"` and now has key `"b"`. That is a key change at that slot, so the left editor unmounts and a new one mounts. The draft is reset, which is safer than showing `"a"`'s text on `"b"`, and it is still not a move.

Keep both editors as keyed siblings of one parent when the draft must travel with the id:

```tsx
<div>
  {(flipped ? ["b", "a"] : ["a", "b"]).map((id) => (
    <Editor key={id} id={id} />
  ))}
</div>
```

Those keys share a sibling list, so React moves each fiber with its id. The DOM node can move. The draft stays. If the columns must be separate host nodes, lift the draft to the board and key it by id in data, then let either column render the value.

**Practical Implementation:**

```tsx
{(flipped ? ["b", "a"] : ["a", "b"]).map((id) => (
  <Editor key={id} id={id} />
))}
```

**Trade-offs and Alternatives:**

One sibling list plus an id key wins when the widget's internal state should move with the entity and the entities can share a parent. Separate parents win when the columns are different subtrees (virtualization, different scroll containers) and a remount on move is acceptable. Lifted state wins when both columns must show the same draft, or when a remount would drop something the product must keep. Hiding an editor with CSS in the old column and mounting another in the new one keeps the old state and also keeps the old effects; it does not transfer the fiber.

**Common Mistakes:**

Expecting the JSX expression `<Editor id="a" />` to be the instance. Expecting `key={id}` to find the matching fiber in a different parent. Reading a successful reorder inside one `.map()` as proof that any rearrangement preserves state. Resetting by changing parents and then being surprised the draft is gone.

**Senior-Level Follow-up:**

Both editors are keyed siblings of one `div`, and that `div` is replaced by a `section` that renders the same keyed editors. Do the drafts survive the change of host parent?

No. The host type at that position changed from `div` to `section`, so that fiber and its child fibers unmount. Keys on the editors are matched among the children of whichever host parent exists. They are not a global id. A stable host parent, with only the editor order changing, is what lets the keyed move preserve state.

### REACT-030 — Context updates consumers; passed children bound the rest

**Difficulty:** Senior

**Category:** Context

**Question:**

`ThemeProvider` holds `theme` and renders `<ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>`. `App` renders `<ThemeProvider><Layout /></ThemeProvider>` and does not hold `theme`. `Layout` does not call `useContext`. `Title` inside `Layout` does. When `setTheme` runs, which of these functions run? What changes if `value={{ theme }}` and `theme` is unchanged? What changes if `App` holds `theme` and writes `<ThemeContext.Provider value={theme}><Layout /></ThemeContext.Provider>` itself?

**Context and Constraints:**

React 18. `theme` is a string. `Layout` is not wrapped in `memo`. One `setTheme` from a control inside `ThemeProvider`. No other state updates.

**Senior Engineer's Answer:**

`useContext(ThemeContext)` subscribes that component to the provider value. React re-renders a consumer when the new value fails `Object.is` against the previous value. `Title` runs. Components between the provider and `Title` do not have to run for `Title` to see the new string. Context is not a prop that `Layout` must forward.

In the first tree, `setTheme` updates state in `ThemeProvider`, so `ThemeProvider` runs. `children` is the element `App` created. `App` did not run, so that element is the same reference as last time. `Layout` is placed through `{children}`. React reuses that subtree and does not call `Layout`. `Title` still runs, because it consumes the context whose value changed. The passed-children slot is the boundary: the provider can update without the parent of the provider running, and descendants that do not read the context are skipped. Descendants that read it are not skipped.

`value={{ theme }}` allocates a new object every time `ThemeProvider` runs. `Object.is` on two objects is false even when both `theme` fields are `"light"`. Every consumer runs whenever the provider runs, including a run caused by unrelated state in `ThemeProvider`. A string `value={theme}` compares by value. An object value needs a stable reference when its fields did not change. `useMemo` is the ordinary way to keep that object. It is not a different context mechanism.

If `App` holds `theme` and renders both the provider and `<Layout />`, `setTheme` runs `App`. `App` creates a new `Layout` element. `Layout` runs because its parent rendered it. That cost is the parent render. It is not "context re-rendered the whole tree." A consumer would also run because the value changed. A non-consumer runs only because `App` rendered it.

`memo` on `Title` does not block the context update. `memo` compares props. Context is not a prop. `memo` on `Layout` can skip `Layout` when its props are unchanged; a consumer under it still runs when the value changes.

**Practical Implementation:**

```tsx
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState("light");
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}
```

**Trade-offs and Alternatives:**

A string or number value wins when that is the whole context: `Object.is` does the right thing with no extra cache. An object value wins when consumers need several fields together, and the object must be cached or every provider render wakes them. Splitting two independently changing values into two providers wins when a consumer of one should not run for the other. That is still the same subscription rule, applied twice. Colocating state so the provider's parent does not render the heavy tree wins before any cache. This is the render boundary. Selectors, external stores, and subscriptions outside React are a later topic.

**Common Mistakes:**

Saying a provider update re-renders every descendant. Saying a provider update re-renders only the consumers, while `App` is the component calling `setTheme` and writing `<Layout />` in its own return. Passing `value={{ theme }}` and then wrapping consumers in `memo` to stop the updates. Expecting `memo` on the consumer to ignore a changed context value.

**Senior-Level Follow-up:**

There is no provider above `Title`, and `createContext("light")` supplied the default. A parent renders `<ThemeContext.Provider value={undefined}>`. What does `useContext` return?

`undefined`. The default is used only when no provider is above the consumer. A provider whose value is `undefined` is still a provider. Nearest provider wins, including a provider that passes `undefined` on purpose.

### REACT-031 — Strict Mode's extra render stays in development

**Difficulty:** Senior

**Category:** Rendering

**Question:**

A function component is mounted under `<StrictMode>`. In development it logs from the function body, from a `useState` initializer, from a `setState` updater, and from a `useEffect`. How many times does each run, and what does the user see committed? What does a production build do? How is this different from a transition render that React abandons?

**Context and Constraints:**

React 18, `createRoot`. Strict Mode wraps this subtree. The effect has a cleanup. The updater is `setCount(c => c + 1)` from one click. No `flushSync`.

**Senior Engineer's Answer:**

Strict Mode's extra work is a development check. It is removed from production builds. Inside the wrapped subtree, React calls the component function twice in development so an impure render is visible. It calls the `useState` initializer, `useMemo` and `useReducer` functions, and state updater functions twice, and it keeps one result. A pure updater still advances the count once per click. An updater that pushes into an existing array shows the corruption twice.

On the initial mount, React also runs effect setup, then cleanup, then setup again. That extra cycle is there so a missing cleanup is visible immediately. The state from the first initialization is restored across that simulated remount; the check is "can this effect be torn down and set up again," not "allocate a second independent counter." Ref callbacks get the same kind of extra detach-and-attach in development. Event handlers are not double-invoked. One tree is committed. The user does not see two counters.

Production mounts once, runs the body for that render, runs a pure updater once per scheduled update, and runs effect setup once. A double fetch or a double subscription in production is your effect or your handler, not Strict Mode.

An abandoned transition is a different mechanism and it exists in production. React started a render, the work was interrupted, and that pass never committed. No effect cleanup runs for a pass that never committed. Strict Mode's effect cycle does commit the setup and the cleanup on purpose, in development, on mount. Removing Strict Mode to silence a double log hides the finding. Fix the impurity or the missing cleanup.

**Practical Implementation:**

```tsx
function Counter() {
  const [count, setCount] = useState(() => 0);
  useEffect(() => {
    const id = subscribe(count);
    return () => unsubscribe(id);
  }, [count]);
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>;
}
```

**Trade-offs and Alternatives:**

Leave Strict Mode on in development. The double render is cheaper than shipping an effect that leaks a subscription, and the production bundle does not pay the extra cycle. A component that must talk to an API which is not idempotent belongs in an event handler or in an effect with a real cleanup, not in the body and not in the initializer. Guarding a subscription with a module-level flag to survive the double mount will also block the legitimate remount the check is rehearsing. If a third-party widget cannot tolerate the development remount, isolate it and treat that as a bug in the widget's setup/cleanup, not as a reason to drop Strict Mode for the app.

**Common Mistakes:**

Explaining a double log in production as Strict Mode. Removing the effect cleanup because "Strict Mode is noisy." Expecting the click handler to run twice. Expecting the committed count to increase by two because the updater ran twice. Treating an interrupted transition and the development remount as the same feature.

**Senior-Level Follow-up:**

The initializer calls `fetch` and stores the promise in state. In development, how many requests start, and how many state slots hold the result?

The initializer runs twice, so two requests start. React keeps one return value in the one state slot and ignores the other. The ignored call has already started its request. Initializers and updaters are the wrong place for network IO. Start the request in an effect with an abort on cleanup, or in the handler that represents the user's action.

### REACT-032 — `createRoot` is a different root from `ReactDOM.render`

**Difficulty:** Senior

**Category:** Roots

**Question:**

A React 18 app still mounts with `ReactDOM.render(<App />, container)`. Which React 18 behaviors does that tree not get? What is the supported mount, update, and unmount sequence? Where does server HTML change the choice?

**Context and Constraints:**

The package is React 18. One container in the document. Compare the legacy root API with `react-dom/client`. Hydration details that are only about mismatches belong in the hydration question; here, name which API you call.

**Senior Engineer's Answer:**

`ReactDOM.render` and `ReactDOM.hydrate` are legacy in React 18. Using them warns and runs that tree in React 17 mode. A legacy root does not get the React 18 concurrent renderer. Updates inside timeouts, promises, and native listeners are not batched. A transition does not get an interruptible render. New React 18 root behavior, including the consistent discrete-effect flush, is defined on the new root.

The supported client mount is:

```tsx
import { createRoot } from "react-dom/client";

const container = document.getElementById("root");
if (!container) throw new Error("missing #root");
const root = createRoot(container);
root.render(<App />);
```

Create the root once for that container. Later updates call `root.render(<App tab={next} />)` on the same object. That replaces the React tree React manages in the container and follows the normal update path. `root.unmount()` removes that tree. `ReactDOM.unmountComponentAtNode` is the deprecated pair of the legacy API.

`render` does not take a callback. The old third argument is gone because a callback cannot mean "the tree is fully committed" once Suspense can leave parts pending. An effect in the tree, or the caller of `flushSync` when you truly need the DOM before the next line, is the replacement. `createRoot`'s second argument is an options object (`onRecoverableError`), not JSX. JSX passed there is not a render.

`createRoot` expects a container whose existing children are not server HTML you meant to attach to. `root.render` replaces what is in the container. Server-rendered markup uses `hydrateRoot(container, <App />)`, which creates the root and does the first render in one call. Calling `createRoot` again on every parent update leaks roots and throws away the previous tree's identity instead of updating it.

**Practical Implementation:**

```tsx
import { createRoot } from "react-dom/client";

const root = createRoot(container);
root.render(<App />);
// later
root.render(<App tab="settings" />);
// when the host node is going away
root.unmount();
```

**Trade-offs and Alternatives:**

`createRoot` is the React 18 default. The legacy API exists so an upgrade does not have to flip every tree in one commit. Leave a tree on `ReactDOM.render` only as a temporary boundary, and expect React 17 batching and synchronous rendering there. A second React root on the page is legitimate when a host page owns the document and your widget owns one empty node. It is a separate tree, with its own batching and its own context. It is not a child update. `hydrateRoot` is the alternative only when the HTML was produced by a matching server render.

**Common Mistakes:**

Calling `createRoot(container)` inside a function that runs on every update. Passing `<App />` as the second argument to `createRoot`. Keeping `ReactDOM.render` and expecting promise updates to batch. Using `createRoot` on a node full of server HTML and treating the wiped markup as hydration. Waiting for a `render` callback that the new API does not accept.

**Senior-Level Follow-up:**

The same click handler updates state in two different `createRoot` trees. Are those updates one render?

No. Each root has its own tree, its own render, and its own commit. Batching groups updates inside a root. It does not merge two roots into one fiber tree. One root's context and error boundaries do not cover the other. They can both flush while that click is being processed, and they still commit separately. A legacy root and a `createRoot` on the same page do not share a batch either.

### REACT-033 — The same props object skips the child

**Difficulty:** Senior

**Category:** Rendering

**Question:**

`Frame` holds a `count` and returns `<section>{children}</section>`. Its parent renders `<Frame><Heavy /></Frame>` and does not re-render when `count` changes. `Heavy` is not wrapped in `memo`. Does `Heavy`'s function run on `setCount`? Why does a parent that instead writes `<Heavy n={1} />` on its own re-render behave differently, even when `n` is still `1`? What happens if `Frame` mutates a field on the `children` element and passes that same object through?

**Context and Constraints:**

React 18. `Heavy` has no pending state update of its own and does not read context. Compare object identity, not a deep compare, unless the question says `memo`.

**Senior Engineer's Answer:**

`setCount` re-renders `Frame` only. `children` is the element object the outer parent created for `Heavy`. That parent did not render, so the object reference is unchanged. The props object on it is the same reference React reconciled last time. With no update of its own and no context change, React skips calling `Heavy` and reuses the subtree it already produced. The host DOM under `Heavy` stays as it was. `Heavy`'s state stays, because the fiber stays.

A parent that evaluates `<Heavy n={1} />` during its own render allocates a new element and a new props object every time. The `n` field is the same number. The props reference is not. The referential skip does not apply. `Heavy`'s function runs. Commit still updates only the host props that changed, so a same-looking `<p>{n}</p>` does not rebuild the DOM node. The cost is the function and the reconciliation walk.

Mutating a field on the existing element or on an object inside its props, then passing that same reference, keeps the referential skip. `Heavy` does not run. The mutation is already on the object. The committed UI can still show the previous description. The skip is about the reference React was given, not about a deep read of the fields.

This is a different bailout from `setState` with a value `Object.is` already holds. That one belongs to the component's own update. The docs allow that React may still call the component and then skip its children. The props-reference skip is the child not being entered. Neither bailout is a license to put a side effect in the body. Strict Mode, a real prop change, and a parent that creates a new element will call the function.

**Practical Implementation:**

```tsx
function Frame({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  return (
    <section>
      <button onClick={() => setCount((c) => c + 1)}>{count}</button>
      {children}
    </section>
  );
}
```

**Trade-offs and Alternatives:**

Passing `children` from a parent that does not hold the fast-changing state is the skip you get without `memo`. It wins for a heavy subtree beside a local counter, a theme control, or a text field. It loses the moment the outer parent re-renders and creates a new child element: the reference changes and `Heavy` runs. `memo` is the tool when the parent must re-render and the new props are shallowly equal. Moving the state down wins when the heavy sibling does not need to be a child of the component that updates. Cloning the element with `cloneElement` produces a new props object and defeats the reference skip on purpose, which is what you want when you are adding a prop and what you do not want when you hoped to reuse the subtree.

**Common Mistakes:**

Expecting every `<Heavy n={1} />` with equal fields to skip, with no `memo`. Mutating `children`'s props and expecting the child to render the mutation. Putting a fetch in `Heavy` and relying on this skip to run it once. Writing `<div><Heavy /></div>` inside `Frame`, which creates a new `Heavy` element every time, and then blaming the `div` for a skip that the new element already lost. `<div>{children}</div>` still skips `Heavy` when `children` is that same element; the `div` is the node that updates.

**Senior-Level Follow-up:**

`Heavy` is skipped by the same `children` reference, and it calls `useContext(ThemeContext)`. The provider value changes in an ancestor. Does `Heavy` run?

Yes. The context subscription is an update for that fiber. The props reference can stay the same and the consumer still renders. A component between the provider and `Heavy` can skip. It does not shield `Heavy` from the context `Heavy` reads.

### REACT-034 — A new prop reference defeats `memo`

**Difficulty:** Senior

**Category:** Rendering

**Question:**

`Heavy` is wrapped in `memo`. Its parent re-renders and passes the same `title` string, plus `options={{ dense: true }}`, `onSelect={() => select(id)}`, and a child `<Icon />`. Which of those props still let `Heavy` skip? What does a custom compare function's `true` mean? What fails if the parent mutates `options.dense` and passes the same `options` object?

**Context and Constraints:**

React 18. The default compare is in play unless the question says otherwise. `Heavy` has no context subscription and no state update of its own. The parent did render.

**Senior Engineer's Answer:**

`memo` shallow-compares the next props object to the previous one. Each field is `Object.is`. `title` is the same string, so that field matches. `options={{ dense: true }}` is a new object every parent render, so the compare fails and `Heavy` runs. `onSelect={() => select(id)}` is a new function every parent render, so the compare fails. `<Icon />` is a new element object in `children` every parent render, so the compare fails. Any one of those is enough. `memo` does not deep-compare `options`, and it does not look through `children` to see that `Icon` would have rendered the same output.

The parent still ran. `memo` only skips `Heavy` and, when the skip succeeds, the subtree `Heavy` last returned. It does not skip a consumer of a changed context inside `Heavy`. It does not skip `Heavy` if `Heavy` scheduled its own `setState`.

A custom compare `(prev, next) => boolean` returns `true` when the props are equal and the render should be skipped. That is the opposite of `shouldComponentUpdate`, which returns `true` when the class component should render. Mixing them up inverts every update.

If the parent mutates `options.dense` and passes the same object, `Object.is` on `options` succeeds. `memo` skips. The child keeps showing the previous density. The bug is the mutation. A deep compare would notice this particular field change and would cost a walk on every parent render, including the renders where nothing changed. The update that works with the default compare is a new `options` object when `dense` changes, and a stable `options` object when it does not.

**Practical Implementation:**

```tsx
const Heavy = memo(function Heavy({ title }: { title: string }) {
  return <h2>{title}</h2>;
});
```

**Trade-offs and Alternatives:**

`memo` wins after a profile shows `Heavy` is expensive and its parent re-renders with props that are usually shallowly equal. A stable callback from `useCallback`, and a stable options object from `useMemo` or from module scope, are what make that compare succeed. They are overhead on a cheap child. Passing `children` from a parent that did not re-render avoids the new element without `memo`. Splitting the parent so the state that changes is not above `Heavy` removes the render instead of skipping it. A custom deep compare wins only for a prop you do not control and cannot keep stable, and it is the wrong default for application components. `PureComponent` is the class form of the same shallow prop and state compare.

**Common Mistakes:**

Wrapping every child in `memo` and allocating a new lambda for each one. Forgetting that `children` is a prop and that `<Heavy><Icon /></Heavy>` changes it every time. Returning `true` from a custom compare to mean "please render." Mutating a prop and treating a skipped render as a React bug. Expecting `memo` to skip the parent that rendered `Heavy`.

**Senior-Level Follow-up:**

The compare returns `true` for every call, including when `title` changes. What does the user see, and which bug report is wrong: "`memo` is broken" or "the compare is"?

The user sees the previous `title`. React did what the compare asked and reused the last render. The compare is wrong. The default shallow compare would have seen a new `title` string and rendered. A compare that ignores a field is a stale UI, not a reconciler failure.

### REACT-035 — A list can hold different component types

**Difficulty:** Senior

**Category:** Reconciliation

**Question:**

A feed renders blocks with stable ids. The element at each id is `TextBlock`, `ImageBlock`, or `PollBlock`, chosen from `block.kind`. Each block component holds local state (a draft, a zoom level, a selected option). What happens when `kind` for id `"b"` changes from `"text"` to `"poll"` and the key stays `"b"`? What happens with no keys if an `ImageBlock` is inserted at index 0 in front of two `TextBlock`s?

**Context and Constraints:**

React 18. The three components are three module-level functions. Ids are unique among the feed's siblings. Insertion and kind changes are state updates in the parent, then one render.

**Senior Engineer's Answer:**

React matches the list by key, then requires the type at that match to be the same function. Key `"b"` still finds the previous fiber, and the type is now `PollBlock` instead of `TextBlock`. Different type means that subtree unmounts and a new one mounts. The draft inside `TextBlock` is destroyed. `PollBlock` starts from its own initial state. That is the correct outcome: a poll is not a text block with different props. Preserving the draft across that change would be preserving state for a widget that left the tree.

```tsx
{blocks.map((block) => {
  if (block.kind === "image") return <ImageBlock key={block.id} block={block} />;
  if (block.kind === "poll") return <PollBlock key={block.id} block={block} />;
  return <TextBlock key={block.id} block={block} />;
})}
```

The key sits on the element the array returns, which is already the typed component. A `const View = views[block.kind]; return <View key={block.id} />` is the same rule. `View` is the type. If `views[block.kind]` is a different function, the type changed.

Without keys, matching is by index. Insert an `ImageBlock` at index 0 in front of two text blocks. Index 0 was `TextBlock` and is now `ImageBlock`, so it remounts. Index 1 is still `TextBlock`, so that fiber is reused for whichever text block is now at index 1. The draft that belonged to the old index 1 is now showing on the block that slid into index 1. Index 2 mounts a new `TextBlock`. Same-type neighbors keep the wrong row's state. The new type at the front is not the only damage.

A kind change with a stable key remounts that one block and leaves the other ids on their fibers. That is the point of the key. The type check is what stops a text draft from appearing inside a poll that reused the id.

**Practical Implementation:**

```tsx
{blocks.map((block) => {
  const View = block.kind === "image" ? ImageBlock : TextBlock;
  return <View key={block.id} block={block} />;
})}
```

**Trade-offs and Alternatives:**

A different component per kind wins when the state and the tree share nothing. One component and a `kind` prop wins when the state should survive the switch; a prop change does not reset state, so you must handle the new kind explicitly. A key that includes the kind (`${block.id}:${block.kind}`) also remounts on a kind change and reads clearly at the call site. It remounts even if you later point both kinds at the same function. Lifting the draft to the feed, keyed by id in data, survives a type change and also survives a remount you did not plan. Use that when the draft is user data. Use local state when the draft is widget state that should die with the widget.

**Common Mistakes:**

Expecting the same id to preserve state across two component functions. Using no keys because "the id is already a prop." Rendering `<div key={block.id}><View /></div>` and assuming the inner type change is isolated: the `div` fiber survives, and the child type change still remounts `View`, which is what you want for the widget and easy to misread as the key having failed. Treating index matching as safe because every row is "a block."

**Senior-Level Follow-up:**

`TextBlock` and `ImageBlock` both return a `<article>`, and the kind changes under the same key. Does the article DOM node survive because the host type is the same?

No. The component type changed, so React unmounts the whole previous subtree, host nodes included, and mounts the new component's article. Host types are compared at their own position in the new tree. They are not matched against the previous component's DOM. The new article is a new node. Focus and widget state inside the old subtree are gone.

### REACT-036 — The input shows the value from this render

**Difficulty:** Intermediate

**Category:** Inputs

**Question:**

An `<input>` is rendered with `value={text}` and `onChange` stores `e.target.value` in state. Who owns the text the user sees after commit? What happens if `onChange` is omitted? How is that different from `defaultValue={text}`? What changes if a later render passes a new `defaultValue` and the user has typed?

**Context and Constraints:**

React 18 function component. One text input. This is the ownership model, not validation, form libraries, or submit handling. `text` starts as `""`.

**Senior Engineer's Answer:**

`value={text}` is a controlled input. This render's `text` is the source of truth. Commit writes that string to the DOM node's value. The user sees what React just rendered, not a private copy the input kept.

`onChange` runs from the input event, after the browser has applied the keystroke to the DOM. The handler's job is to call `setText` with the next string. The following render passes that string back down, and commit writes it. If the handler does not update the state that `value` reads, React puts the DOM value back to the last rendered string. The keystroke does not stick. Development warns when `value` is set and there is no `onChange`: the field is read-only. `readOnly` is the prop for a value you intend to display and not edit.

`defaultValue` is uncontrolled. React uses it as the initial DOM value when the node mounts, and then the DOM owns the text. Later renders that pass a different `defaultValue` do not push it into the node. You read what the user typed from a ref in a handler, not from render state, unless you lift the value. The component function does not see keystrokes by itself, because nothing called `setState`.

Switching one mounted input from uncontrolled (`value` omitted or `undefined`) to controlled (`value` a string), or the reverse, warns in development. Pick one for the life of that node. `value=""` is controlled and empty. `value={maybe}` with `maybe` sometimes `undefined` is the accidental switch. Use `value={maybe ?? ""}` when the field is controlled and the empty string is the empty state. A checkbox uses `checked` the same way `value` is used on a text input. The ownership rule is the same.

Changing the input's `key` remounts it. A controlled field then shows whatever state you initialize. An uncontrolled field applies `defaultValue` again because the node is new, and it drops focus.

**Practical Implementation:**

```tsx
function Search() {
  const [text, setText] = useState("");
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
    />
  );
}
```

**Trade-offs and Alternatives:**

Controlled wins when React state must match the field on every keystroke: disabling a button, filtering a list, sharing the string with a sibling. Uncontrolled wins when the DOM can own the text until submit and you do not want a render per character. `defaultValue` plus a key wins when a new entity should replace the text by remounting. A parent that passes `value` and ignores `onChange` wins only for a read-only display, and `readOnly` should say so. This choice is the source of truth. It is not a form framework.

**Common Mistakes:**

Writing `value={text}` with an `onChange` that updates a different variable, then watching the field refuse keystrokes. Using `defaultValue` and expecting a later prop change to appear. Reading the input's DOM value during render to "stay in sync" with an uncontrolled field. Passing `value={null}` and hitting the warning that `value` should not be `null`. Mixing `value` on the first render and omitting it after data loads.

**Senior-Level Follow-up:**

The handler does `setText(e.target.value)` and also reads `e.target.value` for a character count it stores in a ref. Is that DOM read allowed?

Yes. It happens in the event handler. The event is real, the node is the committed input, and the browser has already applied this keystroke. The read is not an input to render. Storing it on a ref does not schedule a render. If the count must appear on screen, put it in state from the same handler.

### REACT-037 — Render does not read the DOM

**Difficulty:** Senior

**Category:** Render and commit

**Question:**

A tooltip computes `const top = ref.current?.getBoundingClientRect().top ?? 0` in the component body and renders `style={{ top }}`. Why is `top` wrong on the first render, wrong again after the node moves, and unsafe on the server? Where does a layout read belong, and what does the user see if that read calls `setState`?

**Context and Constraints:**

React 18, `createRoot`. The component may also render on the server. The ref is `useRef<HTMLDivElement>(null)` on the tooltip's own node. No measurement library.

**Senior Engineer's Answer:**

Render turns props, state, and context into a description. It does not inspect the document. The DOM that exists during render is the last commit, or nothing. `ref.current` is filled in commit, before `useLayoutEffect`. On the first render the ref is still `null`, so `top` is `0`, and that `0` is what gets committed. Nothing in that path schedules another render when the node later has a real box.

On an update, `ref.current` still points at the node from the previous commit while the function is running. `getBoundingClientRect()` reports the old position. Commit then applies the new `top`, which moves the node. The description and the layout you just read are one frame apart, and they stay apart until some other update renders again. A render React discards has the same problem and a worse one: if you wrote the measurement into a module variable, the discard does not undo the write.

The server has no `document` and no box. Touching `document` or `window` during render throws there, or it forces a client-only branch that will not match the HTML. `getBoundingClientRect` also forces layout. Doing it in render couples a pure pass to a side effect on the browser's layout.

Read layout in `useLayoutEffect` (or `useLayoutEffect` plus a ref callback that only records the node). The DOM for this commit is updated, paint has not happened, and `setState` from that effect flushes before paint. The user sees the corrected `top`. The same `setState` in `useEffect` runs after the browser had a chance to paint the `0`, so the tooltip can flash. An event handler is the right place to read the DOM when the read is "what did the user just do," because the event already happened against the committed tree.

Render may run more than once and may not commit. A layout read is not idempotent in the way a description must be. Keep it in commit-phase layout code.

**Practical Implementation:**

```tsx
function Tooltip({ label }: { label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);
  useLayoutEffect(() => {
    setTop(ref.current?.getBoundingClientRect().top ?? 0);
  }, [label]);
  return (
    <div ref={ref} style={{ top }}>
      {label}
    </div>
  );
}
```

**Trade-offs and Alternatives:**

`useLayoutEffect` wins when a wrong position would be visible for a frame. It blocks paint, so a large measurement there delays the frame. `useEffect` wins for reads that can wait (logging a size, notifying an analytics listener). A callback ref wins when you need the node at the moment React attaches it and you do not want the read in the body. CSS (`position`, `anchor`, a popover) wins when the browser can place the tooltip without React storing `top`. The layout effect in the snippet can loop if `setTop` always produces a new object; store a number and skip the update when `Object.is` would already bail out, or set state only when the measured pixel changed.

**Common Mistakes:**

Reading `ref.current` in the body and calling it "the node this render created." Reading `document.getElementById` during render and then rendering from that. Measuring in render on the server. Using `useEffect` for a position and shipping the flash. Calling `getBoundingClientRect` in render because it "only reads."

**Senior-Level Follow-up:**

The effect is correct, and the component also branches on `typeof window !== "undefined"` in the body to choose a different width. What breaks if this tree is server-rendered and then hydrated?

The server description and the first client description disagree. Hydration expected the server HTML. A `window` branch in render is a client-only description, which is the mismatch. The layout effect can adjust after the tree matches. It is not a license to render different elements on the server and the client.

### REACT-038 — The initializer runs when the slot is created

**Difficulty:** Intermediate

**Category:** State

**Question:**

`useState(buildList(seed))` and `useState(() => buildList(seed))` both receive a `seed` prop. When does `buildList` run? When does it run again if `seed` changes and the component stays mounted? What does development Strict Mode add, and what must `buildList` not do?

**Context and Constraints:**

React 18 function component. `buildList` is synchronous and returns an array. The component does not change key. One state slot.

**Senior Engineer's Answer:**

`useState(buildList(seed))` evaluates the argument before `useState` sees it. `buildList` runs on every render of this component. After the slot exists, React ignores the value. You still paid for the call.

`useState(() => buildList(seed))` passes a function. React treats that function as an initializer and calls it when the slot is created. Later renders do not call it. A new `seed` prop does not call it. The slot still holds the first list. That is the same preservation rule as any other initial state: the argument is the initial value, not a subscription.

The slot is created again when this fiber mounts again. A key change, a type change, or an unmount and mount runs the initializer again. A parent re-render that keeps the type and key does not.

In development, Strict Mode calls the initializer twice and keeps one result. `buildList` must be pure. A `fetch`, a `Math.random()` the UI depends on, or a push into a module-level cache runs twice and the extra call is not rolled back. Production calls a pure initializer once per mount. The double call is not a second state slot.

If a new `seed` must replace the list, derive the list during render when it is a pure function of props, or reset by changing `key` to `seed`, or adjust state during render when you intentionally store an edited copy. Do not put the fetch in the initializer. You would start it during a pass that Strict Mode repeats and that a discarded render can repeat, and you would not restart it when `seed` changes.

**Practical Implementation:**

```tsx
const [list, setList] = useState(() => buildList(seed));
```

**Trade-offs and Alternatives:**

The lazy initializer wins when the first value is expensive or easy to call by mistake on every render, and the component should keep edits. Deriving `buildList(seed)` in the body and not storing it wins when the list is fully determined by props: there is no stale copy and no initializer. A `key={seed}` remount wins when a new seed must drop edits and effects together. An effect that does `setList(buildList(seed))` paints the previous list first, then replaces it. Use it when the work is a subscription or a request, not when the value is a sync pure function of `seed`.

**Common Mistakes:**

Expecting either form to track `seed`. Starting a request inside the initializer because "it runs once." Logging from `buildList` in Strict Mode and filing a double-mount bug when the list on screen is correct. Writing `useState(buildList(seed))` for an expensive `buildList` and looking at `memo` to stop the cost: the parent render that reaches this function still evaluates the argument.

**Senior-Level Follow-up:**

The initializer closes over `seed` and over a `query` state variable declared above it. `query` changes. Does the stored list update?

No. The initializer already ran. `query` inside that closure is the `query` from the mount render, and it is not re-read. If the list depends on `query`, derive it while rendering, or include `query` in the key, or update the list from the event that changed `query`. A later `query` does not re-enter the initializer.

### REACT-039 — Setting state during render restarts this pass

**Difficulty:** Senior

**Category:** State

**Question:**

`Editor` stores a draft and a `prevId`. During render it does this when `item.id !== prevId`:

```tsx
setPrevId(item.id);
setDraft(item.text);
```

Is that allowed? Does the user see a frame of the previous draft? What happens if those two lines run on every render, including when `item.id` did not change? What happens if this render calls the parent's `setSelected` instead?

**Context and Constraints:**

React 18 function component. `item.id` and `item.text` come from props. The two setters belong to `Editor`. No effect copies the prop. No key change.

**Senior Engineer's Answer:**

React allows a component to call its own setters during render to adjust state to something it just saw, usually a prop or a store snapshot. The condition has to be false on the restarted pass. React throws away the in-progress render and renders again with the updated state before paint. The user does not see the draft that belonged to the previous id. Both setters are part of that restart. After the restart, `prevId` equals `item.id`, the condition is false, and the draft is `item.text`.

If the condition stays true, React restarts until it hits the limit and throws (too many re-renders). Calling `setDraft(item.text)` unconditionally does that whenever the update does not settle. Do not rely on an `Object.is` bailout to save an unconditional call. Structure the condition so the next pass does not set state.

Calling another component's setter during render is not the adjustment path. In development React warns that you cannot update a different component while rendering this one. The supported places to update the parent are the event that the user fired, or an effect if the update is a consequence of commit. The parent's state does not belong in the child's render.

This restart is not `useEffect`. An effect runs after paint of the render that is already on screen, so the old draft can appear for a frame. It is not `useLayoutEffect` either. A layout effect runs after this commit's DOM updates and before paint, which is the right place for a measurement and the wrong place for "the prop changed, replace the draft" when render can do it before commit.

The pattern stores a second copy of `item.text`. When the id changes, you replace the copy. When the id stays, edits in `draft` survive later parent renders. That is intentional. A controlled `value={item.text}` does not need the copy.

**Practical Implementation:**

```tsx
const [draft, setDraft] = useState(item.text);
const [prevId, setPrevId] = useState(item.id);
if (item.id !== prevId) {
  setPrevId(item.id);
  setDraft(item.text);
}
```

**Trade-offs and Alternatives:**

The render-phase adjustment wins when an edited copy must reset because an id changed and the fiber should stay mounted (focus, sibling state, an uncontrolled input you are not remounting). `key={item.id}` wins when the whole subtree should reset, including effects and focus. A controlled value wins when there should be no copy. An effect wins when the reset depends on something you only know after commit. Adjusting during render loses if the condition is written on a value the reset itself changes, or if two sources can move backward and forward and you overwrite a newer edit with an older prop. Compare an id or a version you define, not merely "the prop is different" when echoes can arrive out of order.

**Common Mistakes:**

Copying the prop in an effect and calling the flash unavoidable. Setting state during render with no condition. Calling the parent's setter from the child's body to "lift" the value. Using the pattern plus a key change and describing both as the thing that saved the draft. The key already remounted. The pattern is for the render that kept the fiber.

**Senior-Level Follow-up:**

`item.id` is unchanged and `item.text` changes because the server normalized it. This condition does not run. The input still shows the draft. Which change makes the normalized text appear before paint without remounting?

Compare the incoming text (or a version) to a value stored in state, and when it differs, set both that snapshot and `draft` during render. The restart commits the normalized text. Include a version so an older normalization does not replace a newer keystroke. Changing the key also shows the server text, and it remounts the editor.

### REACT-040 — `ref.current` is written in commit

**Difficulty:** Senior

**Category:** Refs

**Question:**

When does React assign `ref.current` for `<input ref={inputRef} />`? What does the component function see on the render that first mounts the input, and on the next render? What does an inline `ref={(node) => { inputRef.current = node; }}` do on every commit, including under Strict Mode?

**Context and Constraints:**

React 18 function component. `inputRef` is `useRef<HTMLInputElement>(null)`. The input stays the same host type and key. No callback-ref library.

**Senior Engineer's Answer:**

`useRef` returns one stable object for the life of the fiber. React writes `.current` during commit, when the host node has been created or updated, before `useLayoutEffect`. After commit and before the next render, `.current` is that node. On the render that first produces the input, the function still sees `null`. The node does not exist as the ref's value until this render commits. On the next render the function sees the node from the previous commit, which may be a node this commit is about to detach if the type or key at that position changes.

`useLayoutEffect` and `useEffect` both see the ref already assigned. Layout effects see it before paint. Passive effects see it after the browser has had a chance to paint. A handler sees it because the event is dispatched on the committed tree.

An inline function `ref={(node) => { ... }}` is a callback ref. React calls it with the node when the node is attached and with `null` when it is detached. The identity of the function is the subscription. A new function every render means React detaches the old callback (`null`) and attaches the new one (the node) on that commit. Under Strict Mode in development, ref callbacks also get the extra setup/cleanup cycle: node, then `null`, then node, on mount. If the callback calls `setState` whenever it receives a node, the inline form schedules that update on every commit and can loop. A `useRef` object does not do that. A callback wrapped so its identity stays stable runs when the node actually changes.

Neither form is an input to render. Reading `.current` to choose the returned elements reads the previous commit's node, or `null`.

**Practical Implementation:**

```tsx
const inputRef = useRef<HTMLInputElement>(null);

function focus() {
  inputRef.current?.focus();
}

return <input ref={inputRef} />;
```

**Trade-offs and Alternatives:**

An object ref wins for "hold the node and use it in a handler or an effect." A callback ref wins when attachment itself is the event (measure once when the node appears, integrate a library that wants the node in a function). A stable callback, or a callback that only writes a ref, keeps that from becoming a render loop. Passing the ref to a child works in React 18 through `forwardRef`. A custom prop named `inputRef` is an ordinary prop if you are not using `forwardRef`; React 18 does not put `ref` on `props` for a function component. React 19 allows `ref` as a normal prop. On React 18, read it from the second argument of `forwardRef`.

**Common Mistakes:**

Reading `inputRef.current` during the first render and treating `null` as "the input failed to mount." Setting state from an inline ref callback. Expecting the ref to point at a function component. Expecting Strict Mode's extra `null` call in production. Focusing the input in the body because the ref "should be set by now" on the second render: the second render's body still runs before that render's commit, and focusing during render is a DOM write in the wrong phase.

**Senior-Level Follow-up:**

The parent renders `<input ref={inputRef} />` on the first render and `<textarea ref={inputRef} />` on the second, same position, no key. After the second commit, what is `inputRef.current`?

The textarea node. The host type changed, so React detached the input (the callback form would have seen `null` for the input, then the textarea) and committed a textarea. The object ref's `.current` is the node that commit attached. It is not still the input. Any state that lived in the input's DOM, including an uncontrolled value and focus, went with the input node.

### REACT-041 — A click outranks a scroll update

**Difficulty:** Advanced

**Category:** Scheduling

**Question:**

React attaches your `onClick` and your `onMouseMove`. Both call `setState`. How does React 18 prioritize those updates, and what does a `startTransition` inside either handler change? Does the priority system debounce `mousemove` for you?

**Context and Constraints:**

React 18, `createRoot`. The listeners are React props (`onClick`, `onMouseMove`, `onScroll`), not a hand-rolled `addEventListener` debate. No performance numbers have been measured. Lanes stay at the level of priority classes, not bit masks.

**Senior Engineer's Answer:**

React classifies the DOM events it listens to. Clicks, keydowns, inputs, and submits are discrete: each one is a distinct user action, and React processes one discrete event's updates before it dispatches the next discrete event. Several setters inside one click still batch into one render. `mousemove`, `scroll`, `wheel`, and drag are continuous: a stream of events, scheduled at a lower priority than discrete input so a flood of them does not sit in front of a click. A later click therefore is not stuck behind an unbounded queue of pointer moves. Pending continuous work is not a second React tree; it is lower-priority updates on this one.

`startTransition` inside either handler marks the updates you put in the callback as a transition, which is lower than both discrete input and continuous input. The next discrete event can interrupt that transition. Putting the click's own `setState` inside the transition makes the click feel late. Leaving the click's update outside, and transitioning only the expensive follow-up, is the same split as a keystroke versus a large list.

Priority is not a debounce. If every `mousemove` calls `setState`, you have scheduled an update for that stream. React may batch some of those updates together when they are still queued at the same priority. It does not promise one render per animation frame, and it does not drop events for you. A pointer position that the DOM can show without a React render does not belong in state. A pointer position that a small child displays belongs in that child, so the rest of the tree is not a child of the component that updates. A transition around a heavy derived view is appropriate after that split, when a profile says the render is the cost.

React 18 also flushes passive effects from a discrete update before the next discrete input, so a listener an effect attaches is there for the next click. Effects from updates that are not discrete usually run after paint. That is effect timing, not a second priority system for your setters.

**Practical Implementation:**

```tsx
function onClick() {
  setOpen(true);
  startTransition(() => {
    setChartData(compute(points));
  });
}
```

**Trade-offs and Alternatives:**

Colocating the fast state wins before any transition: the component that stores the pointer or the scroll offset should be the component that renders it, with `children` passed through for the rest. A ref updated from `onMouseMove`, with a direct DOM write, wins when React does not need to re-render to show the position. A transition wins when the expensive work is a React render you can show a frame late. A timer-based throttle wins when you must cap work that is not a React render (a network send). It adds delay on a machine that could have kept up. Measure before adding either. `flushSync` inside `mousemove` does the opposite of what the priority is for: it forces the render to finish on that event.

**Common Mistakes:**

Saying scroll and click are the same priority "because both are events." Wrapping every `mousemove` `setState` in `startTransition` and expecting fewer events. Using a transition as a debounce with an imagined interval. Storing the cursor in a page-level component and then memoizing the whole page. Explaining discrete priority with internal lane bits.

**Senior-Level Follow-up:**

`onScroll` calls `setScrollTop` fifty times before the next paint, and a click happens. What can you say about the click's update relative to those scroll updates, without naming lane masks?

The click is discrete and is scheduled ahead of the continuous scroll stream. React will not make the click wait for fifty separate scroll renders to finish first. You cannot promise how many of those scroll updates merged. If `setScrollTop` is expensive, the fix is to render less per scroll update, not to raise the scroll update to discrete priority.

### REACT-042 — A render error is caught above; a handler error is not

**Difficulty:** Senior

**Category:** Errors

**Question:**

A child throws while rendering. What catches it in React 18, and what does the user see? Does the same class catch a throw from `onClick`, from a `fetch` rejection, or from `useEffect`? Can a function component be the boundary?

**Context and Constraints:**

React 18, `createRoot`. The boundary is an ancestor of the child that throws. No error-reporting SDK. Suspense for data loading is out of scope except where it changes which error the boundary sees.

**Senior Engineer's Answer:**

An error boundary is a class component with `static getDerivedStateFromError`, or `componentDidCatch`, or both. A throw during render of a descendant, during a descendant's constructor, or during a descendant lifecycle aborts that render. React walks up to the nearest boundary. `getDerivedStateFromError` returns state during the render that shows the fallback. `componentDidCatch` runs in commit, which is where you log. The failed child's output is not committed. The user sees the fallback instead of a half-applied child.

If nothing catches the throw, the root unmounts and the error is reported. A boundary whose own render throws does not catch itself. The next boundary above can. The fallback UI should not depend on the child that just failed.

Function components cannot be error boundaries in React 18. A hook cannot catch a child's render throw, because the throw unwinds through the fiber walk, and the catch is a class lifecycle.

`onClick` runs after commit, on the committed tree. A throw there is a handler exception. The boundary does not see it. Catch it in the handler, or set state that renders an error. A rejected `fetch` is asynchronous. The boundary does not see the rejection. It sees a later render only if your code throws while rendering. `useEffect` also runs after commit. A throw from the effect is not a render error and is not caught by the boundary. Catch inside the effect and record the failure in state if the UI must change.

`getDerivedStateFromError` must be pure. It receives the error and returns the next state. Starting a retry inside it re-enters render with a side effect. Retry from a button in the fallback or from `componentDidCatch`.

**Practical Implementation:**

```tsx
class Boundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    report(error);
  }

  render() {
    if (this.state.error) return <p>Something went wrong.</p>;
    return this.props.children;
  }
}
```

**Trade-offs and Alternatives:**

One boundary high in the tree wins for a last-resort fallback and loses the rest of the page when one widget throws. A boundary around a widget wins when that widget should fail alone and the shell should stay. The fallback has to be honest: a silent `null` looks like a successful empty state. Resetting the boundary by changing its `key`, or clearing its error state when the child's `key` changes, wins when the user has moved to a new entity and the old error should not stick. Logging in `componentDidCatch` wins over logging in render. A function child can still throw; it simply cannot be the thing that catches.

**Common Mistakes:**

Writing a function component named `ErrorBoundary` and expecting it to catch. Catching `onClick` with the boundary and never seeing the fallback. Putting the request in the child body so the throw happens during render "so the boundary will catch the network error." The throw is a render impurity, and the request repeats. Using `getDerivedStateFromError` to fire the log and a retry. Assuming a caught error still committed the child's DOM.

**Senior-Level Follow-up:**

The boundary shows a fallback after a render throw. The user clicks Retry, and the handler only calls `setState` to clear `error`. What else has to be true for the child to try again?

Clearing `error` renders `children` again. The child mounts fresh if it had unmounted with the failed render, and its initial state runs again. If the child throws for the same reason, the boundary catches again. Retry succeeds only if the cause changed, or the child handles it. The click itself was not the recovery mechanism. The next render is.

### REACT-043 — `hydrateRoot` attaches to the server HTML

**Difficulty:** Senior

**Category:** Hydration

**Question:**

The document already contains HTML from `react-dom/server` inside `#root`. What does `hydrateRoot(container, <App />)` do that `createRoot(container).render(<App />)` does not? What does React 18 do when the client's first render produces different text or a different number of nodes? What about a different attribute?

**Context and Constraints:**

React 18. The server HTML was produced from the same component tree. No streaming-SSR walkthrough. One container. Mismatches are bugs you fix, not a recovery strategy you design around.

**Senior Engineer's Answer:**

`hydrateRoot` expects the container's HTML to be the output of this React tree. It attaches the fiber tree and event handlers to those existing nodes instead of creating a second document. The first client render has to describe the same output the server described. `createRoot` is the API for an empty container. Calling `root.render` on a container that already holds server HTML replaces that HTML with a client render. The user can see the server content disappear and the client content appear. Development warns if you create a root on a container that already has children and you meant to hydrate. `hydrateRoot` takes the JSX as its second argument and returns the root. You do not also call `render` for that first pass. Later updates use `root.render`.

In React 18, extra or missing text and extra or missing nodes are errors, not warnings React patches node by node. React discards the server HTML up to the nearest Suspense boundary and client-renders that subtree. With no Suspense boundary above the mismatch, it client-renders from the root and discards the server HTML. That keeps the tree consistent, and it can drop DOM state the user had already typed into the server HTML. The error is logged in development and in production. `onRecoverableError` on the root is how you report it. Fix the mismatch. Do not add Suspense boundaries as empty recovery buckets; a boundary you did not design as a loading state will also define loading and error behavior later.

Attribute mismatches are not given that structural recovery. Development warns. React does not promise to patch the attribute. `suppressHydrationWarning` on a single element covers text or an attribute you truly cannot match (a timestamp). It is not a wrapper you put around a tree that renders different children on the server and the client.

Common causes: `typeof window` or `Date.now()` or `Math.random()` during render, different data on the two sides, and invalid HTML nesting. The browser repairs illegal nesting before React hydrates, so the nodes React finds are not the nodes the server emitted, and the hydrate fails even though your JSX "looks" the same.

**Practical Implementation:**

```tsx
import { hydrateRoot } from "react-dom/client";

const container = document.getElementById("root");
if (!container) throw new Error("missing #root");
hydrateRoot(container, <App />);
```

**Trade-offs and Alternatives:**

`hydrateRoot` wins when the server HTML is the first paint you want to keep and the first client render matches it. `createRoot` on an empty node wins for a widget with no server HTML. Client-only rendering of a subtree wins when that subtree cannot match (a map widget): render a stable placeholder on the server and the same placeholder on the first client render, then show the client-only UI after mount from an effect. A `window` branch in the body is the mismatch, not the fix. `suppressHydrationWarning` wins for one text node and loses as a tree-wide ignore.

**Common Mistakes:**

Calling `createRoot` and then `render` on server HTML. Calling `hydrateRoot(container)` without the React node. Treating hydration recovery as the way the app updates. Reading `localStorage` during the first render so the client text differs from the server. Wrapping the app in `suppressHydrationWarning` and shipping the mismatch.

**Senior-Level Follow-up:**

A timestamp must differ, and you set `suppressHydrationWarning` on the `<p>` that contains it. A child `<span>` under that `<p>` also differs. Does the prop cover the span?

No. The prop covers that element's own text and attributes, one level. The span needs its own reason to differ, or it should render the same string on both sides. The prop does not apply to the subtree.

### REACT-044 — An urgent update and a transition are two passes

**Difficulty:** Senior

**Category:** Scheduling

**Question:**

One `onChange` does this:

```tsx
setQuery(event.target.value);
startTransition(() => {
  setResults(filter(event.target.value));
});
```

Do these two setters render once, in call order, the way two ordinary setters in that handler do? What can the screen show before both have committed? What changes if `setQuery` moves inside the `startTransition` callback?

**Context and Constraints:**

React 18, `createRoot`. `filter` is synchronous and expensive. `query` is the input's `value`. `results` drives a large list. No `flushSync`. Assume a profile already showed the list render is what delays the keystroke.

**Senior Engineer's Answer:**

They are not one batch. `setQuery` is the discrete update from the input event. `setResults` is a transition. React can render and commit the query first, so the input shows the character, and render the list afterward at transition priority. Between those commits the screen can show the new query and the previous results. That stale list is the trade. A later keystroke is another discrete update. It can abandon the in-flight list render and start one for the newer text. The abandoned pass does not commit and does not run effects.

Two ordinary setters in the same handler, both outside the transition, share one discrete render. The input and the list commit together. The character waits on `filter`. Call order matters inside that single render. It does not merge two priorities into one pass.

`event.target.value` is read in the handler, synchronously, for both calls. Both see the same string. There is no stale-closure gap between them. The split is priority, not two different strings.

Moving `setQuery` inside `startTransition` marks the input update as a transition too. The character can wait on the list, which is the stall you were removing. Keep the controlled input's setter outside. `useDeferredValue(query)` is the other shape of the same split when the parent already updated `query` and the child should keep rendering the previous value at transition priority. It does not make `filter` faster.

`isPending` from `useTransition` is true while the transition has not committed. It is not a network status. This `filter` does not fetch.

**Practical Implementation:**

```tsx
function onChange(event: React.ChangeEvent<HTMLInputElement>) {
  const next = event.target.value;
  setQuery(next);
  startTransition(() => {
    setResults(filter(next));
  });
}
```

**Trade-offs and Alternatives:**

The urgent input plus a transition list wins when the list is large and showing the previous list for a frame is acceptable. One discrete render wins when the list is cheap and a mixed frame would be wrong (a count that must match the input exactly on every paint). `useDeferredValue` wins when you do not own the setter that produced the value. Windowing or a cheaper `filter` wins when one transition render is still too much work to finish. A debounce wins for a server query. It delays the request on purpose. It is not a substitute for the priority split on a synchronous list. `flushSync` around `setQuery` forces the input commit and still leaves the transition as separate work if `setResults` stays inside `startTransition`. It is unnecessary for an input event, which is already discrete.

**Common Mistakes:**

Expecting call order to produce one render because both setters ran in one function. Putting both setters in the transition and then debugging the caret. Treating the mixed frame as a bug in batching. Reading `isPending` as "filter threw" or "the fetch has not returned." Assuming the abandoned list render rolled back DOM that it never committed.

**Senior-Level Follow-up:**

The transition render throws in a child of the list. The input update already committed. Does the input revert? Where does the error surface?

The input stays. Its commit finished. React retries a transition that throws by rendering again synchronously so the error is reported on a consistent tree. An error boundary around the list can show a fallback for that subtree. The boundary does not undo the query commit. A boundary above both still leaves the already committed input unless that boundary's fallback replaces it too.

### REACT-045 — After unmount, that setter does not paint

**Difficulty:** Senior

**Category:** State

**Question:**

A component starts a `fetch` in an effect and calls `setProfile(data)` in the `then`. The user navigates away, the component unmounts, and the response arrives afterward. What does React 18 do with that `setState`? What still has to be cancelled, and why?

**Context and Constraints:**

React 18, `createRoot`. The navigation unmounts this fiber. The setter closed over by the effect is the one from this mount. No error boundary is involved. The promise is not aborted unless your code aborts it.

**Senior Engineer's Answer:**

The setter updates the fiber it belongs to. That fiber is unmounted, so the response does not paint and it does not remount the component. React 18 does not warn the way earlier React did ("setState on an unmounted component"). Silence is not proof the update was useful. A later mount of the same function is a new fiber with a new setter. The old `then` does not deliver the response to the new fiber.

The request is still running. React will not abort it because the fiber went away. Your cleanup should. `AbortController` on the effect cleanup, or an ignore flag the `then` checks before calling the setter, stops you from doing work for a screen that left and stops a slow response from being applied if you later reuse something you should not. The ignore flag matters most when the effect re-runs for a new id without the old request finishing: without it, an older `then` can call the current setter and overwrite the newer profile. Unmount is the extreme case of that race. The flag and the abort are the fix for the race. The missing warning is not.

If the `then` throws after unmount, that exception is still your promise. The error boundary that used to be above the component is not in the call stack of the `then`. Catch the rejection in the effect's promise chain.

Strict Mode's development remount runs the effect, cleans it up, and runs it again. A fetch without abort starts twice in development. That is the cleanup check. Production navigates once. The same cleanup that makes Strict Mode quiet is the cleanup that makes the navigation race correct.

**Practical Implementation:**

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal })
    .then((res) => res.json())
    .then((data) => setProfile(data))
    .catch((err) => {
      if (err.name !== "AbortError") setError(err);
    });
  return () => controller.abort();
}, [url]);
```

**Trade-offs and Alternatives:**

Abort wins when the request should actually stop (a large download, a search the user replaced). An ignore flag wins when you cannot abort and you only need to drop the result. Both win together when abort is best-effort and a late resolution is still possible. Checking a `mounted` flag only around `setState`, with no abort and no generation check, avoids the dead-fiber update and still lets an old response win after a fast id change if you forgot to ignore stale ids. Put the id in the check. Lifting the request to a parent that stays mounted is the right model when the response should survive the navigation. Then unmount is not a cancellation.

**Common Mistakes:**

Treating the removed warning as "React 18 applies the update anyway." Aborting in cleanup and also assuming the new mount receives the old response. Forgetting that Strict Mode will run cleanup in development, so a fetch without abort looks like a double network bug. Routing the rejection to an error boundary by letting the promise reject.

**Senior-Level Follow-up:**

The effect cleanup sets `ignore = true`, and the `then` checks it before `setProfile`. The user has not navigated. `url` changed. The first response returns after the second request has rendered. What does the flag protect, and what does it fail to protect if both requests share one `ignore` variable declared outside the effect?

A flag or controller created inside that effect run protects that run. The cleanup for the old `url` sets the old closure's flag, and the old `then` returns. The new run has its own flag, still false, so the new response can set state. One module-level or one ref `ignore` that every run sets to `true` on cleanup will also ignore the newest request if the old cleanup flips the same cell the new run reads. The generation has to be per run.

### REACT-046 — A matching host type updates the same DOM node

**Difficulty:** Senior

**Category:** Reconciliation

**Question:**

A `<div className={cls} style={{ color }}>` re-renders with a new `className` and a new `style` object. Does React destroy the DOM node? The user had scrolled inside the `div`, and an input inside it had focus. What changes if the `div` becomes a `section`? What changes if the next render passes `dangerouslySetInnerHTML` and also passes children?

**Context and Constraints:**

React 18. The `div` keeps the same parent and the same key. `color` is a string. No CSS-in-JS runtime beyond the `style` object React already knows.

**Senior Engineer's Answer:**

Same host type, same position, same key: React keeps the DOM node and updates the properties that changed. `className` updates the class attribute. `style={{ color }}` is a new object every render, and that does not create a new node. React diffs the style fields and writes the ones that changed. Scroll position, focus, text selection, and anything else the browser stores on that node stay, because it is the same node. A child input keeps focus if that input's own fiber stays. The new style object would matter to `memo` on a component prop. It does not mean the host node is recreated.

If the `div` becomes a `section`, the host type at that position changed. React removes the `div` and creates a `section`. Scroll position on the `div` is gone. Focus inside it is gone unless focus moves because the newly mounted tree or the browser does something else. Child component state under that host unmounts with it. A `key` change on the same `div` also replaces the node on purpose.

Children are reconciled under the surviving node. A text child updates the text. A child with a matching type and key updates in place.

`dangerouslySetInnerHTML` replaces the node's children with the HTML you pass. You do not also pass React children. Doing both fights over the same child list: React's children and the raw HTML are two owners. The prop is an escape hatch for HTML you already trust. It is not a second reconciler. Event handlers inside that HTML string are not React handlers.

Host updates that produce the same DOM properties do not write those properties again. Commit still walked the fiber. "The node was updated" and "the DOM attribute changed" are not the same sentence.

**Practical Implementation:**

```tsx
<div className={cls} style={{ color }}>
  {children}
</div>
```

**Trade-offs and Alternatives:**

Updating props on a stable host node is the normal path and the one that preserves browser state. Changing the tag is a real replacement and should mean the element is a different part of the document. A `key` on the host node forces replacement when you need a fresh DOM node (an uncontrolled input that must clear, a focus reset). CSS classes win over rewriting `style` when the values are static tokens. Inline style wins for values that are actually per-render coordinates. A library that sets `innerHTML` itself bypasses this diff. Prefer React children so the reconciler remains the owner of the subtree.

**Common Mistakes:**

Expecting a new `style` object to remount the `div`. Expecting a `className` change to reset scroll. Changing a tag to adjust styling and dropping focus. Passing children and `dangerouslySetInnerHTML` together. Putting a new `key={Math.random()}` on the `div` "so styles apply" and remounting the subtree every render.

**Senior-Level Follow-up:**

The `div` stays, and the child changes from the string `"Hello"` to `<span>Hello</span>`, then back to the string. What happens to the DOM children?

A string child is a text node. A `<span>` is an element node. The child type at that position changed, so React replaces the text node with a span, then replaces the span with a text node on the way back. There is no stable host node across that pair. State inside the span is created and destroyed with it. If both renders return a span, the span node stays and its text updates.

### REACT-047 — A portal moves the DOM node, not the fiber

**Difficulty:** Advanced

**Category:** Portals

**Question:**

`Modal` returns `createPortal(<Dialog />, document.body)`. `Dialog` has state and reads context provided above `Modal`. A click happens on a button inside `Dialog`. The React parent of `Modal` has `onClick`. A native listener on the React root DOM node also listens. Which of those see the click? If the parent re-renders and still returns the portal, does `Dialog` keep its state?

**Context and Constraints:**

React 18, `createRoot`. `document.body` is outside the root container. `Dialog` is a function component. The portal call stays in the tree across the parent re-render. No third-party modal library.

**Senior Engineer's Answer:**

`createPortal(children, domNode)` commits those children into `domNode`. The fiber parent stays the component that rendered the portal. Context comes from the React ancestors, not from whatever HTML happens to surround `document.body`. An error boundary above `Modal` catches a render throw inside `Dialog`. State lives on `Dialog`'s fiber. A parent re-render that still returns the portal keeps that fiber, the same way it keeps any other child whose type and key match. Stopping the portal call unmounts `Dialog` and removes the nodes from `body`.

React's `onClick` on an ancestor component runs. React bubbles the event through the fiber tree, so the portal behaves like a child even though the DOM node is under `body`. That is the propagation you use for "click the backdrop inside the React tree" and for a parent that must hear the dialog.

A native listener on the React root container does not see the click by DOM bubbling. The DOM path is the button, then `body`, then `document`, not the root `div` inside the container. React 17 and 18 attach React's listeners at the root, and they also attach what a portal needs so React events from `body` still work. Native listeners follow the DOM. Do not expect a `container.addEventListener("click", ...)` on the root node to observe a click inside the portal. A native listener on `document` does see it, because `body` bubbles to `document`.

`stopPropagation` on the React event stops React ancestors from seeing it. It also stops the native event from continuing, which matters for those `document` listeners. Know which tree you are stopping.

The portal does not change batching, keys, or who owns state. It changes where the host nodes are inserted.

**Practical Implementation:**

```tsx
import { createPortal } from "react-dom";

function Modal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}
```

**Trade-offs and Alternatives:**

A portal wins when the DOM parent must be `body` or another node outside this container: overflow clipping, z-index, a full-screen layer. A normal child wins when a positioned `div` inside the parent is enough. A second `createRoot` on `body` wins only when the dialog is a separate application with its own state and its own batching. It will not see this tree's context. A portal that receives `children` from the parent keeps the dialog's state with the parent that owns the element, under the portal's fiber position. Re-creating the portal's DOM target every render (`createPortal(children, document.createElement("div"))`) mounts into a node you never inserted and leaks those nodes. Keep one stable `domNode`.

**Common Mistakes:**

Expecting context to break because `body` is outside the provider's DOM. Expecting a native listener on the root `div` to see the portal click. Expecting a parent re-render to reset `Dialog` because the DOM node "moved." Calling `stopPropagation` in the dialog and being surprised a React ancestor did not run, or surprised a `document` listener went quiet. Creating a new DOM node as the portal target on every render.

**Senior-Level Follow-up:**

`Dialog` is rendered once through the portal and once as a normal child, from the same element object passed in two places. Does one `Dialog` state show up in both?

No. Two positions, two fibers, two states, even if one of the positions is a portal. The portal changes the DOM parent of its position. It does not identify the two positions as one instance. Share state by lifting it, or render the dialog in one place.

### REACT-048 — `value={undefined}` is still providing a value

**Difficulty:** Intermediate

**Category:** Context

**Question:**

`const Mode = createContext("edit")`. One tree has no provider. One tree has `<Mode.Provider value={undefined}>`. One tree has `<Mode.Provider value="edit">` outside and `<Mode.Provider value="view">` inside, around the consumer. What does `useContext(Mode)` return in each tree?

**Context and Constraints:**

React 18. The consumer calls `useContext(Mode)` and does not take a default of its own. `undefined` is being passed on purpose in the second tree, not omitted by accident. No selector library.

**Senior Engineer's Answer:**

With no provider above the consumer, `useContext` returns the default from `createContext`, here `"edit"`. The default is not a hidden provider at the root. It is the value used only when the walk finds no provider.

`<Mode.Provider value={undefined}>` is a provider. The consumer reads `undefined`, not `"edit"`. Passing `undefined` does not mean "fall through." If the state you want to provide can legitimately be `undefined`, the consumer cannot use `undefined` to detect "no provider." Use a sentinel default, or always render a provider.

The nested providers: the consumer reads the nearest one, `"view"`. The outer `"edit"` is for consumers that are inside the outer provider and outside the inner one. Updates follow the provider you actually read. A change to the outer value does not re-render a consumer whose nearest provider is the inner one, unless that outer change also re-rendered the consumer through ordinary parent rendering.

`Object.is` still decides whether a provider's value change wakes its consumers. `"edit"` to `"edit"` does not. A new object that contains `"edit"` does, if the object is a new reference. The default value is not compared on each render as a fallback.

**Practical Implementation:**

```tsx
const Mode = createContext<string | null>(null);

function Panel() {
  const mode = useContext(Mode);
  if (mode === null) return <p>No mode provider</p>;
  return <p>{mode}</p>;
}
```

**Trade-offs and Alternatives:**

A default sentinel (`null`, a constant object created next to `createContext`) wins when "no provider" is a real state you want to detect. A required provider wins when the tree is wrong without one: skip the default, and test that the provider is mounted. Nested providers win for a subtree that overrides a mode (a preview pane in `"view"` inside an `"edit"` page). They lose when every layer allocates a new value object and you can no longer tell which update woke the consumer. Pass a stable value from the layer that owns it.

**Common Mistakes:**

Using the default as if it were the current provider value after a provider passed `undefined`. Nesting a provider and expecting the outer value to win. Detecting a missing provider with `=== undefined` while also providing `undefined` for "unknown." Creating the context inside a component, so each render makes a new context object and no provider matches the consumer's `useContext` argument.

**Senior-Level Follow-up:**

The module creates `const Mode = createContext("edit")`. A component also calls `createContext("edit")` inside its function and passes that second object to `useContext`. A provider above used the module's `Mode`. What does the consumer read?

The default `"edit"` from the context object it passed to `useContext`, which is a different object from the one the provider used. Providers and consumers match by the context object identity, not by the string `"edit"` and not by the variable name. Create the context once at module scope and import that same reference.

### REACT-049 — Two roots do not share a batch

**Difficulty:** Senior

**Category:** Roots

**Question:**

A page has two `createRoot` trees. A click inside the first calls a setter from the first root and a setter from the second, both directly in that one React `onClick`. How many renders and commits should you expect? Can an error boundary in the first root catch a throw while the second root renders? Can the second root read the first root's context?

**Context and Constraints:**

React 18. Both roots were created with `createRoot` on two different empty containers. The click is a React event in the first tree. The second setter was passed in as a plain function. No `flushSync`.

**Senior Engineer's Answer:**

Each root is a separate fiber tree with its own render and its own commit. The two setters schedule work on their own roots. They do not become one render, and they do not share one batch in the sense of "one component tree updated in call order." React can flush both while it is finishing that discrete click, so both may be committed before the browser paints the next frame. That is still two commits. A bailout in the first root does not bail out the second. State in the first root is not visible to the second unless you passed it yourself.

An error boundary catches render errors in its own tree. A throw while rendering the second root is the second root's walk. The first root's boundary is not an ancestor fiber of the second. The click handler itself is not a render. A throw in the handler, before or between the setters, is a handler exception. Neither boundary catches it.

Context does not cross roots. A provider in the first tree is not above the second tree. The second tree reads a context only if its own ancestors provide that same context object. Passing a value as a prop or as an argument is the communication. A portal does not make a second root: a portal stays in the first tree and would see the first tree's context. A second `createRoot` is the thing that cuts the tree.

The same split exists between a legacy `ReactDOM.render` root and a `createRoot` root, with the extra difference that the legacy root does not use React 18 batching or interruptible rendering for its own updates.

Create each root once. Update it with its own `root.render` only when the host page is pushing a new top-level element. Do not `createRoot` inside the click.

**Practical Implementation:**

```tsx
const detailsRoot = createRoot(detailsNode);

function App() {
  return (
    <button
      onClick={() => {
        setOpen(true);
        detailsRoot.render(<Details item={item} />);
      }}
    >
      Open
    </button>
  );
}
```

**Trade-offs and Alternatives:**

Two roots win when a host document owns one node and your widget must not share its context, its error boundaries, or its batching with another widget. One root with a portal wins when the DOM needs to escape a container and the React tree should stay whole. A shared store that both roots read through `useSyncExternalStore` wins when they must show the same data without becoming one tree. Each root still renders on its own. `flushSync` in the click forces the update you wrap to commit before `flushSync` returns, which can include work you did not mean to couple, and it still does not make the two roots one fiber tree. Prefer one root unless the host boundary is real.

**Common Mistakes:**

Expecting the two setters to behave like `setOpen` and `setId` in one component. Putting an error boundary in the shell root and assuming it covers a widget root. Using a second root to reach `document.body` when a portal would keep context. Creating the second root inside the handler that should have called `render` on an existing one. Sharing a context by importing the provider component and forgetting the second tree never rendered it.

**Senior-Level Follow-up:**

The click calls `flushSync(() => setOpen(true))` in the first root and then calls the second root's setter. What is true about the DOM of the first root when the second setter runs?

`flushSync` has committed the first root's update before it returns. The first root's DOM matches `open === true` before the second setter runs. The second root has not rendered yet, unless something else had already scheduled it. `flushSync` did not batch the two roots together. It finished the first. Use it when the next line of the handler must observe that DOM, and not as a way to order two applications.

### REACT-050 — The sort wrote through the state array

**Difficulty:** Staff-Level

**Category:** State

**Question:**

```tsx
const initial = [
  { id: "b", name: "B" },
  { id: "a", name: "A" },
];

function Directory() {
  const [people, setPeople] = useState(initial);
  const [sort, setSort] = useState<"id" | "name">("id");

  if (sort === "name") {
    people.sort((p, q) => p.name.localeCompare(q.name));
  }

  return (
    <>
      <button onClick={() => setSort(sort === "id" ? "name" : "id")}>
        Sort by {sort === "id" ? "name" : "id"}
      </button>
      <button onClick={() => setPeople(initial)}>Reset</button>
      <ul>
        {people.map((person) => (
          <li key={person.id}>{person.name}</li>
        ))}
      </ul>
    </>
  );
}
```

The user sees B then A, clicks the sort button once, sees A then B, clicks it again to go back to `"id"`, and still sees A then B. Reset does not change the list. Walk through the renders. Why is the key not the bug? What do you change so toggling the sort flag does not destroy the unsorted order, and so Reset can restore it?

**Context and Constraints:**

React 18, `createRoot`, development Strict Mode on. `initial` lives at module scope. Ids are unique. No `memo`. The list rows have no local state. Do not invent a timing number for the sort.

**Senior Engineer's Answer:**

The first render has `sort === "id"`, so the `if` does not run. State holds the module array, order B, A. The keys are the ids. Commit shows B, A.

The sort click sets `sort` to `"name"`. That is one discrete update. The next render enters the `if` and calls `people.sort`. `Array.prototype.sort` sorts the existing array and returns it. The state array and `initial` are that same object, so the mutation changes both. The order becomes A, B. Render returns that order. The user sees A, B, which looks like a successful sort.

Strict Mode renders that pass an extra time in development. The second call sorts an array that is already in order. This comparator is a real ordering, so the extra call does not reshuffle it. The extra call is not what deleted B, A. The first call did. If the body had pushed, spliced, or used a comparator that is not a pure order, the extra invocation would have made a visible mess. A discarded render would have left the same mutation: React can throw away the element tree, and it cannot throw away a write to the array.

The next click sets `sort` back to `"id"`. The `if` does not run. Nothing stores the old order, and the array in state is already A, B. The screen stays A, B. The flag changed. The data no longer has an unsorted order to show.

Reset calls `setPeople(initial)`. `people` and `initial` are the same reference, and the contents are already A, B. `Object.is` succeeds, so this update bails out. There is no render. Even a forced render would still show A, B, because there is no pristine copy left.

The keys are doing the right thing. There is no row state to stick to the wrong id. Replacing `key={person.id}` does not restore an order the array no longer has. `memo` does not restore it either.

Keep the source array immutable and derive the view:

```tsx
const [people, setPeople] = useState(() => initial.map((p) => ({ ...p })));
const shown =
  sort === "name"
    ? [...people].sort((p, q) => p.name.localeCompare(q.name))
    : people;
```

Render a list from `shown`. Toggling `sort` changes the derived array and leaves `people` alone. Reset must install a new copy of the original data (`setPeople(initial.map((p) => ({ ...p })))`), and `initial` must be a source render never sorts. The lazy initializer matters so the first state is not the module array.

If the sorted order is itself the data you save, copy and sort in the click handler and `setPeople` the copy. Do that instead of sorting during render, not in addition to a render that mutates.

**Practical Implementation:**

```tsx
const shown =
  sort === "name"
    ? [...people].sort((p, q) => p.name.localeCompare(q.name))
    : people;
```

**Trade-offs and Alternatives:**

Deriving `shown` wins when the sort flag is a view and the stored order is the source of truth. Sorting in the handler and storing the result wins when the new order is the source of truth and Reset should restore a copy you kept. A library sort that returns a new array is the same derive, as long as you do not write the result back onto `people` during render. Freezing the module array in development turns the mutation into a throw on the first sort click, which is a useful tripwire and not the product behavior. An effect that sorts into state paints the unsorted list, then the sorted list, and still needs a pristine copy for Reset.

**Common Mistakes:**

Blaming the id keys or adding `memo` to the row. Blaming Strict Mode for the missing B, A order. Calling Reset a batching bug. "Fixing" it by sorting in render and also sorting in the handler, so the render still mutates whatever the handler stored. Replacing `useState(initial)` with `useState(() => initial)` and still sorting `people` in place: the lazy wrapper does not copy the array.

**Senior-Level Follow-up:**

The handler becomes `setPeople([...people].sort(...))` on the sort click, and the `if (sort === "name") people.sort(...)` block stays. Reset does `setPeople(initial.map((p) => ({ ...p })))`, and `initial` is never assigned. What is still wrong on the sort click?

The handler stores a new sorted array, so that click can show A, B, and Reset can still restore a copy of `initial` as long as render has not sorted `initial` itself. The `if` still mutates the array that is in state whenever `sort === "name"`. That write happens during render, runs an extra time in development Strict Mode, and survives a discarded render. The next update starts from data render already rewrote. Remove the sort from the body. If the handler is the source of truth, the flag is redundant. If the flag is the source of truth, the handler should only set the flag, and the body should sort a copy.
