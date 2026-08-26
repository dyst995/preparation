# Context — What It’s Good For, and Its Sharp Edges

## What you need to know

`createContext` + `Provider` + `useContext` lets **any descendant** read a value **without prop drilling** through intermediate components.

**Sharp edge (know cold):** every `useContext(MyContext)` consumer **re-renders whenever that Provider’s `value` changes** (by `Object.is`) — even if the consumer only uses part of the value. Context is **not** selector-based.

Best for **rarely changing**, broadly needed client values (theme, locale, auth session object that updates infrequently). Poor for high-frequency, high-fan-out state (mouse position, per-keystroke shared fields).

Prerequisites: [four kinds of state](../18.%20four-kinds-of-state/notes.md), [local component state](../19.%20local-component-state/notes.md), [useContext working knowledge](../17.%20other-hooks/notes.md).

---

## What Context actually does

```jsx
const ThemeContext = createContext('light'); // default if no Provider above

function App() {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeContext.Provider value={theme}>
      <Page />
    </ThemeContext.Provider>
  );
}

function ThemedButton() {
  const theme = useContext(ThemeContext);
  return <button className={theme}>…</button>;
}
```

- **Provider** publishes `value` to the subtree.  
- **`useContext`** reads the **nearest** matching Provider above.  
- Intermediates don’t declare the prop — that’s the anti-drilling win.  
- Default argument to `createContext` is used only when **no** Provider is above (useful for tests / optional context; often `null` + throw in a hook if missing).

Context passes **any** value: primitives, objects, setters. Stability of that value’s **identity** drives re-renders.

---

## The re-render pitfall (preserved)

**Every consumer re-renders when `value`’s reference changes** — not when “the field I care about” changes in a deep sense. There’s no built-in `useContext(store, selector)`.

```jsx
// BAD: new object every AppProvider render → all consumers re-render every time
function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');

  return (
    <AppContext.Provider value={{ user, setUser, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  );
}
```

Even a child that only reads `theme` re-renders when **only** `user` changed — because the whole `value` object is new (or still new after memo when `user` is in the deps).

Same trap: `value={{ theme }}` inline without memo; Provider parent re-renders for unrelated reasons → new object → all theme consumers update.

---

## Mitigations

### 1. Memoize the context value (preserved)

```jsx
const value = useMemo(
  () => ({ user, setUser, theme, setTheme }),
  [user, theme], // setState setters are stable
);
return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
```

**Helps:** Provider re-renders that don’t change `user`/`theme` won’t churn `value`.  

**Doesn’t fully solve:** if `user` **or** `theme` changes, the **whole** object is new → consumers that only need `theme` still re-render when `user` changes. Memo is all-or-nothing per Provider value.

### 2. Split contexts by concern / update frequency (preserved — most common real fix)

```jsx
<UserContext.Provider value={userValue}>
  <ThemeContext.Provider value={themeValue}>
    {children}
  </ThemeContext.Provider>
</UserContext.Provider>
```

A `useContext(ThemeContext)` reader **does not** re-render when only user context changes. Split along “things that change together.”

Often also split **state vs dispatch** (two contexts) so components that only call `setTheme` don’t re-render when `theme` changes (if they don’t read theme).

### 3. Don’t use Context for high-frequency, high-fan-out values (preserved)

Mouse position, scroll offset, broadly shared per-keystroke form state → prefer **Zustand** (or similar) with **selectors**, or keep state local.

### 4. Selector libraries / `useSyncExternalStore` (preserved)

Context cannot do partial subscriptions alone. Zustand/Redux bindings use external-store subscriptions so a component re-renders only when **its selected slice** changes.

---

## When Context is a good fit

| Good | Poor |
| --- | --- |
| Theme, locale, DI-style services | Live mouse coords to 50 consumers |
| Current user (updates rarely) | Normalized entity cache updating often |
| Avoid drilling through layout chrome | Replacing all app state “because Redux is scary” |
| Dependency injection for tests | Server lists (use React Query) |

Still prefer **lifting local state** when a nearby parent can own it cleanly.

---

## Patterns worth knowing

**Custom hook wrapper:**

```jsx
function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme outside Provider');
  return ctx;
}
```

**Children don’t re-render just because Provider re-rendered** if they don’t consume context and props are stable — but **consumers** of that context do when `value` changes. (`React.memo` on a consumer **does not** skip context-driven updates when the context value the memoized component reads changed — context is an extra input.)

---

## Common mistakes and misconceptions

1. Inline `value={{ … }}` every render without memo / split.  
2. One giant `AppContext` for unrelated fields.  
3. Using Context for frequently updating shared state.  
4. Thinking `memo(Consumer)` ignores context changes.  
5. Using Context as a server-data cache.  
6. Prop-drilling avoidance as the only design goal (can hide data dependencies).

---

## Connections to other concepts

```
shared client state (rare updates)
  → Context

value identity (Object.is)
  → same story as deps / bail-out / memo

split contexts
  → isolate update frequency

high fan-out + frequent updates
  → Zustand selectors / useSyncExternalStore

local state first
  → lift, then Context if distance hurts
```

---

## Interview perspective

**Q: Why is Context a poor fit for frequently-changing, widely-consumed state?**

Preserved answer:

> Every consumer re-renders when the Provider `value` reference changes; there’s no built-in slice selector. Memoizing only helps when nothing in the value changed; any field change updates the object and re-renders all consumers. For hot, widely read state, use Zustand/Redux selectors so each component re-renders only when its slice changes.

Also ready: show the bad Provider object; list split-context + memo mitigations; contrast with RQ for server data.

---

# Self-test

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
