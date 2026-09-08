# Profiling with React DevTools — Self-test

## Core recall

1. What does the React DevTools Profiler record?
2. What does a bar in the flame graph represent?
3. What do gray bars typically mean?
4. Name four “why did this render” reasons DevTools might show.
5. Flame graph vs ranked chart — when each?
6. What fix fits “unrelated siblings re-render on every keystroke”?
7. What fix fits “one component’s bar is huge”?
8. When should you open Chrome Performance instead of (or after) the React Profiler?

## Explain why

1. Why profile a single interaction instead of browsing for minutes?
2. Why is “why rendered” more actionable than duration alone?
3. Why can a leaf counter update light up a huge flame graph?
4. Why might many small commits appear even when you think you called `setState` once?
5. Why re-measure after adding `memo`?
6. Why can the Profiler look fine while the page still feels janky?

## Compare and contrast

1. React Profiler vs Chrome Performance panel  
2. High render **count** vs high render **duration**  
3. Colocating state vs adding `React.memo` for sibling re-renders  
4. Flame graph vs ranked chart  
5. “Parent re-rendered” vs “props changed” as causes  

## Predict / interpret

1. Typing in search: SearchBox + ProductGrid + UnrelatedSidebar all colored. Likely state placement?  
2. Same typing: only SearchBox colored; ProductGrid gray. Interpretation?  
3. Ranked chart: `VirtualList` tiny, `HeavyChart` 40ms every parent update. Direction?  
4. One keystroke → 5 separate commits updating different bits of UI. What question do you ask next?

## Debugging

1. Profiler shows `Row` “props changed” on every parent keystroke; `onClick` is inline. Diagnosis?  
2. After wrapping tree in `memo`, flame still fully lit. What did you likely miss?  
3. User says scroll is janky; React commit bars are ~1ms. Next tool/hypothesis?  
4. Dev profile shows double renders everywhere. How do you interpret before panicking?

## Application

1. Write a 5-step Profiler investigation checklist for “settings page lag on toggle.”  
2. Map each row of the symptom table to a one-line spoken fix.  
3. Spoken walkthrough for “this page feels slow.”  
4. Given flame evidence of over-lifted search state, sketch the colocation change.

## Interview questions

1. Walk me through how you'd investigate "this page feels slow" using React DevTools.  
   - Follow-up: What if the expensive work isn’t in React?  
   - Follow-up: How do you know `memo` helped?
2. How do you tell wasted re-renders from expensive render work in the Profiler?  
3. What does a gray bar mean, and why care?  
4. Describe a time (hypothetical) you’d choose colocation over memoization after profiling.

## Connections

1. How does profiling enforce the chapter’s “measure first” rule?
2. How do Profiler “props changed” reasons connect to `useCallback`/`useMemo`?
3. How does the keystroke+siblings pattern connect to local state / prop-drilling notes?
4. How does the “many commits” row connect to React 18 batching?
