# `React.StrictMode` — What It Actually Does — Self-test

## Core recall

1. Does StrictMode’s double-invoke behavior run in production?
2. Name three things StrictMode does in development.
3. What is the React 18 initial-mount effect sequence under StrictMode?
4. What bug class is the effect remount cycle designed to catch?
5. What does double-invoking render help catch?
6. Does StrictMode render any UI of its own?
7. Name one legacy API StrictMode warns about.
8. If an effect “breaks” under double-fire, what should you fix first?

## Explain why

1. Why simulate unmount/remount on first mount instead of only running effects once?
2. Why is production cost described as zero for these checks?
3. Why does a missing `clearInterval` cleanup fail under StrictMode?
4. Why isn’t removing StrictMode a good first fix for duplicate fetches in an effect?
5. Why double-invoke state initializers?
6. Why do concurrent features make StrictMode more valuable?

## Compare and contrast

1. StrictMode double **render** vs double **effect** cycle  
2. StrictMode (React) vs TypeScript `strict`  
3. Dev StrictMode remount vs production mount behavior  
4. Side effect in render vs side effect in `useEffect` under StrictMode  
5. Incomplete cleanup vs “StrictMode bug”  
6. StrictMode warnings vs runtime double-invoke probes  

## Predict the behavior

1. Dev + StrictMode; `useEffect(() => { console.log('setup'); return () => console.log('cleanup'); }, []);` on first mount — rough log order?

2. Same effect in **production** on first mount — how many setups?

3. `useEffect` fetches without abort; StrictMode remount — what can go wrong?

4. `fetch` in component body; StrictMode — how many fetches on one mount path in dev?

## Debugging

1. “My effect runs twice only locally, not in prod build.” Explanation?

2. WebSocket opens two connections in dev; one remains after “fixing” by ignoring StrictMode. Real issue?

3. Analytics pageview fires twice in StrictMode. Approaches that preserve cleanup correctness?

4. Double logs from a child that has `key={Math.random()}` every parent render — is that StrictMode?

5. Class component using `componentWillMount` — what might you see?

## Application

1. Write a `useEffect` that adds a `window` `resize` listener with correct cleanup.

2. Sketch fetch-in-effect with `AbortController` cleanup.

3. Show how you’d wrap `<App />` in `StrictMode` with `createRoot`.

4. List three checklist items when someone reports “useEffect twice.”

## Interview questions

1. Why does `useEffect` run twice in development, and should you worry in production?  
   **Follow-ups:** What should you fix if it breaks? What else does StrictMode do?

2. What is `React.StrictMode` for?

3. How does StrictMode relate to impure render?

4. Mount → cleanup → remount — why is that a good stress test?

5. How do you handle intentional one-time analytics under StrictMode?

## Connections

1. How does this unit reinforce pure components?
2. How does it reinforce render vs commit (effects in commit)?
3. How does incomplete cleanup relate to Fiber/concurrent remounts?
4. How might reconciliation remounts (type/key) also look like “double effects”?
5. How is this different from React 17-only StrictMode expectations about effects?
