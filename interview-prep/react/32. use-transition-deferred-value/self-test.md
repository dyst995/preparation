# useTransition and useDeferredValue — Keeping UI Responsive Under Load — Self-test

## Core recall

1. What problem do `useTransition` and `useDeferredValue` solve?
2. What does `startTransition` do to state updates inside its callback?
3. What is `isPending`?
4. What does `useDeferredValue(query)` return under load?
5. Which update should stay **outside** the transition for a search input?
6. When prefer `useDeferredValue` over `useTransition`?
7. Does `useTransition` reduce how often you hit the network by itself?
8. How can you detect “results are stale” with deferred query?

## Explain why

1. Why does putting both `setQuery` and expensive `setResults` in one urgent update cause jank?
2. Why can a transition’s work be abandoned mid-flight conceptually?
3. Why is a fixed debounce delay a blunt instrument across devices?
4. Why shouldn’t the controlled input’s value be the deferred one?
5. Why still virtualize a huge list even if you use `useTransition`?
6. Why is debounce still the better tool for search-as-you-type API calls?

## Compare and contrast

1. `useTransition` vs `useDeferredValue`  
2. `useTransition` vs debounce  
3. `useDeferredValue` vs `useMemo`  
4. Urgent update vs transition update  
5. Pending spinner vs showing previous results  

## Predict / interpret

1. User types fast; `query` in the input vs `results` state updated only inside `startTransition`. What feels instant? What may lag?  
2. `deferredQuery` still equals `query` on a fast machine after one key — surprising?  
3. You wrap `setQuery` in `startTransition` and leave list sync. Typing feel?  
4. Debounce 500ms on a powerful laptop filtering local data — UX complaint?

## Debugging

1. Input lags; expensive filter and `setQuery` both inside `startTransition`. Fix?  
2. Network fires every keystroke despite `useDeferredValue` on the list. Why?  
3. Users think search is broken because old results show with no indicator while `isPending`. Fix?  
4. Transition used but Profiler still shows long blocking tasks outside React. Limitation?

## Application

1. Rewrite a search box + expensive local filter using `useTransition` + `isPending`.  
2. Same UX with `useDeferredValue` and a pending opacity when values diverge.  
3. Spoken: `useTransition` vs debounce for input.  
4. Note one case where you’d use **both** debounce and transition.

## Interview questions

1. When would you use `useTransition` over just debouncing an input?  
   - Follow-up: When is debounce better?  
   - Follow-up: `useDeferredValue` vs `useTransition`?
2. How does `isPending` help UX?  
3. Do these APIs make O(n²) work cheap?  
4. How do concurrent features relate to perceived performance?

## Connections

1. How does this connect to React 18 concurrent rendering?
2. How do memo/virtualization reduce what transitions must schedule?
3. How is this different from avoiding request waterfalls?
4. How does pending UI relate to Suspense fallbacks at a high level?
