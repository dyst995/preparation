# Pure Components and Why Purity Matters — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What does it mean for a React component render to be pure? Name three kinds of side effects that must not run during render.
- [ ] Why does StrictMode / concurrent rendering care about purity?
- [ ] What do `PureComponent` and `React.memo` actually compare? Why can a new function prop defeat `React.memo`?
- [ ] Why isn’t `React.memo` a substitute for keeping render pure? Compare pure render (concept) vs `PureComponent` / `memo` (APIs).
- [ ] How do you stabilize a random value used in UI across re-renders?

## Predict / debug

- [ ] State the result and explain why.
```jsx
let n = 0;
function A() {
  n++;
  return <span>{n}</span>;
}
// StrictMode double-render in dev — what can the user see / what’s wrong?
```

- [ ] State the result and explain why.
```jsx
const Child = React.memo(function Child({ onClick }) {
  return <button onClick={onClick} />;
});
function Parent() {
  return <Child onClick={() => console.log('x')} />;
}
// Does memo usually skip Child when Parent re-renders? Why?
```

- [ ] Analytics fires twice per navigation only in development. Diagnose and fix.
- [ ] `React.memo(Row)` never seems to help; Profiler shows Row always rendering. Diagnose (checklist) and fix.

## Say it out loud

- [ ] Explain pure components in 30–60 seconds as if an interviewer asked.
- [ ] What does it mean for a component to be pure, and why does React care? Follow-ups: Example violation? How does this relate to `memo`?
- [ ] What does `React.memo` do, and what are its limits?
