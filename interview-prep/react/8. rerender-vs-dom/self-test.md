# Does a Re-render Always Touch the DOM? — Self-test

## Core recall

1. Does a re-render always mutate the DOM?
2. What does “re-render” mean precisely?
3. Without `memo`, does a child usually re-render when its parent does?
4. If child output is identical after re-render, what does commit do for that subtree?
5. What extra work does React still do if the function ran but DOM didn’t change?
6. How does `React.memo` differ from “diff found no DOM changes”?
7. Can React skip scheduling a re-render entirely? Give one case.
8. Does “rendered” in Profiler mean the DOM updated?

## Explain why

1. Why might React call `StaticChild` again even though it has no props and returns the same UI?
2. Why is “no DOM update” still not free without memo?
3. Why do people wrongly treat every re-render as a performance emergency?
4. Why does `memo` need shallow-equal props to help in the Parent/Child case?
5. Why can button text update while a sibling’s DOM stays untouched in one Parent update?
6. Why does `setState` with the same number often cause no re-render?

## Compare and contrast

1. Re-render vs DOM mutation  
2. Diff found no changes vs `React.memo` bailout  
3. Parent re-render cascading to child vs child `setState`  
4. CPU cost of calling a cheap child vs mutating DOM  
5. Profiler “commit” / paint intuition vs “render” count  
6. Identical element output vs new object props that look the same  

## Predict the behavior

1. Parent increments count; `StaticChild` returns `<p>Hi</p>` always; no memo. Did `StaticChild`’s function run? Did `<p>`’s DOM text change?

2. Same but `StaticChild = memo(() => <p>Hi</p>)`. Did the function run on Parent’s count update?

3. Child returns `<p>{Math.random()}</p>` (impure). Parent re-renders. DOM for that `p`?

4. `setCount(0)` when count is already `0`. Re-render scheduled?

## Debugging

1. Engineer: “Child re-rendered so we must have a DOM performance bug.” How do you push back?

2. Memoized child still runs every parent click; parent passes `onClick={() => ...}`. Why?

3. Profiler shows many renders but paint looks fine. Interpretation?

4. Someone wraps a tiny `<span>{label}</span>` in memo “to avoid DOM updates.” What’s misguided?

## Application

1. Explain in two sentences what happens to `StaticChild` on Parent click without memo.

2. Add `memo` to `StaticChild` and state the condition under which Parent clicks skip its render.

3. List the three layers: run fn / diff / DOM — and mark which `memo` can skip.

4. Write a one-liner interview distinction between re-render and DOM update.

## Interview questions

1. If a child’s output doesn’t change, does the DOM update?  
   **Follow-ups:** Does the child function still run? Role of `memo`?

2. What’s the difference between `React.memo` and a re-render that produces no DOM change?

3. Why do children re-render when parents re-render by default?

4. How would you verify whether a update touched the DOM vs only re-rendered?

5. When is skipping the render call worth it?

## Connections

1. How does this lock in render phase vs commit phase vocabulary?
2. How does reconciliation decide “no DOM work”?
3. How does purity make re-running unchanged children safe?
4. How does batching reduce how often this cascade runs?
5. How does the performance chapter build on this distinction?
