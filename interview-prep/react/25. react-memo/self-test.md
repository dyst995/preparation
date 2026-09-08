# React.memo — What It Does and Its Real Cost — Self-test

## Core recall

1. What does `React.memo` do?
2. What equality check does default `memo` use?
3. Name three prop shapes that commonly defeat `memo`.
4. When is `memo` worth applying (two conditions)?
5. When is `memo` a waste?
6. Does `memo` block re-renders from the component’s own `useState`?
7. What does the custom comparator’s return value mean?
8. Why might memoizing a component that only takes `children` fail?

## Explain why

1. Why does a new object literal with the same fields defeat shallow memo?
2. Why can `memo` on the child alone accomplish nothing?
3. Why can memoizing a cheap `<span>` hurt more than it helps?
4. Why is “sprinkle memo everywhere” a bad default?
5. Why might colocating state beat adding `memo` + `useCallback`?
6. Why doesn’t skipping Child’s render mean Parent did less work overall?

## Compare and contrast

1. `React.memo` vs `useMemo`  
2. `React.memo` vs `useCallback`  
3. `React.memo` vs class `PureComponent`  
4. Stable primitive prop vs inline object prop under `memo`  
5. Fixing unstable props vs custom deep `arePropsEqual`  

## Predict the output

1. `memo` Child with `n={5}` (number from parent state that doesn’t change when a sibling counter updates). Does Child re-render when sibling counter ticks? Why?  
2. Same Child but `style={{ color: 'red' }}` inline every time. Child re-render on parent update? Why?  
3. Memoized Child; parent passes `onClick={handler}` where `handler` is `useCallback(..., [])`. Parent state updates. Child?  
4. Memoized Child reads `theme` from Context; Provider value changes; props unchanged. Child re-render?

## Debugging

1. `React.memo(Row)` still profiles as rendering whenever list parent’s search box types. `Row` gets `onSelect={() => select(id)}`. Diagnose.  
2. After wrapping everything in `memo`, app still janky; Profiler shows one huge computation inside a leaf that always gets new props. What’s wrong with the strategy?  
3. Custom compare always returns `false`. Symptom?  
4. Developer memoizes Child but mutates `item` in place in the parent then setStates something else. Child doesn’t update. Why?

## Application

1. Write a `memo`’d `UserBadge({ name, onClick })` and a parent that doesn’t defeat it.  
2. Show a parent that *does* defeat it in one line of JSX.  
3. List two structural alternatives to “add useCallback so memo works.”  
4. Spoken answer: memo wrapped but still re-renders — why?

## Interview questions

1. You wrapped a component in `React.memo` but it still re-renders every time. Why?  
   - Follow-up: How do you fix it?  
   - Follow-up: When would you *not* bother?
2. What’s the cost of `React.memo`?  
3. `memo` vs `useMemo` — when each?  
4. How do you decide whether a list row needs `memo`?

## Connections

1. How does `memo` relate to “re-render ≠ DOM update”?  
2. How do `useMemo`/`useCallback` support `memo` without replacing it?  
3. How does the chapter’s “measure first” rule apply to `memo`?  
4. How does prop drilling / over-lifted state create pressure to overuse `memo`?
