# useCallback — Memoizing Function References — Self-test

## Core recall

1. What does `useCallback(fn, deps)` return when deps are unchanged?
2. Express `useCallback` in terms of `useMemo`.
3. What are the two situations where `useCallback` pays off?
4. Why is `useCallback` pointless for a non-memoized child that only receives that handler?
5. What goes wrong with empty deps when the callback reads `count` from state?
6. Are `useState` setters safe to omit from deps / use with `[]`?
7. Does `useCallback` make the function body run faster when clicked?
8. What compares the dependency array between renders?

## Explain why

1. Why does a new inline arrow function defeat `React.memo`?
2. Why doesn’t stable `onClick` help a plain function child?
3. Why can `useCallback` + `useEffect([cb])` stop an infinite effect loop?
4. Why might you still recreate the callback when deps include `user.id`?
5. Why is “wrap all handlers in useCallback” a weak senior answer?
6. Why is functional `setCount(c => c + 1)` useful inside `useCallback` with `[]`?

## Compare and contrast

1. `useCallback` vs `useMemo`  
2. `useCallback` vs inline function in JSX  
3. `useCallback` without `memo` vs with `memo`  
4. Stable callback via `useCallback` vs reading latest state via ref  
5. `useCallback` vs `React.memo`  

## Predict the output

1. Memo child + `useCallback(..., [])` handler; parent state unrelated to handler deps updates. Child re-render?  
2. Same but handler is inline `() => {}`. Child?  
3. Non-memo child + `useCallback`. Parent updates. Child?  
4. `useCallback(() => console.log(count), [])`; click after `count` became 5. What logs?

## Debugging

1. Effect runs every render; deps `[onSearch]` where `onSearch` is not wrapped / has changing deps. Fix directions?  
2. List rows all re-render on parent keypress; each gets `onSelect={() => select(item.id)}`. Diagnose.  
3. Callback has `[filters]` but `filters` is a new object every render from parent. Symptom?  
4. Stale UI in a memoized subscription callback with `[]` deps. Cause?

## Application

1. Write a `useCallback` save handler that depends on `draft` and posts it.  
2. Write a stable increment callback with functional updates and `[]`.  
3. Show Parent + `React.memo(Child)` correctly using `useCallback`.  
4. Spoken answer: when does `useCallback` matter?

## Interview questions

1. When does `useCallback` actually make a measurable difference?  
   - Follow-up: Show a case where it’s useless.  
   - Follow-up: How do stale closures show up?
2. Is `useCallback` the same as `useMemo`?  
3. Do you use `useCallback` by default for every event handler? Why/why not?  
4. How do `memo`, `useMemo`, and `useCallback` work together?

## Connections

1. How does this complete the “identity” story from `useMemo`?
2. How does the shallow-equality trap in `React.memo` motivate `useCallback`?
3. How do effect dependency rules apply equally here?
4. How does “measure first” apply to callback memoization?
