# `useState` in Depth — Self-test

## Core recall

1. When is `useState`’s initial value used?
2. What happens if you `setState` to a value `Object.is`-equal to the current state?
3. How do you lazy-initialize expensive state?
4. Why is `useState(expensive())` still costly after mount?
5. When should you prefer `setState(prev => …)`?
6. Does `setState` update the `state` variable in the current render?
7. Same object reference passed to `setState` — re-render?
8. New object with identical contents — re-render?

## Explain why

1. Why do two `setCount(count + 1)` in one click often net +1?
2. Why does lazy init take a function instead of a value?
3. Why does mutating state in place then `setState(sameRef)` fail to update UI?
4. Why is functional form safer inside `setTimeout`?
5. Why doesn’t `useState(props.id)` update when `props.id` changes?
6. Why is `Object.is` (not deep equality) used for bail-out?

## Compare and contrast

1. Value update vs functional updater  
2. `useState(x)` vs `useState(() => x)` when `x` is expensive to compute  
3. Bail-out on same primitive vs new object with same fields  
4. Multiple `useState` vs one state object  
5. Seeding from props once vs controlled prop  
6. Scheduling `setState` vs reading state in the same handler  

## Predict the behavior

1. `count` is 0; `setCount(count + 1); setCount(count + 1);` next `count`?  
2. Same with functional updaters twice?  
3. `useState(() => buildBigArray())` — how many times does `buildBigArray` run on 10 re-renders after mount?  
4. `useState(buildBigArray())` — how many times on those 10 re-renders (plus mount)?  
5. State `{ n: 0 }`; click does `setState(s => { s.n++; return s; })` — re-render? UI?  
6. `setCount(0)` when count is 0 — re-render?

## Debugging

1. Counter increments only by 1 when handler calls `setCount(count + 1)` twice. Fix?  
2. Parent passes new `initialItems`; child’s `useState(initialItems)` never refreshes. Options?  
3. Toggle seems broken: `setOn(on)` where they meant to flip. What’s wrong?  
4. Expensive profiler spike every parent render despite state unused after init — check `useState(exp())`?  
5. `setUser(user); user.name = 'x'` pattern — what goes wrong?

## Application

1. Write lazy `useState` for reading JSON from `localStorage` once.  
2. Write a handler that increments count three times safely in one batch.  
3. Update `{ count, name }` to bump count immutably with a functional updater.  
4. Show a button that bails out by setting the same primitive again.  
5. One-sentence rule for choosing value vs functional `setState`.

## Interview questions

1. Why should you use the functional updater form of `setState`?  
   **Follow-ups:** Batching? Async?

2. What is lazy initialization of `useState` and when do you need it?

3. Explain `Object.is` bail-out with objects/arrays.

4. Does `setState` always re-render? When not?

5. How does `useState` interact with batching in React 18?

## Connections

1. How does this sit on the hook linked list?
2. How does batching make functional updaters essential?
3. How does bail-out relate to re-render vs DOM?
4. How does immutability here connect to reconciliation seeing “new” props/state?
5. How might `useReducer` be an alternative for complex transitions (preview)?
