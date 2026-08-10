# 07. Section F - Rapid-fire round (answer in under 15 seconds each)

> Source: `interview-prep/react/06-interview-questions.md`

1. What compiles JSX into `createElement` calls? *(Babel/the JSX transform)*
2. What's the default `flex-direction`? *(row, on web; note RN defaults to column)*
3. What hook do you use to read the nearest Provider's value? *(`useContext`)*
4. What React 18 hook lets you defer a value under load? *(`useDeferredValue`)*
5. What's the shorthand meaning of `flex: 1`? *(grow:1, shrink:1, basis:0%)*
6. What does `Object.is` comparison govern in `useState`? *(whether setting the same value bails out of a re-render)*
7. What hook exposes a query's in-flight mutation status? *(`useMutation`'s `isPending`/`isPending` state)*
8. What CSS property creates named layout regions in Grid? *(`grid-template-areas`)*
9. What ARIA attribute announces an error message immediately? *(`role="alert"`)*
10. What does `React.lazy` require to show a fallback? *(`Suspense`)*
11. What's the RTK function that bundles reducer + actions? *(`createSlice`)*
12. What Zustand middleware persists state to storage? *(`persist`)*
13. What React Query function marks cached data as stale and triggers a refetch? *(`invalidateQueries`)*
14. What hook gives you a stable SSR-safe unique ID? *(`useId`)*
15. What's the React 18 root API that enables automatic batching? *(`createRoot`)*
16. What CSS unit is commonly used for responsive font sizing relative to the root element? *(`rem`)*
17. What native HTML element association makes clicking a label focus its input? *(`<label htmlFor>` / `<label>` wrapping)*
18. What's the React DevTools Profiler feature that shows why a component rendered? *("render reasons," e.g. props/state/hooks changed)*
19. What hook do you use to imperatively expose a custom API through a ref? *(`useImperativeHandle`, with `forwardRef`)*
20. What's the escape hatch to force a synchronous, unbatched update? *(`flushSync`)*

---
