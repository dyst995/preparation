# Batching: How Many Renders Does One Event Trigger? — Self-test

## Core recall

1. What is batching in React?
2. Where did React ≤17 batch updates? Where did it often not?
3. What changed with React 18 automatic batching?
4. Which root API is associated with automatic batching?
5. Why does `console.log(state)` right after `setState` show the old value?
6. What’s the net effect of two `setCount(count + 1)` in one handler vs two functional updaters?
7. What does `flushSync` do?
8. Does batching make reading state synchronous after `setState`?

## Explain why

1. Why does batching improve performance / UX?
2. Why do two value-form increments in one batch often net +1?
3. Why do functional updaters net +2 in the same situation?
4. Why was unbatched async `setState` in React 17 surprising in apps?
5. Why is `flushSync` discouraged as a default habit?
6. Why can’t you “fix” the `count` variable by calling `setCount`?

## Compare and contrast

1. React 17 handler batching vs React 18 automatic batching  
2. Value update (`setCount(count + 1)`) vs functional updater (`setCount(c => c + 1)`)  
3. Batching vs `flushSync`  
4. Multiple `setState` in one click vs sequential updates in two separate clicks  
5. Scheduling an update vs applying it in a re-render  
6. Batching vs concurrent transitions (`startTransition`) at a high level  

## Predict the behavior

1. React 18 `createRoot`; in `setTimeout`, `setA(1); setB(2)`. How many re-renders expected from those two calls?

2. React 17; same `setTimeout` with two `setState`s. How many re-renders typically?

3.
```jsx
// count is 0
setCount(count + 1);
setCount(count + 1);
// count after next render?
```

4.
```jsx
setCount((c) => c + 1);
setCount((c) => c + 1);
// count was 0; after next render?
```

5.
```jsx
setCount(5);
console.log(count); // count was 0 in this render
// what logs?
```

## Debugging

1. User increments twice quickly in one handler using `setCount(count + 1)` twice; UI only +1. Fix?

2. After `await fetch()`, two `setState`s cause two renders on React 17; product wants one. What do you say on React 18?

3. Code uses `flushSync` around every `setState` “so logs work.” What’s wrong?

4. Mid-handler `document.querySelector` expects DOM from `setState` just called — still old DOM. Options?

5. Team claims “setState is synchronous in event handlers.” Clarify.

## Application

1. Write a click handler that increments count twice safely in one batch.

2. Show a React 18 `setTimeout` example that relies on automatic batching for two states.

3. Sketch when you’d wrap an update in `flushSync` (one sentence + tiny code).

4. Explain to a junior why their `console.log` after `setState` “proves setState is broken.”

## Interview questions

1. Why doesn’t `console.log` right after `setState` show the new value?  
2. `setCount(count + 1)` twice vs `setCount(c => c + 1)` twice?  
3. How does batching differ between React 17 and React 18?  
4. What is automatic batching?  
5. When would you use `flushSync`?

## Connections

1. How does batching reduce work in the render→commit pipeline?
2. How do stale closures here relate to the closures unit in JS?
3. How does this interact with “re-render ≠ DOM update”?
4. Why do functional updaters matter more once batching queues multiple updates?
5. How might StrictMode double-rendering still interact with handlers that set state once?
