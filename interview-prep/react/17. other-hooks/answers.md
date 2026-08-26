# Other Built-in Hooks — Answers

## Core recall

1. Complex coordinated transitions, non-trivial next-state logic, want pure/testable actions.
2. Nearest Provider’s value; re-renders when that **value** changes.
3. **`useMemo`:** memoize a value. **`useCallback`:** memoize a function reference.
4. The instance a parent receives through a **ref** on a `forwardRef` component.
5. **For:** SSR-safe unique DOM ids (a11y). **Not for:** list keys / business UUIDs.
6. Concurrent-safe subscription to **external** stores (avoid tearing).
7. **Yes** — stable `dispatch` identity.
8. Modern **Zustand** / **Redux** bindings (`useSelector`-style).

## Explain why

1. Reducer is a pure `(state, action) => next` — assert outputs without rendering.
2. Any consumer of that Context re-renders on value change; unstable value identity amplifies it.
3. Memo has cost and deps footguns; often unnecessary if children aren’t expensive/memoized.
4. Encapsulation — hide internals, expose only safe imperative methods.
5. Server and client must generate the **same** id string for hydration; random ids break that.
6. Effect subscriptions can show inconsistent snapshots under concurrent rendering; this API is designed for tearing-free reads.

## Compare and contrast

1. **State:** direct setters. **Reducer:** action → centralized transitions.  
2. **Custom hook:** reuse logic / per-instance state. **Context:** shared live value.  
3. **Memo:** skip redo when deps equal. **Each render:** always recompute.  
4. **forwardRef alone:** usually raw DOM node. **+ imperative handle:** custom object API.  
5. **`useId`:** a11y DOM id. **`key`:** reconciliation identity from data.  
6. **SyncExternalStore:** subscribe in place. **Copy to useState:** extra sync layer, easier to get wrong under concurrency.

## Predict / choose the hook

1. **`useReducer`**  
2. **`useContext`** (or store)  
3. **`useCallback`** (often with `memo` child)  
4. **`forwardRef` + `useImperativeHandle`**  
5. **`useId`**

## Debugging

1. Memoize context value (`useMemo`) or split state/setter contexts; avoid inline object each render.  
2. Use `useImperativeHandle` to expose `{ shake }` instead of raw node (or wrap).  
3. Replace with **`useId`**.  
4. **`useSyncExternalStore`** or a library that uses it.

## Application

1.
```jsx
function reducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 };
    case 'reset':
      return { count: 0 };
    default:
      return state;
  }
}
const [state, dispatch] = useReducer(reducer, { count: 0 });
```

2. `const LocaleContext = createContext('en');` Provider `value={locale}`; child `useContext(LocaleContext)`.  
3. As in notes — `focus` method on handle.  
4. `const id = useId();` `htmlFor={id}` / `id={id}`.  
5. Memo: “stabilize expensive values or callbacks for memo children.” SyncExternalStore: “concurrent-safe external store reads.”

## Interview questions

1. **Spoken:** Complex multi-field or action-shaped updates; pure reducer for tests/debug.  
2. **Spoken:** Re-render when nearest Provider value changes — watch value referential stability.  
3. **Spoken:** Memoize values/functions for equality across renders; mainly perf/memo children — not by default.  
4. **Spoken:** With `forwardRef`, define the ref API (`focus`, `clear`) instead of leaking DOM.  
5. **Spoken:** Stable unique ids that match SSR for labels/inputs.  
6. **Spoken:** Subscribe to non-React stores without concurrent tearing; basis for modern state libs.

## Connections

1. Still immutable updates / bail-outs; dispatch queues updates like setState.  
2. Hooks reuse logic; Context shares one value — often `useX` reads context.  
3. Stable callbacks help `memo` skip child renders — re-render vs DOM / pure-components story.  
4. Refs hold nodes; imperative handle shapes what parents call.  
5. Concurrent/Fiber can interleave work — external store API prevents inconsistent reads mid-render.
