# R01 — React fundamentals and internal mechanics

React 18 unless a question says otherwise. Questions REACT-001–REACT-050.

Covers function components, props, JSX, elements vs fibers, state and batching, reconciliation and keys, render/commit, concurrent scheduling, context, roots/hydration, controlled inputs, refs, portals, and purity mistakes that corrupt state.

### REACT-001 — A function component is a render function

**Difficulty:** Intermediate

**Category:** Components

**Question:**

What does React treat a function component as? When does React call it, and what is the return value for?

**Answer:**

React treats a function component as a pure function from props plus hook state to a UI description. It runs during the render phase. The return is a React element tree (or `null`/boolean/string/number/array)—not DOM. Host nodes update later in commit where the description differs. Strict Mode may call twice in development; concurrent rendering can abandon and retry. Leave side effects to handlers and effects.

**Code:**

```tsx
function Greeting({ name }: { name: string }) {
  return name ? <h1>Hello {name}</h1> : null;
}
```

**Follow-up:**

Why does Strict Mode call the component twice in development, and does production do that?

Answer: It is a development impurity check; it does not commit two trees. Production does not add that call. Concurrent rendering can still repeat or discard a render for scheduling in production.

### REACT-002 — Props are owned by the parent

**Difficulty:** Intermediate

**Category:** Props

**Question:**

Who owns a prop value? What happens if the child writes `props.title = "Edited"`, or if it does `const [title, setTitle] = useState(props.title)` and the parent later passes a new title?

**Answer:**

The parent owns the value; the child reads it each render. Mutating `props.title` throws in development (frozen props) and does not update the parent; nested object mutation can still leak. `useState(props.title)` stores only the first value—later props are ignored until `setTitle` or a remount (`key`). Controlled inputs read the prop; drafts that ignore later props should document that API.

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

Answer: When the prop is documented as an initial value (like `defaultValue`). If callers need live updates, use controlled `value`/`onChange` or a remounting `key`.

### REACT-003 — JSX is an element description

**Difficulty:** Intermediate

**Category:** JSX

**Question:**

What does `<Profile user={user} />` compile to, why must `Profile` be capitalized, and what does React do with `{user.name}`, `false`, `0`, and a plain object as a child?

**Answer:**

JSX becomes `jsx`/`jsxs` (or classic `createElement`)—a plain element object (`type`, `props`, `key`), not a component call or DOM write. Capital `Profile` is the function; lowercase `"profile"` is a host tag. Strings/numbers become text; `null`/`undefined`/`false` render nothing; `0` renders `"0"`; plain objects are invalid children. Creating the element does not run `Profile`.

**Follow-up:**

What is the difference between an element and a component?

Answer: The component is the function/class. The element is `{ type, props, key }` pointing at it. React runs the component while rendering that element at a tree position, not when the object is allocated.

### REACT-004 — Elements, fibers, and DOM nodes

**Difficulty:** Senior

**Category:** Elements

**Question:**

Define a component, a React element, a fiber, and a DOM node. Which one holds hook state? If the module creates `const element = <Counter />` once and two different parents return that same object, do those parents share Counter state?

**Answer:**

Component = your function. Element = one-render description (`type`/`props`/`key`). Fiber = reconciler instance at a position (hooks, links, flags). DOM node = host object created at commit. Hook state lives on the fiber. Reusing one element object mounts two fibers with separate state; they only share the props reference. Element identity is not instance identity.

**Trade-offs:**

Hoist a constant element only when it never closes over changing data. Shared state needs a common parent or external store—not a shared element object.

**Follow-up:**

Does a parent re-render that returns `<Counter />` again destroy Counter's state?

Answer: No, when type and key at that position are unchanged. State dies when type/key changes or the position unmounts.

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

The log prints `0`—the closed-over snapshot. `setCount` schedules an update; it does not mutate the binding or return a promise. For a discrete click on `createRoot`, React flushes after the handler returns: the function runs again with `1` and commit updates the DOM before paint. From the next line’s perspective, state and DOM are still old.

**Follow-up:**

`useState(expensive())` versus `useState(() => expensive())` — what runs on the second render?

Answer: `expensive()` as an argument runs every render (result discarded after mount). The function form is the initializer—called when the slot is created (twice under Strict Mode in development), not on later renders.

### REACT-006 — useState replaces object state

**Difficulty:** Intermediate

**Category:** State

**Question:**

A component holds `useState({ a: 1, b: 2 })` and calls `setPair({ a: 3 })`. What is `b` on the next render? How does that differ from class `this.setState({ a: 3 })`?

**Answer:**

Next state is `{ a: 3 }`; `b` is gone. Hook setters replace the whole slot value. Class `this.setState({ a: 3 })` shallow-merges, so `b` would stay. Merge yourself with `setPair(prev => ({ ...prev, a: 3 }))`. Spreads copy one level only. A freshly allocated object fails `Object.is` bailout even when every field matches. Replacing this pair does not reset other `useState` slots in the same component.

**Code:**

```tsx
setPair((prev) => ({ ...prev, a: 3 })); // { a: 3, b: 2 }
```

**Follow-up:**

What does React guarantee about the identity of the `setPair` function across renders?

Answer: The setter identity is stable for that hook slot; omit it from deps safely. Stability does not freeze the state value.

### REACT-007 — Updates in one batch run in order

**Difficulty:** Senior

**Category:** State

**Question:**

`count` is `5`. Three click handlers: `plain` does `setCount(count + 1)` twice; `functional` does `setCount(c => c + 1)` twice; `mixed` does updater, then `setCount(count + 1)`, then updater. What is `count` after each?

**Answer:**

Queued updates apply in order on the next render. Non-function values replace the pending result; updaters chain. `plain` → `6` (both read `5`). `functional` → `7`. `mixed` → first to `6`, middle replace with closed-over `6`, last updater → `7`. Expressions close over this render unless they use the updater argument.

**Follow-up:**

If `mixed` used two different slots, does one see the other's pending value?

Answer: No. Each slot has its own queue. They share the batch and commit together, but do not feed each other. Derive during render instead.

### REACT-008 — React 18 batches outside React events

**Difficulty:** Senior

**Category:** Batching

**Question:**

In one callback, `setCount` and `setFlag` both run. Compare a React `onClick`, `setTimeout`, `fetch().then`, and a native `addEventListener` click on React 18 `createRoot` versus React 17.

**Answer:**

On React 18 with `createRoot`, each callback produces one render: both updates apply, then one commit. Automatic batching covers React handlers, timeouts, promise callbacks, and native listeners. React 17 batched only inside React events; the same pair in a timeout, promise, or native listener rendered twice. Legacy `ReactDOM.render` keeps that React 17 behavior. Batching does not mutate closed-over state variables in place after either setter returns.

**Code:**

```tsx
setTimeout(() => {
  setCount((c) => c + 1);
  setFlag((f) => !f);
}, 0); // createRoot: one render
```

**Follow-up:**

A click calls `setQuery(next)` and, inside `startTransition`, `setResults(...)`. Still one render?

Answer: No. Batching groups same-priority updates. A transition may render/commit separately from the urgent update and can be interrupted.

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

React 18 `createRoot`: two renders. Lines before `await` batch into one pass with `a===1`, `b===2`. The continuation is a separate task that batches `(3,4)`. React 17: three—synced prefix one render, then unbatched `setA(3)` and `setB(4)`. Remove `await` and all four calls are one batch; later replaces win, so the commit is `a===3`, `b===4` with no intermediate `(1,2)` paint.

**Follow-up:**

`save` rejects before the second pair. What has the user seen?

Answer: The first batch already committed `(1,2)` unless you never scheduled it. Set error state in `catch`. Prefer an explicit status field over leaving “saving” values orphaned.

### REACT-010 — flushSync commits before it returns

**Difficulty:** Advanced

**Category:** Batching

**Question:**

A click appends a row and must read that row's `getBoundingClientRect()` before later logic in the same handler. What does `flushSync` change about batching and commit, and what about the `count` binding?

**Answer:**

`flushSync` runs updates inside its callback through render and commit before returning, so layout reads see the new DOM. Updates outside stay on the normal path. Closed-over locals from this render stay old—the newer render inside `flushSync` has its own bindings. It blocks the main thread; use it only when the next imperative line must see DOM.

**Code:**

```tsx
flushSync(() => setRows((rows) => [...rows, nextRow]));
const height = listRef.current?.lastElementChild?.getBoundingClientRect().height;
```

**Trade-offs:**

Prefer `useLayoutEffect` when measurement can live with every commit. Prefer deriving position from state when possible.

**Follow-up:**

`flushSync` appends a row, then `setSavedAt` outside. One commit?

Answer: No. Append commits inside `flushSync`; `setSavedAt` is a later update. Put both inside one callback if they must share a commit.

### REACT-011 — Reconciliation matches type at a position

**Difficulty:** Senior

**Category:** Reconciliation

**Question:**

A parent renders `<UserCard /><Details />` then `<Details /><UserCard />` with no keys. Does React move instances? What happens to state? Why this heuristic?

**Answer:**

Without keys, siblings match by index. Index 0 was `UserCard` and is now `Details`—type changed, so that subtree unmounts and remounts; same at index 1. State and effects reset. React does not search the sibling list for a matching type and slide fibers. Same type and key at a position updates props in place. The linear heuristic (different type ⇒ different subtree; list identity via `key`) avoids a costly general tree edit.

**Follow-up:**

Why does declaring `function UserCard` inside the parent reset state every parent render?

Answer: Element type is compared by reference. A new inner function each render is a new type, so React remounts. Keep a stable module-level reference.

### REACT-012 — Index keys work while order is identity

**Difficulty:** Senior

**Category:** Keys

**Question:**

A todo list uses `key={index}`; rows hold draft state and uncontrolled inputs. When is that correct, and what breaks on insert-at-front or sort? What should the key be?

**Answer:**

Keys name sibling identity. Index keys are fine when order is identity (static lists, no per-row state). Insert/sort reuses the fiber at that index with new props while keeping draft and uncontrolled DOM—state sticks to position. Use `key={todo.id}` so the fiber moves with the item. Keys must be unique among siblings; random keys remount every render.

**Code:**

```tsx
{todos.map((todo) => (
  <TodoRow key={todo.id} todo={todo} />
))}
```

**Follow-up:**

Filtered list keyed by `todo.id`—do surviving rows keep drafts?

Answer: Yes. Matching keys keep those fibers. Index keys on a filtered list shift drafts onto wrong items.

### REACT-013 — State stays where type and key stay

**Difficulty:** Senior

**Category:** State preservation

**Question:**

For each: `{isUser ? <Panel /> : <Panel />}`, `{isUser ? <UserPanel /> : <GuestPanel />}`, `{isUser ? <Panel kind="user" /> : <Panel kind="guest" />}`, `{isUser ? <Panel key="user" /> : <Panel key="guest" />}`—does Panel state survive toggling `isUser`?

**Answer:**

React keeps fiber state while type, key, and position stay. First line: one position, type `Panel` in both branches—toggle re-renders the same fiber; state remains. Second: type changes—unmount/mount, fresh state. Third: same type, `kind` prop changes—state remains (read `kind` from props, or reset on purpose). Fourth: key change remounts—the supported reset for the same function. A prop change alone never resets state.

**Code:**

```tsx
<Panel key={isUser ? "user" : "guest"} kind={isUser ? "user" : "guest"} />
```

**Follow-up:**

Key changes on `Panel` which renders a `textarea` with its own `useState`. Does the textarea keep text?

Answer: No. Remounting `Panel` destroys its subtree—focus and local state included. Lift state that must survive.

### REACT-014 — Two conditional slots are two positions

**Difficulty:** Senior

**Category:** State preservation

**Question:**

`Editor` drafts from `doc.text`. Compare ternary switching `docA`/`docB`, two `&&` editors, and one `<Editor doc={tab === "a" ? docA : docB} />` when switching A→B→A.

**Answer:**

Ternary and single `<Editor doc={…}>`: one position—fiber kept; draft from A’s `useState(doc.text)` sticks when props describe B. Two `&&` editors: two sibling slots; switching unmounts one and mounts the other, so returning to A re-reads `docA.text` and loses typed text. Use `key={doc.id}` to remount per document, or lift a draft map by id above the branch.

**Code:**

```tsx
<Editor key={tab} doc={tab === "a" ? docA : docB} />
```

**Trade-offs:**

CSS-hidden dual editors keep both drafts (and effects). Parent `Record<id, draft>` keeps drafts without a hidden tree.

**Follow-up:**

`Editor` moves from under `TabPanelA` to under `TabPanelB`. Does the draft move?

Answer: No. State is on the fiber at a position. Unmount destroys it; remount creates a new fiber. Lift state above both panels.

### REACT-015 — Render describes, commit applies

**Difficulty:** Senior

**Category:** Render and commit

**Question:**

What work is render vs commit? Which phase can run for an update the user never sees? Where do a layout DOM read and a subscription belong?

**Answer:**

Render calls components and reconciles fibers—no DOM writes. Concurrent render can pause, restart, or discard; the user never sees a discarded pass. Commit applies DOM, attaches refs, runs `useLayoutEffect` before paint, then `useEffect` after a paint opportunity. Commit is not interruptible. Put subscriptions in `useEffect` or handlers; put layout reads/writes that must match before paint in `useLayoutEffect`. Keep the component body pure.

**Follow-up:**

`useLayoutEffect` calls `setState`. Does the user see the first committed tree?

Answer: No—React flushes that update synchronously before paint. The same `setState` in `useEffect` can paint the intermediate tree first.

### REACT-016 — A fiber is the unit of work

**Difficulty:** Advanced

**Category:** Fiber

**Question:**

What is a fiber vs a JSX element? Why replace the stack reconciler? What is `alternate` for?

**Answer:**

A fiber is the mutable work node for one instance (type, props, hook list, child/sibling/return, commit flags). Elements are cheap per-render descriptions. Fiber lets React pause/resume/abandon work instead of a recursive stack walk. Double buffering: current vs work-in-progress; `alternate` links twins; commit swaps. State follows the fiber (position/type/key), not element identity.

**Follow-up:**

If render writes only work-in-progress, how can an impure render still corrupt the screen?

Answer: Impurity wrote elsewhere (module vars, stores, mutated shared objects). Discarding WIP does not undo those writes. Purity makes discard safe.

### REACT-017 — Render can yield; commit runs through

**Difficulty:** Advanced

**Category:** Fiber

**Question:**

Under concurrent rendering, a transition render is in progress and the user clicks. What happens to the in-progress render? Mid-commit? Do effect cleanups run for a thrown-away render?

**Answer:**

React may abandon WIP and start an urgent render; already-run component returns are discarded; last committed DOM stays. Commit does not yield—DOM, refs, and layout effects finish. Discarded renders never ran effects, so no cleanup for that pass. Body-started fetches have no React cleanup. Yielding is heuristic, not promised per fiber.

**Follow-up:**

Why does Strict Mode remount effects on mount if discarded renders never run effects?

Answer: Different mechanism: a development mount/cleanup/remount check for missing cleanup—not scheduler abort. Production mounts once.

### REACT-018 — Transitions keep the keystroke urgent

**Difficulty:** Senior

**Category:** Scheduling

**Question:**

A controlled input updates `query` and filters a huge table from the same update; typing stalls. How keep input urgent and table interruptible? What do you give up? What does this not speed up?

**Answer:**

Keep `setQuery` urgent; mark table work with `startTransition` or pass `useDeferredValue(query)` to the heavy child. React can commit the input first and interrupt stale table renders. Trade: brief stale rows / `isPending`. Does not make the filter faster, debounce network, or fix mounting 20k rows—window or simplify that separately. Never put the input setter inside the transition.

**Code:**

```tsx
const [query, setQuery] = useState("");
const deferredQuery = useDeferredValue(query);
// input uses query; Table uses deferredQuery
```

**Follow-up:**

How does `useDeferredValue` differ from copying in `useEffect`?

Answer: Effect copy schedules an ordinary second urgent render after paint. Deferred value is scheduled as a transition and can be interrupted by the next keystroke.

### REACT-019 — Lanes are the internal priority model

**Difficulty:** Staff-Level

**Category:** Scheduling

**Question:**

What is a lane in React 18 at a level you can defend: what an update carries, how render chooses work, how urgent vs transition interact, and what is public API?

**Answer:**

Internally, updates are tagged with lanes (priority + batch). A render selects pending lanes; others stay queued—so a click can commit while a transition is abandoned. Discrete input outranks transitions; expiration prevents starvation. Bit layouts are not app API. Rely on `startTransition`/`useTransition`, `useDeferredValue`, `useSyncExternalStore`. Same-priority batching still applies; lanes decide which pass and interruptibility.

**Follow-up:**

Why can an external store tear, and what does `useSyncExternalStore` change?

Answer: Different components can read different snapshots across urgent/deferred passes. `useSyncExternalStore` re-reads `getSnapshot` and forces a sync re-render if it changed so the commit is consistent. Cache the snapshot—new objects every call look like perpetual change.

### REACT-020 — A parent render runs child functions

**Difficulty:** Intermediate

**Category:** Rendering

**Question:**

Parent state changes. `Child` gets the same primitive props, no state, no `memo`. Does Child run? Is the DOM rewritten? What to change first if the profiler is hot?

**Answer:**

`Child`’s function still runs. A parent render creates new child elements and reconciles them; equal primitive props alone do not skip the call. Commit rewrites host DOM only where rendered output changed—so the cost is JS/reconciliation, not a full DOM rebuild. First fix structure: move updating state down so expensive siblings are not children of that component. Reach for `memo` only after a profile shows the child is expensive with usually unchanged props.

**Trade-offs:**

Default re-render until measured. State colocation beats blanket `memo`/`useCallback`. New object/callback props defeat `memo`.

**Follow-up:**

`memo(Child)` also uses `useContext(ThemeContext)`. Provider value changes, props unchanged. Skip?

Answer: No. `memo` compares props; context is not a prop. Consumers still re-render when the value changes.

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

Hooks are a linked list on the fiber, matched by call order. The first render called `useState` and stored `open` in slot 0. The second returns before `useState`, so React expects that slot and throws (fewer hooks than last render). Early `return null` is fine for the element tree, illegal for hooks. Call every hook unconditionally, then return `null`. React does not match hooks by the variable name `open`.

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

Answer: Those three slots appear/disappear in the caller’s list. Same violation as conditional `useState`. Call custom hooks unconditionally.

### REACT-022 — The timeout closes over the render that scheduled it

**Difficulty:** Senior

**Category:** State

**Question:**

Three clicks within 500ms each schedule `setTimeout(() => { console.log(count); setCount(count + 1); }, 500)` with `count` starting at `0`. What logs and what is final `count`?

**Answer:**

Each click runs a handler from the render where `count` is still `0`. The handler only schedules a timer—no `setCount`—so there is no re-render between clicks. All three timers close over `0`, log `0`, and call `setCount(1)`. First commits `1`; later updates bail out via `Object.is(1, 1)`. Final value is `1`. Functional `setCount(c => c + 1)` yields final `3`; the log still prints closed-over `0`.

**Code:**

```tsx
setTimeout(() => {
  console.log(count); // closed-over snapshot
  setCount((c) => c + 1);
}, 500);
```

**Follow-up:**

Functional updater + `console.log(count)` after the same three overlapping clicks?

Answer: Three logs of `0`, final count `3`. Log reads the closure; updater reads pending/committed state per task.

### REACT-023 — Same state skips the render

**Difficulty:** Intermediate

**Category:** State

**Question:**

`count` is `0` and handler calls `setCount(0)`. Object state: `setPair({ n: 0 })` vs mutate then `setPair(pair)`?

**Answer:**

`useState` bails out when the next value is `Object.is`-equal to the current one. `setCount(0)` skips. `setPair({ n: 0 })` allocates a new object—different reference—so React re-renders; there is no deep compare. Mutating `pair.n` then `setPair(pair)` passes the same reference: bailout, while the mutation is already visible and the UI can stay stale. A parent render can still call this component. Return `prev` from an updater when nothing changed so bailout can apply.

**Follow-up:**

`setCount(c => c)` when `c` is `0`? Updater returns `{ ...c }` for object state?

Answer: Returning `c` bails out. A new object does not, even with identical fields.

### REACT-024 — The key has to sit on the sibling

**Difficulty:** Advanced

**Category:** Reconciliation

**Question:**

Mapping items to `<> <dt key={item.id}>…</dt><dd>…</dd> </>` inside a `<dl>`—what is wrong when the list reorders and rows will hold state? Why not wrap in a `<div>`?

**Answer:**

Shorthand `<>` accepts no key; the array’s children are unkeyed fragments, so siblings fall back to index identity. The `key` on `dt` only names children inside that fragment. Reorders reuse the fragment at that index—row state sticks to position. Put `key` on the array’s direct child via `<Fragment key={item.id}>`. A keyed `<div>` wrapper keys correctly but breaks the `<dl>` content model and accessibility tree.

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

Answer: Shorthand compiles with no props/key. Explicit `Fragment` accepts `key`/`children`—a compile-time difference; reconciliation treats a keyed fragment as a normal keyed sibling.

### REACT-025 — The draft followed the index, not the id

**Difficulty:** Staff-Level

**Category:** State preservation

**Question:**

Fifty `Line` rows use `useState(item.amount)` and `key={index}`. After blur, parent batches `setLines(payload.lines)` (reordered) and `setSavedAt`. Typed draft for id `"L3"` appears on another id. Why? How keep draft with `"L3"`? How force server amount instead?

**Answer:**

Batched promise updates are one render; keys decide fiber identity. Index keys keep the fiber at position 2 with its draft while a different item arrives. `useState` never re-reads the prop. Fix: `key={item.id}`. To overwrite draft with server amount without remount, adjust state during render when `item.amount` changes (guard so the restart settles); or remount with a versioned key (drops focus too).

**Code:**

```tsx
{lines.map((item) => (
  <Line key={item.id} item={item} />
))}
```

**Follow-up:**

Id-keyed fiber still shows typed draft after server amount change. Why, and how paint server amount before paint without remounting?

Answer: Type/key matched so state was preserved. Set draft during render when the seen server amount changes so React restarts before paint; a key including amount remounts instead.

### REACT-026 — `children` is an element the parent already created

**Difficulty:** Intermediate

**Category:** Props

**Question:**

`<Card><Counter /></Card>` with `{children}` inside `Card`. Who creates `Counter`, when does it run, where is state? Difference of `{children}`, `{children()}`, `<children />`?

**Answer:**

Parent of `Card` creates the `Counter` element during its render—no call yet. `Card` places that element; React renders `Counter` under `Card`’s position—state lives there. `{children}` renders the passed node. `{children()}` means the parent passed a function (must stay pure). `<children />` means `children` is a component type—an element object is not a type; a new function identity each render remounts.

**Follow-up:**

`Card` renders `{children}` in two sibling slots. Shared state? Shared ref?

Answer: Two fibers, two states. They share the element object only. A ref cannot attach to both mounts.

### REACT-027 — A fragment has no host node

**Difficulty:** Intermediate

**Category:** Reconciliation

**Question:**

Returning `<>…</>` instead of a `<div>`: what is in the DOM? What fiber? Can React 18 put `onClick` or `ref` on the fragment?

**Answer:**

A fragment is a fiber (`React.Fragment`) with children and a place in the React tree, but no host instance. Commit places its host descendants into the nearest host parent—no extra box, CSS target, or native listener. Replacing a fragment with a `<div>` (or reverse) changes host structure and remounts that child subtree. React 18: no `ref` or `onClick` on fragments (React 19 allows fragment refs). `<>` cannot take props; use explicit `Fragment` when you need a key.

**Follow-up:**

Return `<> <span/> </>` then `<div><span/></div>`. Does span state survive?

Answer: Component fiber may survive, but fragment→`div` is a child type change—that subtree remounts. Span state under the fragment is gone.

### REACT-028 — Two arrays are one sibling list

**Difficulty:** Senior

**Category:** Keys

**Question:**

Two maps under one `div`—`todos` and `done`—can share string ids; each `Row` has a draft. Why do drafts cross? How namespace keys? What does one `<>` around both maps do?

**Answer:**

The `div`’s children are two arrays; React flattens them into one sibling list before matching keys. The same id in `todos` and `done` is a duplicate key—reconciliation may reuse the wrong fiber, so drafts cross lists. Wrap each map in a keyed `Fragment` (or host/component) so each group has its own child list. One `<>` around both maps is still one fragment whose arrays flatten together—same collision.

**Code:**

```tsx
<Fragment key="open">{todos.map(...)}</Fragment>
<Fragment key="done">{done.map(...)}</Fragment>
```

**Follow-up:**

Move id `"a"` from open to done with keyed fragments. Does the draft move?

Answer: No. Keys match within one parent. Open unmounts; done mounts. Lift draft by id or use one shared sibling list to move the fiber.

### REACT-029 — State does not follow an element across parents

**Difficulty:** Senior

**Category:** State preservation

**Question:**

Board flips which `Column` gets `<Editor id="a" />` vs `"b"`. After flip, which draft appears where? What tree keeps drafts with ids?

**Answer:**

Each column’s child slot keeps its fiber (same type/position)—left keeps a’s draft but now gets `id="b"`. Elements moved; fibers did not. `key={id}` under separate parents remounts on key change; it does not teleport. Keep editors as keyed siblings of one parent so React moves fibers with ids, or lift draft state by id.

**Code:**

```tsx
{(flipped ? ["b", "a"] : ["a", "b"]).map((id) => (
  <Editor key={id} id={id} />
))}
```

**Follow-up:**

Keyed editors under a `div` that becomes a `section`—drafts survive?

Answer: No. Host type change unmounts that fiber and its children. Keys are local to the current parent’s child list.

### REACT-030 — Context updates consumers; passed children bound the rest

**Difficulty:** Senior

**Category:** Context

**Question:**

`ThemeProvider` holds theme and renders `{children}`. App passes `<Layout />` as children; `Title` inside Layout consumes context. Who runs on `setTheme`? What if `value={{ theme }}`? What if App holds theme and writes Provider + Layout itself?

**Answer:**

Provider re-renders; same `children` element reference lets React skip `Layout`; `Title` still runs as a consumer. `value={{ theme }}` new object every time wakes all consumers even if `theme` string is unchanged—stabilize with `useMemo` or pass the string. If App owns theme and renders Layout, App’s re-render runs Layout (parent render), separate from the context subscription rule. `memo` on a consumer does not block context.

**Follow-up:**

No provider; default `"light"`. Then `<Provider value={undefined}>`. What does `useContext` return?

Answer: `undefined`. Default applies only with no provider above. A provider passing `undefined` still wins.

### REACT-031 — Strict Mode's extra render stays in development

**Difficulty:** Senior

**Category:** Rendering

**Question:**

Under `<StrictMode>` in development: body, `useState` initializer, updater, and `useEffect`—how often each, what commits? Production? vs abandoned transition?

**Answer:**

Strict Mode’s extra work is development-only. Inside the subtree, React may call the body, `useState`/`useMemo`/`useReducer` initializers, and state updaters twice and keep one result. On mount, effects run setup → cleanup → setup to surface missing cleanup. One tree commits; event handlers are not double-invoked. Production mounts and runs once. An abandoned transition is a different production mechanism: that pass never committed, so it has no effect cleanup.

**Follow-up:**

Initializer `fetch`es into state. How many requests in development?

Answer: Two requests start; one return value is kept in the single slot. Do not fetch in initializers—use effects with abort or event handlers.

### REACT-032 — `createRoot` is a different root from `ReactDOM.render`

**Difficulty:** Senior

**Category:** Roots

**Question:**

App still mounts with `ReactDOM.render`. Which React 18 behaviors are missing? Supported mount/update/unmount? When does server HTML change the API?

**Answer:**

`ReactDOM.render` is legacy in React 18: that tree runs React 17 mode—no concurrent renderer, no automatic batching outside React events, transitions not interruptible. Supported client mount: `createRoot(container)` once, then `root.render` / `root.unmount`. No third-argument render callback. Server-rendered markup uses `hydrateRoot(container, <App />)`. Calling `createRoot` on a container full of server HTML replaces those children instead of attaching.

**Code:**

```tsx
const root = createRoot(container);
root.render(<App />);
root.unmount();
```

**Follow-up:**

One click updates state in two `createRoot` trees. One render?

Answer: No. Separate trees, renders, commits, context, and error boundaries. Batching does not cross roots.

### REACT-033 — The same props object skips the child

**Difficulty:** Senior

**Category:** Rendering

**Question:**

`Frame` holds count and renders `{children}`; outer parent passed `<Heavy />` and does not re-render with count. Does Heavy run? Why does a parent writing `<Heavy n={1} />` each time behave differently? Mutating the children element?

**Answer:**

Unchanged children element/props reference → React can skip calling Heavy. A parent that evaluates `<Heavy n={1} />` allocates new element/props every time—function runs even if `n` is still `1`. Mutating props on the same reference keeps the skip while UI can stay stale. Different from `Object.is` state bailout. Context updates still wake consumers.

**Follow-up:**

Skipped Heavy via same children reference reads ThemeContext; value changes. Does Heavy run?

Answer: Yes. Context is an update for that fiber even when the props reference is unchanged.

### REACT-034 — A new prop reference defeats `memo`

**Difficulty:** Senior

**Category:** Rendering

**Question:**

`memo(Heavy)` gets same `title`, plus `options={{ dense: true }}`, `onSelect={() => select(id)}`, and child `<Icon />`. Which still skip? Custom compare `true` means? Mutate `options` and pass same object?

**Answer:**

Default `memo` shallow-compares each prop with `Object.is`. Same `title` string matches. `options={{ dense: true }}`, `onSelect={() => …}`, and `<Icon />` as children are new references every parent render—any one fails the compare. A custom compare returns `true` when props are equal (skip)—opposite of `shouldComponentUpdate`. Mutating `options.dense` and passing the same object skips while the UI stays on the old density. Stabilize callbacks/objects, or stop allocating fresh `children` elements.

**Follow-up:**

Custom compare always returns `true`, including when `title` changes. What does the user see?

Answer: Previous title—React obeyed the compare. The compare is wrong, not `memo`.

### REACT-035 — A list can hold different component types

**Difficulty:** Senior

**Category:** Reconciliation

**Question:**

Feed keyed by id chooses `TextBlock`/`ImageBlock`/`PollBlock` by `kind`. Kind `"b"` goes text→poll with key `"b"`. No keys, insert Image at index 0 in front of two Texts?

**Answer:**

React matches by key, then requires the same component type. Key `"b"` finds the fiber, but `TextBlock` → `PollBlock` remounts—draft dies, which is correct across widgets. Without keys, insert at index 0: that position remounts on type change; later same-type indexes reuse fibers and show the wrong row’s draft as items shift. Put `key={block.id}` on the typed element the map returns.

**Code:**

```tsx
{blocks.map((block) => {
  const View = block.kind === "image" ? ImageBlock : TextBlock;
  return <View key={block.id} block={block} />;
})}
```

**Follow-up:**

Both kinds return `<article>`; kind changes under same key. Does the article DOM node survive?

Answer: No. Component type change unmounts the whole previous subtree. Host nodes are not matched across the old component’s DOM.

### REACT-036 — The input shows the value from this render

**Difficulty:** Intermediate

**Category:** Inputs

**Question:**

`<input value={text} onChange={…}>` ownership? Omit `onChange`? vs `defaultValue`? Later new `defaultValue` after typing?

**Answer:**

`value={text}` is controlled: this render’s state is the source of truth; commit writes it to the DOM. If `onChange` does not update that state, React snaps the DOM back; missing `onChange` warns—use `readOnly` for intentional display. `defaultValue` is uncontrolled: initial DOM value at mount only; later prop changes do not push. Switching controlled↔uncontrolled warns. Prefer `value={maybe ?? ""}`. Remount with `key` to re-apply `defaultValue`.

**Code:**

```tsx
<input value={text} onChange={(e) => setText(e.target.value)} />
```

**Follow-up:**

Handler `setText(e.target.value)` and also reads `e.target.value` into a ref for a count—allowed?

Answer: Yes—event handlers run on the committed tree after the browser applied the keystroke. Put the count in state if it must render.

### REACT-037 — Render does not read the DOM

**Difficulty:** Senior

**Category:** Render and commit

**Question:**

Tooltip computes `top` from `ref.current?.getBoundingClientRect()` in the body. Why wrong on first render, after moves, and on the server? Where should the read live?

**Answer:**

Render turns props/state into a description—it must not inspect the document. On the first pass `ref.current` is still `null`, so `top` is `0` and that commits. On updates the ref still points at the previous commit’s box while this render runs. The server has no layout/`document`. Read in `useLayoutEffect` so `setState` flushes before paint; `useEffect` can flash the wrong position. Discarded impure measurements can also leak through module writes.

**Code:**

```tsx
useLayoutEffect(() => {
  setTop(ref.current?.getBoundingClientRect().top ?? 0);
}, [label]);
```

**Follow-up:**

Also branch on `typeof window` for width under SSR+hydration?

Answer: Server/client descriptions disagree—hydration mismatch. Keep first client render matching server; adjust in layout effects after match.

### REACT-038 — The initializer runs when the slot is created

**Difficulty:** Intermediate

**Category:** State

**Question:**

`useState(buildList(seed))` vs `useState(() => buildList(seed))`. When does `buildList` run? If `seed` changes while mounted? Strict Mode? What must it not do?

**Answer:**

Eager form runs every render (result ignored after mount). Lazy form runs once when the slot is created—not when `seed` changes. Remount (key/type/unmount) runs it again. Strict Mode may call twice in development—keep pure; no fetch/random/module mutation. Reset via derive, `key={seed}`, or guarded render-time adjust—not by expecting the initializer to track props.

**Follow-up:**

Initializer closes over `seed` and `query` above it; `query` changes. List updates?

Answer: No. Initializer already ran with mount-time `query`. Derive, key, or update from the event that changed `query`.

### REACT-039 — Setting state during render restarts this pass

**Difficulty:** Senior

**Category:** State

**Question:**

During render, when `item.id !== prevId`, call `setPrevId` and `setDraft`. Allowed? Frame of old draft? Unconditional every render? Calling parent’s `setSelected`?

**Answer:**

Allowed when adjusting this component’s own state to a newly seen prop/store snapshot, if the condition is false after restart. React discards the in-progress render and re-renders before paint—no frame of the old draft. Unconditional sets loop until “too many re-renders.” Calling another component’s setter during render is unsupported—use an event or an effect. Prefer this over copying in `useEffect`, which can paint the stale draft for a frame.

**Code:**

```tsx
if (item.id !== prevId) {
  setPrevId(item.id);
  setDraft(item.text);
}
```

**Follow-up:**

Same id, server normalizes `item.text`. How show it before paint without remount?

Answer: Compare incoming text/version to stored snapshot and set draft during render so restart commits the new text. Key change also works but remounts.

### REACT-040 — `ref.current` is written in commit

**Difficulty:** Senior

**Category:** Refs

**Question:**

When is `ref.current` set for `<input ref={inputRef} />`? First render vs next? What does an inline callback ref do each commit / under Strict Mode?

**Answer:**

Object refs are stable; React assigns `.current` in commit before layout effects. First render still sees `null`; later renders see the previous commit’s node. Callback refs run with the node on attach and `null` on detach; a new function identity each render detaches/reattaches every commit (Strict Mode adds extra attach/detach in dev). Do not `setState` from an unstable callback. Reading `.current` in render is the previous commit, not this one’s node.

**Follow-up:**

`<input ref={…}>` then `<textarea ref={…}>` same position. After second commit, what is `.current`?

Answer: The textarea. Host type change detaches the input and attaches the textarea; uncontrolled value/focus on the input are gone.

### REACT-041 — A click outranks a scroll update

**Difficulty:** Advanced

**Category:** Scheduling

**Question:**

React `onClick` vs `onMouseMove` both `setState`. How does React 18 prioritize? What does `startTransition` inside either change? Does priority debounce mousemove?

**Answer:**

Discrete events (click/keydown/input) outrank continuous ones (mousemove/scroll/wheel). A click is not stuck behind an unbounded move queue. `startTransition` marks those updates lower than both—keep the click’s own setState outside. Priority is not debounce: every `setState` still schedules work; colocating/ref-DOM updates reduce cost. Discrete updates also flush passive effects before the next discrete input.

**Code:**

```tsx
setOpen(true);
startTransition(() => setChartData(compute(points)));
```

**Follow-up:**

Fifty `onScroll` `setScrollTop`s then a click—what about the click vs scrolls?

Answer: Click is discrete and scheduled ahead of the continuous stream. Fix expensive scroll by rendering less per update, not by raising scroll to discrete priority.

### REACT-042 — A render error is caught above; a handler error is not

**Difficulty:** Senior

**Category:** Errors

**Question:**

Child throws while rendering. What catches it? Does the same catch `onClick`, fetch rejection, or `useEffect` throws? Can a function component be the boundary?

**Answer:**

Class boundaries with `getDerivedStateFromError`/`componentDidCatch` catch render/lifecycle throws of descendants and show fallback; failed output is not committed. Function components cannot be boundaries in React 18. Handler throws, promise rejections, and effect throws are not render errors—catch locally and set error state if UI must change. Log/retry from `componentDidCatch` or UI, not from `getDerivedStateFromError`.

**Code:**

```tsx
static getDerivedStateFromError(error: Error) {
  return { error };
}
```

**Follow-up:**

Fallback showing; Retry only clears `error`. What else for the child to succeed?

Answer: Clearing error re-renders children. Retry works only if the cause changed or the child handles it—same throw is caught again.

### REACT-043 — `hydrateRoot` attaches to the server HTML

**Difficulty:** Senior

**Category:** Hydration

**Question:**

Server HTML already in `#root`. What does `hydrateRoot` do vs `createRoot().render`? Mismatched text/nodes? Attribute mismatch?

**Answer:**

`hydrateRoot` attaches fibers/handlers to existing markup; first client render must match. `createRoot` replaces container contents. Structural text/node mismatches in React 18 client-render from the nearest Suspense boundary (or root)—server HTML for that subtree is discarded. Attribute mismatches warn; `suppressHydrationWarning` is one-element, not a tree ignore. Causes: `window`/`Date`/`random`, divergent data, browser-fixed invalid nesting.

**Code:**

```tsx
hydrateRoot(container, <App />);
```

**Follow-up:**

`suppressHydrationWarning` on a `<p>`; child `<span>` also differs. Covered?

Answer: No—only that element’s own text/attributes. The span needs to match or have its own suppression reason.

### REACT-044 — An urgent update and a transition are two passes

**Difficulty:** Senior

**Category:** Scheduling

**Question:**

`setQuery(event.target.value)` then `startTransition(() => setResults(filter(...)))`. One render like two ordinary setters? What can the screen show? If `setQuery` moves inside the transition?

**Answer:**

Not one batch—different priorities. `setQuery` is discrete; `setResults` is a transition. React can commit the input first and render the list later; mixed frames show the new query with previous results. A later keystroke can abandon in-flight list work. Both reads of `event.target.value` see the same string. Moving `setQuery` inside `startTransition` defers the caret. `isPending` is transition status, not a network flag.

**Code:**

```tsx
const next = event.target.value;
setQuery(next);
startTransition(() => setResults(filter(next)));
```

**Follow-up:**

Transition list throw after input already committed. Input revert? Where does error surface?

Answer: Input stays. Transition errors retry sync for reporting; a list boundary can show fallback without undoing the query commit.

### REACT-045 — After unmount, that setter does not paint

**Difficulty:** Senior

**Category:** State

**Question:**

Effect fetches then `setProfile` in `.then`. User navigates away; response arrives later. React 18 behavior? What must still be cancelled?

**Answer:**

The setter belongs to that fiber. After unmount it does not paint or remount a new instance; React 18 no longer warns. Silence is not a canceled request—the fetch still runs. Abort in effect cleanup (`AbortController`) and/or ignore stale generations so an old `.then` cannot overwrite a newer id. Promise rejections are not caught by error boundaries. Strict Mode’s development remount needs the same cleanup.

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

Answer: Per-run flag/controller protects that run. One shared flag flipped by old cleanup can also ignore the newest response—use a generation per effect run.

### REACT-046 — A matching host type updates the same DOM node

**Difficulty:** Senior

**Category:** Reconciliation

**Question:**

`<div className style={{ color }}>` re-renders with new class/style object—destroy node? Scroll/focus? Become `section`? `dangerouslySetInnerHTML` plus children?

**Answer:**

Same host type, position, and key: React keeps the DOM node and updates changed props. A new `style={{ color }}` object does not remount—React diffs style fields. Scroll, focus, and selection stay. Changing `div` to `section` (or changing `key`) replaces the node and drops browser state and child fibers. Do not pass React children and `dangerouslySetInnerHTML` together—two owners of the same child list.

**Follow-up:**

Child goes string `"Hello"` → `<span>Hello</span>` → string. DOM?

Answer: Text node vs element are different child types—React replaces nodes each way. Matching spans would update text in place.

### REACT-047 — A portal moves the DOM node, not the fiber

**Difficulty:** Advanced

**Category:** Portals

**Question:**

`createPortal(<Dialog />, document.body)`. Dialog state/context? Parent `onClick` vs native listener on the React root DOM node? Parent re-render—state kept?

**Answer:**

Portal commits host nodes into `domNode` but fiber parent stays the portal renderer—context and error boundaries follow the React tree. State survives while type/key match. React events bubble through fibers (parent `onClick` runs). Native listeners on the root container miss DOM bubbling from `body`; `document` listeners see it. Portal does not change batching/keys/state ownership.

**Code:**

```tsx
return createPortal(children, document.body);
```

**Follow-up:**

Same element rendered through portal and as a normal child. Shared state?

Answer: No—two positions, two fibers. Portal only changes DOM parent of its position.

### REACT-048 — `value={undefined}` is still providing a value

**Difficulty:** Intermediate

**Category:** Context

**Question:**

`createContext("edit")`. No provider; provider `value={undefined}`; nested providers `"edit"` outside and `"view"` inside. What does `useContext` return?

**Answer:**

With no provider above, `useContext` returns the `createContext` default (`"edit"`). `<Provider value={undefined}>` is still a provider—the consumer reads `undefined`, not the default. Nested providers: nearest wins (`"view"`). Updates wake consumers of the provider they actually read. Providers and consumers match by context object identity—create the context once at module scope and import that reference.

**Code:**

```tsx
const Mode = createContext<string | null>(null);
const mode = useContext(Mode); // null ⇒ no provider if that is your sentinel
```

**Follow-up:**

Module `Mode` provided; component creates another `createContext("edit")` and `useContext`s that. What is read?

Answer: That object’s default `"edit"`. Provider/consumer match by reference, not by the string value or variable name.

### REACT-049 — Two roots do not share a batch

**Difficulty:** Senior

**Category:** Roots

**Question:**

Two `createRoot` trees; one click calls a setter from each. How many renders/commits? Can root1’s error boundary catch root2 render throws? Can root2 read root1 context?

**Answer:**

Each `createRoot` is a separate fiber tree with its own render and commit. Two setters are two updates—both may flush before the next paint for that discrete click, but they are still two commits. An error boundary in root1 cannot catch a render throw in root2. Context does not cross roots. Portals stay in one tree; a second root cuts it. Create each root once and update with `root.render`.

**Follow-up:**

`flushSync(() => setOpen(true))` in root1, then root2’s setter. DOM of root1 when root2’s setter runs?

Answer: Root1’s update is committed before `flushSync` returns. Root2 has not rendered yet from that setter. Roots are still not one fiber tree.

### REACT-050 — The sort wrote through the state array

**Difficulty:** Staff-Level

**Category:** State

**Question:**

Render mutates `people.sort(...)` when `sort === "name"`; `people` is the module `initial` array. Toggle sort to name then back to id; Reset with `setPeople(initial)`. Why list stuck? Why keys aren’t the bug? Fix?

**Answer:**

`sort` mutates the shared array in place—`initial` is rewritten to A,B. Toggling flag back does nothing; order is already mutated. Reset bails out (`Object.is` same reference) and no pristine copy remains. Keys are fine; there is no row state confusion. Derive a copy: `[...people].sort(...)`, initialize with a copy, reset with a fresh copy—never mutate state during render.

**Code:**

```tsx
const shown =
  sort === "name"
    ? [...people].sort((p, q) => p.name.localeCompare(q.name))
    : people;
```

**Follow-up:**

Handler does `setPeople([...people].sort(...))` but the render `people.sort` block remains. Still wrong?

Answer: Yes—render still mutates whatever is in state whenever the flag is `"name"`. Remove the body mutation; either the flag drives a derived copy or the handler owns order—not both with an in-place sort.
