# `useRef` in Depth — Answers

## Core recall

1. A stable `{ current }` object for that hook slot — **same object** every render; `.current` is mutable.
2. **Mutable non-UI memory** across renders, and **DOM/imperative** access.
3. **No.**
4. When it should **drive what’s on screen** / cause updates when it changes.
5. Keep a long-lived interval/subscription while always invoking the **latest** callback without re-subscribing on every callback identity change.
6. After the host node mounts (commit); cleared on unmount — not reliably available during the first render pass.
7. Mutating the ref doesn’t re-render, so JSX still shows the old rendered number.
8. Impure under double-render / concurrent discard; UI can disagree with “logical” counts.

## Explain why

1. They’re an escape hatch **outside** the reactive UI pipeline — bookkeeping shouldn’t force diff/paint work.
2. Changing the id isn’t UI; putting it in state would cause useless re-renders.
3. So `.current` always points at the newest function while the interval effect stays tied to `delay` only.
4. Deps compare the **ref object** identity, which doesn’t change when `.current` does.
5. Clicks must update visible text → need a re-render → state.
6. Render runs twice; each write increments again → inflated / inconsistent display.

## Compare and contrast

1. **State:** reactive UI. **Ref:** mutable memory, no auto re-render.  
2. **DOM:** React assigns `current` to a node. **Value:** you assign whatever bookkeeping you need.  
3. **Ref latest:** stable subscription. **Dep on callback:** recreate interval whenever function identity changes.  
4. **Controlled:** state each keystroke. **Uncontrolled + ref:** read DOM when needed.  
5. **Handler read:** fine for imperative actions. **Render use for UI:** should usually be state.

## Predict the behavior

1. Still shows **0** (or initial render value) — no re-render.  
2. **Yes** — same ref object.  
3. **No** — interval effect deps only `[delay]`; callback updates go through the ref.  
4. Typically **`null`** — not attached until after commit.

## Debugging

1. Value needed for UI was stored in a ref — switch to state (or force update, but prefer state).  
2. `.current` changes don’t change deps — use state, or an effect that copies into state, or don’t use deps for that.  
3. Focus in `useEffect` / `useLayoutEffect` after mount, with optional chaining.  
4. Don’t drive UI from render-time ref writes; use state or count in an effect for diagnostics only.

## Application

1.
```jsx
const inputRef = useRef(null);
useEffect(() => {
  inputRef.current?.focus();
}, []);
return <input ref={inputRef} />;
```

2. As in notes: `savedCallback` effect + interval effect on `[delay]`.  
3. `const [count, setCount] = useState(0); onClick={() => setCount(c => c + 1)}`.  
4.
```jsx
const prev = useRef(count);
useEffect(() => {
  prev.current = count;
}, [count]);
```
5. “Remember something across renders without showing it or re-rendering for it (or hold a DOM node).”

## Interview questions

1. **Spoken:** Refs are outside render/diff; mutating `.current` doesn’t schedule updates — perfect for timer ids, flags, DOM nodes; use state for UI.  
   **Follow-ups:** Bad on-screen counter; `inputRef` + focus.

2. **Spoken:** Store latest `callback` in a ref updated by effect; interval calls `savedCallback.current()` and only depends on `delay`.

3. **Spoken:** Visible/reactive → state; bookkeeping/DOM → ref.

4. **Spoken:** Breaks purity; StrictMode/concurrent can double or discard work; UI tied to impure writes.

5. **Spoken:** Read `ref.current` after commit in effects/layout effects for focus/measure; null-check.

## Connections

1. Render-time ref writes for display violate the same purity StrictMode probes.  
2. Ref holds latest function so long-lived effects don’t close over a stale callback.  
3. `forwardRef` passes the ref through so parents can imperative-call into children.  
4. One hook list node; stable returned object.  
5. State ⇒ re-render (maybe DOM); ref ⇒ no re-render by design — choose based on whether UI must change.
