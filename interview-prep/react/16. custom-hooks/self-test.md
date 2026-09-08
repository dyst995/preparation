# Custom Hooks — Encapsulating Reusable Stateful Logic — Self-test

## Core recall

1. What is a custom hook?
2. Do two components calling the same custom hook share state?
3. Where do a custom hook’s `useState` slots live?
4. What does `useDebouncedValue` return and why clear the timeout in cleanup?
5. Why does `usePrevious` return the previous value during render?
6. Does `useLocalStorage` synchronize two components’ in-memory state automatically?
7. Name three design principles for custom hooks.
8. When should you *not* extract a custom hook?

## Explain why

1. Why isn’t a custom hook a global store?
2. Why must custom hooks follow the Rules of Hooks internally?
3. Why is the `use` prefix important?
4. Why does debounce cleanup matter for search-as-you-type?
5. Why is `usePrevious`’s effect scheduled after render essential to the pattern?
6. Why can two `useLocalStorage('theme')` diverge in the UI?

## Compare and contrast

1. Custom hook vs shared Context value  
2. Custom hook vs copying hook code into each component  
3. `useLocalStorage` vs Redux/Zustand for theme  
4. Naming `useDebouncedValue` vs `useEffectWithTimeout`  
5. Two `useToggle()` in one component vs one in each of two components  

## Predict the behavior

1. `A` and `B` both `useToggle()` — toggling `A` affects `B`?  
2. One component calls `useDebouncedValue(query, 300)` twice for two queries — shared debounce state?  
3. First render of `usePrevious(5)` — typical return value?  
4. After `count` goes 1 → 2, during the render where `count === 2`, what does `usePrevious(count)` return?

## Debugging

1. Engineer expects all tabs using `useLocalStorage('tab')` to update together in memory — they don’t. Fix approaches?  
2. Custom hook calls `useEffect` only when `enabled` — lint/runtime issues. Fix?  
3. Debounced search still fires every keypress — consumer effect depends on `query` not `debouncedQuery`. Diagnosis?  
4. `usePrevious` always equals current value in an effect that reads it — timing confusion?

## Application

1. Write `useToggle(initial)`.  
2. Write `useDebouncedValue` as in the notes.  
3. Sketch `useMediaQuery(query)` with subscribe/unsubscribe cleanup.  
4. Refactor duplicated “subscribe to window resize” from two components into a hook.  
5. Answer: shared theme across tree — hook alone or Context? Why?

## Interview questions

1. If two components both call `useLocalStorage('theme', 'light')`, do they share state?  
   **Follow-ups:** How would you share? What does a custom hook reuse?

2. How do custom hooks relate to the fiber hook list?

3. Explain `usePrevious`.

4. When do you extract a custom hook?

5. Design a good API for an async `useFetch(url)` return value.

## Connections

1. How does this unit apply hooks mechanics (positional list)?
2. How do Rules of Hooks + `use` naming connect?
3. How do debounce cleanups reuse the useEffect cleanup lesson?
4. How does `usePrevious` reuse the useRef “box” lesson?
5. How do you combine a custom hook with Context for `useAuth()`?
