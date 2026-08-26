# Context — Answers

## Core recall

1. Share a value with distant descendants **without prop drilling**.  
2. When the nearest Provider’s **`value` changes** by `Object.is`.  
3. New object reference every Provider render → **all** consumers re-render.  
4. The memoized object still changes as a **whole** when any dep changes — no per-field subscribe.  
5. **Split contexts** by concern / update frequency.  
6. High-frequency, high-fan-out updates (mouse, scroll, hot shared inputs).  
7. **No.**  
8. `useContext` reads the closest Provider of that context type above the component.

## Explain why

1. Consumers subscribe to the **entire value**; React doesn’t know which fields you read.  
2. Theme consumers aren’t subscribed to User’s Provider value.  
3. Constant updates × many consumers = render storm; Context can’t select a slice.  
4. Can over-broadcast updates and hide dependencies; lift/local may be clearer.  
5. `memo` compares props; context updates still force re-render when the consumed value changes.  
6. React guarantees `setState` function identity is stable — they don’t churn the memo deps by themselves.

## Compare and contrast

1. **Context:** implicit to any descendant. **Props:** explicit per level.  
2. **Context:** all-or-nothing per value. **Zustand:** selector → re-render on slice change.  
3. **One:** simple but coupled updates. **Split:** isolate re-render domains.  
4. **Memo:** skips churn when deps unchanged. **Split:** fixes cross-field false sharing.  
5. **Theme:** client, rare. **Profile list:** server → RQ.  
6. **Default:** fallback when no Provider. **Throw in hook:** fail fast on misuse.

## Predict the behavior

1. **All 20 re-render** (new `value` each time).  
2. **Yes** — `user` changed → new memoized object.  
3. **No** (for ThemeContext consumers).  
4. **Yes** — context change isn’t blocked by memo on props.

## Debugging

1. Move search query out of broad Context; local/URL/Zustand selector; split contexts; don’t put keystrokes in a fat Provider.  
2. User + theme in one context value — split or accept; memo alone isn’t enough when user changes.  
3. Empty deps freeze initial user — include `user` (and needed fields) in `useMemo` deps.  
4. How often does value change? How many consumers? Is value unstable identity? Have you split/memoized?

## Application

1. `useMemo(() => ({ user, setUser, theme, setTheme }), [user, theme])` on Provider.  
2. Two Providers as in notes.  
3.
```jsx
function useTheme() {
  const v = useContext(ThemeContext);
  if (v === undefined) throw new Error('…');
  return v;
}
```
4. **Context** — rare updates, simple.  
5. **Zustand** (selectors) — frequent + many subscribers.

## Interview questions

1. **Spoken:** No slice subscriptions; any `value` change re-renders all consumers; memo doesn’t help when another field changes. Use selectors (Zustand/Redux) for hot wide state.  
   **Follow-ups:** Split contexts; memo limits; examples.

2. **Spoken:** Consumer re-renders when nearest Provider `value` fails `Object.is` with the previous value.

3. **Spoken:** `useMemo` the object by its fields; still all-or-nothing when any field updates — then split contexts.

4. **Spoken:** Rarely changing cross-cutting client values (theme, locale, auth), avoiding deep drilling — not a universal store.

5. **Spoken:** Context for simple/rare; Zustand/Redux when you need selective subscriptions or complex updates.

## Connections

1. Context is a primary tool for **shared client** state that updates infrequently.  
2. Same referential equality theme as effect deps, `memo`, state bail-out.  
3. Zustand’s pitch is exactly Context’s missing selectors.  
4. Prefer local/lift first; Context when distance justifies it.  
5. Mitigation #4 is the concurrent-safe external store subscription model libraries use.
