# `useEffect` in Depth — Self-test

## Core recall

1. What is `useEffect` primarily for?
2. When does `useEffect` run relative to paint?
3. What do `[]`, `[a]`, and omitted deps mean?
4. When does an effect’s cleanup run?
5. Why abort fetch in cleanup when `url` changes?
6. What does exhaustive-deps push you to do?
7. Why can `options={{}}` in JSX cause effect churn?
8. Name two ways to fix the stale `count` in a `[]` interval.

## Explain why

1. Why shouldn’t effects block paint for typical data fetching?
2. Why does `setCount(count + 1)` inside `[]` interval get stuck?
3. Why prefer functional updater over `[count]` for a ticking interval?
4. Why is silencing exhaustive-deps dangerous?
5. Why must cleanup run before the next effect with new deps?
6. Why isn’t “run this when the user clicks” a good default for `useEffect`?

## Compare and contrast

1. `useEffect` vs `useLayoutEffect` (timing only)  
2. `useEffect` vs event handler  
3. Empty deps vs deps that include changing state  
4. Missing cleanup vs abort/removeEventListener cleanup  
5. Stale closure vs incorrect dependency identity (new object each time)  
6. Derive in render vs sync with effect  

## Predict the behavior

1. `[]` interval with `setCount(count + 1)`, start 0 — what does UI tend to show after several seconds?  
2. Same with `setCount(c => c + 1)`?  
3. Effect depends on `user`; `user` is new object every parent render with same fields — how often does effect run?  
4. Fetch effect without abort; slow request A then fast B for new url — what can happen to `data`?  
5. StrictMode mount in dev — how many times might setup/cleanup run initially?

## Debugging

1. Timer stuck at 1 with empty deps. Diagnosis + fix.  
2. Search box shows outdated results when typing fast. Suspect?  
3. exhaustive-deps warns about `fetchUser` function. Options?  
4. Effect refetches forever; dep is `filters` object from parent inline. Fix?  
5. “I disabled the lint line and it works in demos but fails after navigation.” Likely?

## Application

1. Write a mount-only effect that sets `document.title`, with cleanup restoring a previous title (sketch).  
2. Fix the Timer interval properly with a functional updater.  
3. Write a `url`-based fetch effect with `AbortController` cleanup.  
4. Refactor deps so an effect depends on `sort` string instead of whole `options` object.  
5. Rewrite “set submitted flag → effect posts form” as a submit handler sketch (why better).

## Interview questions

1. Empty-deps effect + interval reads state and looks stuck — why and how to fix?  
2. When do effect cleanups run, and why do they matter for fetch?  
3. What does the dependency array mean, and what is a stale closure?  
4. How do you respond to an exhaustive-deps warning?  
5. Why might an effect run every render even with a “deps array”?  

## Connections

1. How does commit→paint→effect map to the render/commit unit?
2. How do functional `setState` updates from the useState unit fix effect stale reads?
3. How does StrictMode prove your cleanup?
4. How do Object.is deps relate to memo/bail-out identity?
5. How do unstable inline objects connect to the pure-components / performance story?
