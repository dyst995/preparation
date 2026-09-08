# `useLayoutEffect` vs `useEffect` — Self-test

## Core recall

1. When does `useEffect` run relative to paint? `useLayoutEffect`?
2. Which one can block the browser from painting?
3. Default choice for data fetching / subscriptions?
4. Classic UI reason to use `useLayoutEffect`?
5. What SSR issue does `useLayoutEffect` have?
6. Does `useLayoutEffect` run during the render phase?
7. Why can `setState` inside `useLayoutEffect` avoid flicker?
8. Name one cost of overusing `useLayoutEffect`.

## Explain why

1. Why does measuring a tooltip in `useEffect` often flicker?
2. Why shouldn’t you put heavy work in `useLayoutEffect`?
3. Why is `useEffect` still correct for most side effects?
4. Why does SSR warn about `useLayoutEffect`?
5. Why does the tooltip example use refs?
6. Why isn’t “faster updates” a reason to prefer layout effects for fetch?

## Compare and contrast

1. `useEffect` vs `useLayoutEffect`  
2. Blocking paint vs flickering  
3. Layout measurement vs network I/O  
4. `useLayoutEffect` + `setState` vs `useEffect` + `setState` (first paint)  
5. Client-only measure vs SSR render output  

## Predict the behavior

1. Tooltip positioned in `useEffect` from `(0,0)` initial state — what can the user see?  
2. Same in `useLayoutEffect` — first painted frame?  
3. `useLayoutEffect` runs a 200ms busy loop — what happens to paint?  
4. Fetch in `useLayoutEffect` vs `useEffect` — does data arrive meaningfully sooner?

## Debugging

1. Popover flashes at wrong place then jumps. Which hook to try?  
2. App feels sluggish on navigation; many components use `useLayoutEffect` for logging. Problem?  
3. SSR warning about `useLayoutEffect`. Options?  
4. Scroll restore still flickers with `useEffect`. Why might layout effect help?

## Application

1. Sketch measure-and-position logic with `useLayoutEffect` + two refs.  
2. List three side effects that should stay on `useEffect`.  
3. Write the commit→layout effect→paint→passive effect sequence from memory.  
4. One sentence: when to choose layout effect.

## Interview questions

1. When would you use `useLayoutEffect` instead of `useEffect`?  
   **Follow-ups:** Performance? SSR? Tooltip with `useEffect`?

2. Walk through the timeline including both hooks.

3. Why can `useLayoutEffect` hurt performance?

4. Does `useLayoutEffect` replace the need for cleanup/deps?

5. How do you avoid tooltip flicker?

## Connections

1. How does this refine the render vs commit timeline?
2. How do refs from earlier hooks material connect?
3. How does StrictMode still apply?
4. How does this relate to “re-render vs DOM” (DOM exists before layout effect)?
5. When would CSS-only positioning beat either effect?
