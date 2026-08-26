# Zustand — Answers

## Core recall

1. **Outside React**, in a module-level store.  
2. Picks the slice of state the component subscribes to.  
3. Re-render when the **selected value** changes by **`Object.is`** (by default).  
4. Store is an importable singleton hook — no tree Provider required.  
5. **`persist`:** localStorage (etc.) sync/rehydrate. **`devtools`:** Redux DevTools wiring.  
6. Feature-scoped shared UI; less boilerplate; no Provider; no need for heavy RTK discipline.  
7. Large multi-domain app; strong reducer/middleware/audit needs; existing Redux team norms.  
8. **`useSyncExternalStore`**.

## Explain why

1. Its selector’s value didn’t change — store only notifies that subscriber when the slice changes.  
2. Context consumers subscribe to the whole value, not a slice.  
3. New object each time ⇒ always fails `Object.is` ⇒ always re-render.  
4. Missing staleness, dedupe, invalidation, refetch policies — that’s RQ.  
5. Import hook and use — no store Provider / boilerplate scaffolding.  
6. Immutability so Zustand can detect change and notify; in-place mutate may skip updates.

## Compare and contrast

1. **Zustand:** selectors, no Provider. **Context:** whole value, Provider.  
2. **Zustand:** minimal. **RTK:** slices/reducers/middleware ecosystem for large domains.  
3. **Zustand:** client UI/domain. **RQ:** server cache.  
4. **Selector:** narrow. **Whole store:** any change re-renders.  
5. **Module:** global to imports. **Provider:** scoped to subtree (multiple providers possible).  
6. **persist:** store-level. **useLocalStorage hook:** per-component memory unless shared carefully.

## Predict the behavior

1. **No.**  
2. **Yes** — subscribed to everything.  
3. **Yes** — selector result is a new object every evaluation / always “changed” when compared poorly (even if search string same, identity differs each time the selector runs after a store notify — and may re-render spuriously). Actually: if only isSidebarOpen changes, this component's selector still runs on store updates depending on implementation - with default zustand, components re-subscribe and selector is compared; new object !== old object → re-render even if search string unchanged. So **yes, re-renders** (bad selector).

## Debugging

1. Too-broad selectors / no selector / object selector without shallow — tighten selectors.  
2. Mutation without immutable `set` — copy nested objects.  
3. `store.setState` reset in `beforeEach`, or create store factories for tests.  
4. **React Query** for orders list.

## Application

1.
```jsx
const useTheme = create((set) => ({
  theme: 'light',
  setTheme: (theme) => set({ theme }),
}));
const theme = useTheme((s) => s.theme);
```

2. Wrap with `persist(..., { name: 'ui-theme' })`.  
3. Select `s.filters.search` and `s.filters.status` separately, or `shallow`.  
4. (a) Context fine (b) Zustand.  
5. “Shared client state that updates often or has many selective readers.”

## Interview questions

1. **Spoken:** Selector subscriptions — re-render only when selected slice changes; `useSyncExternalStore`; Context is all-or-nothing per value.  
   **Follow-ups:** No Provider; split contexts as weaker alternative.

2. **Spoken:** Zustand for small/medium feature state and speed; RTK for large domains, middleware, team Redux norms.

3. **Spoken:** No selector; returning new objects; mutating state; using it for server cache.

4. **Spoken:** RQ owns server data; Zustand owns client UI/shared flags — don’t duplicate.

5. **Spoken:** `set` writes updates; `get` reads current state inside actions.

## Connections

1. Directly implements “use selector store instead of hot Context.”  
2. Primary tool for frequent **shared client** state.  
3. Same equality bail-out idea as state updates.  
4. Custom hooks = per-fiber state; Zustand = shared module state.  
5. If only a parent+children need it, local/lift is simpler than a store.
