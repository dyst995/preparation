# Render Phase vs Commit Phase — Self-test

## Core recall

1. What happens in the render phase vs the commit phase?
2. Which phase may be interrupted or thrown away?
3. Are side effects allowed during render? During commit?
4. Order after DOM mutations: `useLayoutEffect`, paint, `useEffect`?
5. Where does browser paint sit in the timeline?
6. Does every re-render imply a DOM mutation?
7. What does “render must be pure” mean in one sentence?
8. Name two reasons React might run a component function more than once for “one” update.

## Explain why

1. Why must the render phase avoid subscriptions and DOM writes?
2. Why is the commit phase not interruptible like render?
3. Why does `useLayoutEffect` run before paint?
4. Why does `useEffect` run after paint?
5. Why does StrictMode double-rendering help catch bugs related to this model?
6. Why can concurrent features discard render work safely only if render is pure?

## Compare and contrast

1. Render phase vs commit phase  
2. `useEffect` vs `useLayoutEffect`  
3. Re-render vs DOM update  
4. Side effects in render vs side effects in an event handler  
5. Scheduling a render (`setState`) vs committing  
6. Pure calculation during render vs impure work in effects  

## Predict the behavior

1.
```tsx
function Bad({ id }) {
  fetch(`/api/${id}`);
  return null;
}
// Under StrictMode in development, what can happen to fetch?
```

2.
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

3. Parent state updates; child returns the same `<span>Hi</span>` with same props — did the child function necessarily run? Did the span’s DOM node necessarily update?

4. During render you `document.body.style.background = 'red'`. What’s wrong under concurrent/StrictMode thinking?

## Debugging

1. Analytics `track('view')` in component body fires twice in dev only. Diagnosis?

2. UI flickers: measure DOM in `useEffect` and then set size state. Better phase tool?

3. Subscription registered in render, never cleaned up; memory leak / duplicates. Fix?

4. Developer says “commit didn’t run because reconciliation found no changes.” Is that accurate language? Clarify re-render vs DOM.

5. `useEffect` reads layout and user sees a jump. What’s the mismatch?

## Application

1. Sketch the timeline from `setCount(c => c + 1)` in a click handler to `useEffect` running.

2. Move this impure render into the correct place:

```tsx
function Title({ text }) {
  document.title = text;
  return null;
}
```

3. Choose `useEffect` or `useLayoutEffect` for: (a) syncing to `localStorage`, (b) focusing an input before paint, (c) attaching a window resize listener.

4. Write one sentence you’d say in an interview defining the two phases.

## Interview questions

1. Why can’t you do side effects during render?  
   **Follow-ups:** StrictMode? Concurrent discard?

2. Walk through what happens after `setState` until the user sees the update and effects run.

3. What’s the difference between render and commit?

4. When would you use `useLayoutEffect` instead of `useEffect`?

5. Does a re-render always update the DOM? Why or why not?

## Connections

1. How does this relate to the virtual DOM / element tree?
2. How will Fiber build on “interruptible render”?
3. How do hooks rules (`useEffect` dependencies) sit in the commit model?
4. How does batching reduce how often this whole pipeline runs?
5. How does purity here echo “don’t mutate during render” advice for Redux/state updates?
