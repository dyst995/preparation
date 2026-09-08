# Context — What It’s Good For, and Its Sharp Edges — Self-test

## Core recall

1. What problem does Context solve?
2. When does a `useContext` consumer re-render?
3. Why is `value={{ user, theme }}` without memo dangerous?
4. Why doesn’t memoizing one big context value fully fix “I only read theme”?
5. What is the most common structural fix for mixed update rates?
6. When should you avoid Context entirely for shared state?
7. Does Context provide selector-based subscriptions?
8. What is the nearest Provider rule?

## Explain why

1. Why do all consumers re-render on any field change in one object value?
2. Why can splitting User and Theme contexts help performance?
3. Why is mouse position a bad Context fit?
4. Why isn’t avoiding prop drilling always worth a big Context?
5. Why might `React.memo` on a child still re-render when context it reads updates?
6. Why are `setState` setters usually safe to omit from “changing often” worries in a memoized value?

## Compare and contrast

1. Context vs prop drilling  
2. Context vs Zustand selectors  
3. One AppContext vs split contexts  
4. Memoized context value vs split contexts  
5. Context for theme vs React Query for user profile list  
6. Default context value vs missing Provider (custom hook throw)  

## Predict the behavior

1. Provider `value={{ theme }}` new each parent render; 20 theme consumers — what happens on unrelated parent state update?  
2. After `useMemo` on `{ user, theme }` deps `[user, theme]`; only `user` changes — does a theme-only consumer re-render?  
3. Separate ThemeContext; only `user` changes — theme consumer re-render?  
4. Consumer uses `useContext`; wrapped in `memo`; context value changes — re-render?

## Debugging

1. Profiler: whole tree under Provider re-renders on every keystroke in a search box held in Context. Fixes?  
2. Only auth button should update on login; theme buttons also re-render. Likely structure?  
3. `value={useMemo(() => ({…}), [])}` with stale user forever. What’s wrong?  
4. Team says “Context is slow.” What clarifying questions do you ask?

## Application

1. Rewrite the BAD `AppProvider` with `useMemo`.  
2. Split that provider into User + Theme contexts (sketch).  
3. Write `useTheme()` that throws if used outside Provider.  
4. Decide: locale string changing rarely — Context or Zustand? Why?  
5. Decide: selected spreadsheet cell updating constantly, many cells subscribed — Context or Zustand? Why?

## Interview questions

1. Why is Context a poor fit for frequently-changing, widely-consumed state?  
   **Follow-ups:** Mitigations? Zustand difference?

2. Explain the Context re-render rule precisely.

3. How do you memoize context values, and what limitation remains?

4. When is Context the right tool?

5. Context vs Redux/Zustand — how do you choose?

## Connections

1. How does this fit “shared client state” in four-kinds?
2. How does value identity connect to `Object.is` elsewhere in React?
3. How does this set up the Zustand section’s selector pitch?
4. How does local-state-first interact with reaching for Context?
5. How does `useSyncExternalStore` relate to mitigation #4?
