# Pure Components and Why Purity Matters — Self-test

## Core recall

1. What does it mean for a React component render to be pure?
2. Name three kinds of side effects that must not run during render.
3. Why does StrictMode / concurrent rendering care about purity?
4. How does purity relate to `memo` / `PureComponent` / `useMemo`?
5. What do `PureComponent` and `React.memo` actually compare?
6. Why can a new function prop defeat `React.memo`?
7. How do you stabilize a random value used in UI across re-renders?
8. Is every component supposed to extend `PureComponent`?

## Explain why

1. Why can impure render + StrictMode double-invoke cause duplicate network calls?
2. Why can `memo` + a module-level mutable variable produce stale UI?
3. Why is mutating `props.items` with `.sort()` during render dangerous?
4. Why isn’t `React.memo` a substitute for keeping render pure?
5. Why move “renderCount++” out of render into an effect?
6. Why does shallow compare force `useCallback` next to memoized children?

## Compare and contrast

1. Pure render (concept) vs `PureComponent` / `memo` (APIs)  
2. Side effect in render vs in `useEffect`  
3. Local copy-then-sort vs in-place sort of props  
4. `PureComponent` vs default `Component` (`shouldComponentUpdate`)  
5. Non-deterministic `Math.random()` in JSX vs `useState(() => Math.random())`  
6. Defeating memo with new props vs correctly skipping with stable props  

## Predict the behavior

1.
```jsx
let n = 0;
function A() {
  n++;
  return <span>{n}</span>;
}
// StrictMode double-render in dev — what can the user see / what’s wrong?
```

2.
```jsx
const Child = React.memo(function Child({ onClick }) {
  return <button onClick={onClick} />;
});
function Parent() {
  return <Child onClick={() => console.log('x')} />;
}
// Does memo usually skip Child when Parent re-renders? Why?
```

3.
```jsx
function Bad() {
  return <div>{Date.now()}</div>;
}
// Same props, two render calls in one update cycle — same output?
```

4. Memoized child only reads `theme` from a module `let theme = ...` changed by a sibling without prop changes. Parent re-renders with same props to child. What UI risk?

## Debugging

1. Analytics fires twice per navigation only in development. Suspect?

2. `React.memo(Row)` never seems to help; Profiler shows Row always rendering. Checklist?

3. UI shows old “feature flag” from a module export after flag flips; component is memoized. Diagnosis?

4. `useRef` cache filled during render causes subtle concurrent bugs. What change?

5. Test flakes because component output changes with no prop change. Likely purity issue?

## Application

1. Fix `Bad` that increments a module `renderCount` during render.

2. Replace `return <div>{Math.random()}</div>` with a stable-per-mount random id.

3. Wrap a presentational `Avatar({ url, name })` in `memo` and note when it helps.

4. Rewrite sorting so you don’t mutate `items` from props.

5. Write one interview sentence distinguishing purity from `React.memo`.

## Interview questions

1. What does it mean for a component to be pure, and why does React care?  
   **Follow-ups:** Example violation? How does this relate to `memo`?

2. What does `React.memo` do, and what are its limits?

3. What’s the difference between a pure component and `PureComponent`?

4. Why might memoization cause stale UI?

5. Where should side effects go if not in render?

## Connections

1. How does this unit reinforce “no side effects in the render phase”?
2. How does Fiber/concurrent restart depend on purity?
3. How will the performance chapter build on shallow `memo`?
4. How do impure renders interact with StrictMode (later section)?
5. How is purity related to testing components in isolation?
