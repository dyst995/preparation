# `useRef` in Depth — Self-test

## Core recall

1. What does `useRef` return, and what is special about its identity across renders?
2. What are the two main uses of refs?
3. Does changing `ref.current` schedule a re-render?
4. When should a value be state instead of a ref?
5. What is the `savedCallback` ref pattern for?
6. When does React set a DOM ref’s `current`?
7. Why is displaying `countRef.current` in JSX after only mutating the ref broken?
8. Why is writing `ref.current` during render risky for displayed values?

## Explain why

1. Why don’t refs participate in re-renders by design?
2. Why store an interval id in a ref (or effect local) rather than state?
3. Why update `savedCallback.current` in an effect when `callback` changes?
4. Why won’t listing `someRef` in an effect dep array re-run when `.current` changes?
5. Why prefer state for a click counter shown on a button?
6. Why might StrictMode double-invoke expose render-time ref mutation?

## Compare and contrast

1. `useRef` vs `useState`  
2. DOM ref vs mutable value ref  
3. Ref for latest callback vs putting `callback` in interval effect deps  
4. Controlled input state vs uncontrolled input + ref  
5. Reading ref in an event handler vs using state in render  

## Predict the behavior

1. `Bad` counter with only `countRef.current++` on click — what does the button show after 5 clicks?  
2. `const r = useRef(0);` log `r === r` across two renders — same object?  
3. Interval uses `savedCallback.current()`; parent recreates `callback` each render but `delay` fixed — does interval restart every render?  
4. `<input ref={inputRef} />` — `inputRef.current` during first render before commit?

## Debugging

1. UI stuck; engineer “updates” via ref. Diagnosis?  
2. Effect should run when “latest id” in a ref changes — never re-runs. Why?  
3. Focus on mount: `inputRef.current.focus()` in render body throws / is null. Fix?  
4. Render count in UI doubles under StrictMode; they increment a ref during render. Fix approach?

## Application

1. Write a component that focuses an input on mount with `useRef` + `useEffect`.  
2. Sketch `usePolling(callback, delay)` with `savedCallback`.  
3. Fix the Bad counter to use state.  
4. Store previous `count` in a ref updated in an effect (sketch).  
5. One sentence: when ref is the right tool.

## Interview questions

1. Why doesn’t updating `ref.current` re-render — when is that a feature?  
   **Follow-ups:** Counter mistake? DOM use?

2. Explain the latest-callback ref pattern with intervals.

3. When do you use `useRef` vs `useState`?

4. What’s wrong with mutating a ref during render for UI?

5. How do DOM refs interact with effects / layout effects?

## Connections

1. How does this relate to purity and StrictMode?
2. How do refs avoid the stale closure problem for “always latest function” in long-lived effects?
3. How does `forwardRef` extend DOM refs to custom components?
4. How is a ref hook slot like other hooks mechanically?
5. How does “re-render vs DOM” relate to choosing state vs ref?
