# 09. Other built-in hooks (working knowledge)

> Source: `interview-prep/react/02-hooks-deep-dive.md`

### `useReducer`

Preferred over multiple `useState` calls when:
- State transitions are complex, with multiple sub-values that change together.
- The next state depends on the previous state in non-trivial ways.
- You want to centralize/test transition logic (a reducer is a pure function, trivially unit-testable) or make debugging easier (a single dispatched action log).

```jsx
function reducer(state, action) {
  switch (action.type) {
    case 'increment': return { ...state, count: state.count + 1 };
    case 'reset': return { count: 0 };
    default: throw new Error(`Unknown action: ${action.type}`);
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, { count: 0 });
  return <button onClick={() => dispatch({ type: 'increment' })}>{state.count}</button>;
}
```

### `useContext`

Reads the nearest matching `Provider`'s value; re-renders the consuming component whenever that value changes (see chapter 03 for the "Context re-render everything" pitfall in depth).

### `useMemo` / `useCallback`

Covered in depth in chapter 04 (Performance Patterns) - memoize a computed value / a function reference respectively, to preserve referential equality across renders, primarily useful to avoid breaking `React.memo` children or avoid expensive recomputation.

### `useImperativeHandle`

Customizes what a parent sees when it attaches a `ref` to a component wrapped in `forwardRef` - used to expose a controlled imperative API (e.g., `focus()`, `scrollIntoView()`) instead of the raw DOM node.

```jsx
const FancyInput = forwardRef((props, ref) => {
  const inputRef = useRef(null);
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus(),
    clear: () => { inputRef.current.value = ''; },
  }));
  return <input ref={inputRef} {...props} />;
});
```

### `useId`

Generates a stable, unique ID string safe for SSR (matches between server and client render) - used for associating labels/inputs (`htmlFor`/`id`) without hardcoding IDs that could collide if the component renders multiple times on a page.

### `useSyncExternalStore`

The correct low-level primitive for subscribing to external stores (outside React state) in a concurrent-safe way - this is what libraries like Zustand and Redux's `useSelector` are built on under the hood in modern versions, ensuring tearing-free reads during concurrent rendering.

---
