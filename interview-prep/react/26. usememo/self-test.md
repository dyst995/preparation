# useMemo — Memoizing Computed Values — Self-test

## Core recall

1. What does `useMemo` return when dependencies are unchanged?
2. When does it recompute?
3. What are the two distinct reasons to use `useMemo`?
4. Why might a cheap `.filter()` still use `useMemo`?
5. What belongs in the dependency array?
6. Should you put side effects in `useMemo`?
7. How does `useMemo` help a `React.memo` child?
8. What’s a safer pattern for expensive *initial* state than `useMemo`?

## Explain why

1. Why are the two reasons often conflated in interviews?
2. Why can `useMemo` on trivial math be a net loss?
3. Why does a missing dependency cause stale UI?
4. Why does `useMemo(() => ({}) , [])` stabilize an effect that depends on that object?
5. Why isn’t `useMemo` a guarantee the factory runs only when deps change in all environments?
6. Why doesn’t `useMemo` by itself stop a child from re-rendering?

## Compare and contrast

1. `useMemo` vs `React.memo`  
2. `useMemo` vs `useCallback`  
3. `useMemo` vs computing inline every render  
4. Memoizing for CPU cost vs for referential identity  
5. `useMemo` vs `useState` lazy initializer  

## Predict the output

1. `useMemo(() => items.map(...), [items])`; parent re-renders; `items` same reference. Does map run?  
2. Same, but factory closes over `query` omitted from deps; `query` changes. What value do you see?  
3. `const v = useMemo(() => ({ x }), [x]);` then `useEffect(() => {}, [v]);` — when does effect re-run?  
4. Without `useMemo`, `const v = { x }` each render; effect deps `[v]`. Effect frequency?

## Debugging

1. Memoized child still re-renders; parent does `items={data.filter(...)}` without `useMemo`. Fix?  
2. Sorted list doesn’t update when sort key state changes; `useMemo(..., [items])` only. Diagnose.  
3. `useMemo` depends on `options` recreated inline in render every time. Symptom?  
4. Developer puts `fetch` inside `useMemo`. What’s wrong?

## Application

1. Write `useMemo` for expensive sort of `rows` by `sortKey`.  
2. Write `useMemo` whose only goal is stable `contextValue = { user, logout }`.  
3. Spoken: Is `useMemo` only for expensive computations?  
4. Refactor an effect that depends on a filtered array so it doesn’t fire every render.

## Interview questions

1. Is `useMemo` only for expensive computations?  
   - Follow-up: Give an example of the second reason.  
   - Follow-up: When would you skip `useMemo`?
2. How do you choose dependency array values for `useMemo`?  
3. Relationship between `useMemo` and `React.memo`?  
4. Can overusing `useMemo` hurt? How?

## Connections

1. How does this connect to the shallow-equality trap in `React.memo`?  
2. How is dependency discipline shared with `useEffect`?  
3. How does referential stability relate to `useSelector`/`createSelector` thinking?  
4. How does “measure first” apply differently to reason 1 vs reason 2?
