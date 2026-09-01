# Batching: How Many Renders Does One Event Trigger? — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What is batching in React? Where did React ≤17 batch updates, and where did it often not?
- [ ] What changed with React 18 automatic batching? Which root API is associated with it?
- [ ] Why does `console.log(state)` right after `setState` show the old value? Does batching make reading state synchronous after `setState`?
- [ ] What’s the net effect of two `setCount(count + 1)` in one handler vs two functional updaters? Why?
- [ ] What does `flushSync` do, and why is it discouraged as a default habit?

## Predict / debug

- [ ] React 18 `createRoot`; in `setTimeout`, `setA(1); setB(2)`. How many re-renders expected from those two calls? State the result and explain why.
- [ ] React 17; same `setTimeout` with two `setState`s. How many re-renders typically? State the result and explain why.
- [ ] State the result and explain why.
```jsx
// count is 0
setCount(count + 1);
setCount(count + 1);
// count after next render?
```

- [ ] State the result and explain why.
```jsx
setCount((c) => c + 1);
setCount((c) => c + 1);
// count was 0; after next render?
```

- [ ] User increments twice quickly in one handler using `setCount(count + 1)` twice; UI only +1. Diagnose and fix.

## Say it out loud

- [ ] Explain batching in 30–60 seconds as if an interviewer asked.
- [ ] Why doesn’t `console.log` right after `setState` show the new value?
- [ ] How does batching differ between React 17 and React 18?
