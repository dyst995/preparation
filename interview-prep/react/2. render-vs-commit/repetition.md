# Render Phase vs Commit Phase — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What happens in the render phase vs the commit phase?
- [ ] Which phase may be interrupted or thrown away? Are side effects allowed during render? During commit?
- [ ] Order after DOM mutations: `useLayoutEffect`, paint, `useEffect`? Where does browser paint sit in the timeline?
- [ ] Why must the render phase avoid subscriptions and DOM writes? Why can concurrent features discard render work safely only if render is pure?
- [ ] Does every re-render imply a DOM mutation? Compare re-render vs DOM update.

## Predict / debug

- [ ] State the result and explain why.
```tsx
function Bad({ id }) {
  fetch(`/api/${id}`);
  return null;
}
// Under StrictMode in development, what can happen to fetch?
```

- [ ] State the result and explain why.
```tsx
function Box() {
  useLayoutEffect(() => {
    console.log('layout');
  });
  useEffect(() => {
    console.log('effect');
  });
  return <div />;
}
// Relative order of logs vs first paint?
```

- [ ] Analytics `track('view')` in the component body fires twice in dev only. Diagnose and fix.
- [ ] UI flickers: measure DOM in `useEffect` and then set size state. Diagnose and say which phase tool is better.

## Say it out loud

- [ ] Explain render phase vs commit phase in 30–60 seconds as if an interviewer asked.
- [ ] Walk through what happens after `setState` until the user sees the update and effects run.
- [ ] When would you use `useLayoutEffect` instead of `useEffect`?
