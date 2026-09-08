# Other Built-in Hooks (Working Knowledge) — Self-test

## Core recall

1. When prefer `useReducer` over multiple `useState`s?
2. What does `useContext` read, and when does the consumer re-render?
3. One-line difference: `useMemo` vs `useCallback`?
4. What does `useImperativeHandle` customize?
5. What is `useId` for? What is it not for?
6. What problem does `useSyncExternalStore` address?
7. Is `dispatch` from `useReducer` typically stable?
8. Name a library pattern built on `useSyncExternalStore`.

## Explain why

1. Why is a reducer easier to unit-test than scattered `setState`s?
2. Why can Context cause large re-render subtrees?
3. Why aren’t `useMemo`/`useCallback` default on every value/function?
4. Why expose `focus()` via `useImperativeHandle` instead of the raw input ref sometimes?
5. Why must `useId` be SSR-safe?
6. Why is `useEffect` + `setState` a weaker external-store subscription under concurrent React?

## Compare and contrast

1. `useState` vs `useReducer`  
2. Custom hook alone vs `useContext`  
3. `useMemo` vs recalculating each render  
4. `forwardRef` alone vs `forwardRef` + `useImperativeHandle`  
5. `useId` vs `key={item.id}`  
6. External store via `useSyncExternalStore` vs copying into React state manually  

## Predict / choose the hook

1. Wizard with many fields and named transitions (`NEXT`, `BACK`, `SET_EMAIL`) — which hook?  
2. App theme needed in header and footer — which?  
3. Memoized list row needs stable `onSelect` — which?  
4. Design system `TextField` should allow parent `ref.current.focus()` without exposing DOM — which?  
5. Two password fields on one page need unique label ids with SSR — which?

## Debugging

1. All Context consumers re-render every parent keystroke; `value={{ theme, setTheme }}`. Fix approach?  
2. Parent `ref.current` is an input node but you wanted only `.shake()`. What’s missing?  
3. Hydration warning on `id={Math.random()}`. Better approach?  
4. UI tears reading a Zustand-like store with homemade effect subscription. What API?

## Application

1. Write a tiny `useReducer` counter with `increment` / `reset`.  
2. Sketch Provider + `useContext` for a string locale.  
3. Wrap an input with `forwardRef` + `useImperativeHandle` exposing `focus`.  
4. Wire `label`/`input` with `useId`.  
5. One sentence each: when you’d mention `useMemo` and `useSyncExternalStore` in an interview.

## Interview questions

1. When do you choose `useReducer` over `useState`?  
2. How does `useContext` trigger re-renders?  
3. What are `useMemo` and `useCallback` for at a high level?  
4. Explain `useImperativeHandle`.  
5. Why does `useId` exist?  
6. What is `useSyncExternalStore` and who uses it?

## Connections

1. How does `useReducer` connect to the useState immutability / updater story?
2. How does Context differ from custom hooks for sharing?
3. How do `useCallback` + `memo` connect to the pure-components / re-render unit?
4. How does `useImperativeHandle` extend the useRef / forwardRef story?
5. How does `useSyncExternalStore` relate to concurrent rendering / Fiber?
