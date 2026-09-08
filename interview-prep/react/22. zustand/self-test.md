# Zustand — Minimal Client State Without Boilerplate — Self-test

## Core recall

1. Where does Zustand store state relative to React?
2. What does a selector do?
3. How does Zustand decide whether to re-render a subscriber?
4. Why doesn’t Zustand need a Provider?
5. What do `persist` and `devtools` middleware do?
6. Name two signals to prefer Zustand over Redux.
7. Name two signals to prefer Redux Toolkit over Zustand.
8. What React API underpins Zustand subscriptions?

## Explain why

1. Why can `SidebarToggleButton` ignore `filters` updates?
2. Why does Context fail this pattern without splitting?
3. Why is returning `{ a, b }` from a selector often a footgun?
4. Why isn’t “put the fetch result in Zustand” a complete server-state strategy?
5. Why is incremental adoption easier than classic Redux?
6. Why use `set((state) => ({ filters: { ...state.filters, search } }))` instead of mutating `filters`?

## Compare and contrast

1. Zustand vs Context  
2. Zustand vs Redux Toolkit  
3. Zustand vs React Query  
4. Selector subscription vs whole-store subscription  
5. Module store vs React Context Provider tree  
6. `persist` middleware vs hand-rolled `useLocalStorage`  

## Predict the behavior

1. Store updates `filters.search`; component selected only `isSidebarOpen` — re-render?  
2. Component calls `useUiStore()` with no selector; `filters` change — re-render?  
3. Selector returns new object `{ search: s.filters.search }` every time; only `isSidebarOpen` changes in store — does this component re-render?

## Debugging

1. Every keystroke in search re-renders the whole page of Zustand consumers. Likely cause?  
2. UI doesn’t update after `state.filters.search = x` inside `set`. Diagnosis?  
3. Tests pollute each other via leftover store state. Mitigation ideas?  
4. Team moved `/orders` into Zustand and hand-rolls loading. Better home?

## Application

1. Create a store with `theme` + `setTheme` and a component that only selects `theme`.  
2. Add `persist` with storage name `ui-theme`.  
3. Fix a bad selector that returns a new filters object every time.  
4. Decide Zustand vs Context for: (a) locale (b) spreadsheet selection shared by toolbar + grid.  
5. One sentence: when Zustand over Context.

## Interview questions

1. How does Zustand avoid Context’s re-render problems?  
   **Follow-ups:** useSyncExternalStore? No Provider?

2. When do you choose Zustand vs Redux Toolkit?

3. What are common Zustand selector mistakes?

4. How does Zustand fit next to React Query in a modern stack?

5. Explain `set` / `get` in a Zustand store factory.

## Connections

1. How does this unit answer Context mitigation #3/#4?
2. How does four-kinds “shared client” map to Zustand?
3. How does Object.is bail-out here echo useState?
4. How is a module store different from a custom hook’s per-call state?
5. When would you still lift local state instead of adding Zustand?
