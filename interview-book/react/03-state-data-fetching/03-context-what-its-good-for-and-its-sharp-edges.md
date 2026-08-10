# 03. Context - what it's good for, and its sharp edges

> Source: `interview-prep/react/03-state-data-fetching.md`

### What Context actually does

`createContext` + `Provider` lets you avoid prop drilling by letting any descendant read a value via `useContext` without it being threaded through every intermediate component's props.

### The re-render pitfall (know this cold)

**Every component that calls `useContext(MyContext)` re-renders whenever the Provider's `value` changes - even if the consuming component only cares about part of that value**, and even if the new value is shallowly identical in the parts that component reads.

```jsx
// BAD: value is a new object literal every render of AppProvider -> EVERY consumer re-renders
// on every AppProvider render, regardless of what value actually changed.
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

Every render of `AppProvider` creates a brand-new `{ user, setUser, theme, setTheme }` object, so `Object.is` comparison always finds a new reference - **all consumers re-render**, even a component that only reads `theme` when only `user` changed.

### Mitigations

**1. Memoize the context value:**

```jsx
function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const value = useMemo(() => ({ user, setUser, theme, setTheme }), [user, theme]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
```

This helps, but **doesn't fully solve it**: if *either* `user` or `theme` changes, the memoized object still changes as a whole, so a component reading only `theme` still re-renders when `user` changes (since the object reference is still all-or-nothing per Provider).

**2. Split into multiple contexts by update frequency / concern:**

```jsx
// Two separate contexts - a component reading only ThemeContext never re-renders when `user` changes.
<UserContext.Provider value={userValue}>
  <ThemeContext.Provider value={themeValue}>
    {children}
  </ThemeContext.Provider>
</UserContext.Provider>
```

This is the most common real fix - split contexts along "things that change together."

**3. Don't use Context for frequently-changing, high-fan-out values at all** - e.g., mouse position, scroll offset, form field values on every keystroke shared broadly. Use a dedicated state library (Zustand) with selector-based subscriptions instead, which only re-renders components that actually read the changed slice (see Section 5).

**4. Use `useSyncExternalStore`-based selector libraries** (which is exactly what Zustand does) when you need "shared state with fine-grained subscriptions" - Context fundamentally cannot do partial/selective re-rendering on its own; it's all-or-nothing per Provider value.

### Interview question

**Q: Why is Context a poor fit for frequently-changing, widely-consumed state?**

> "Context re-renders every consumer whenever the Provider's value reference changes, with no built-in way to subscribe to just a slice of that value - it's not selector-based. So even memoizing the value only helps when *nothing* in it changed; if any field changes, every consumer re-renders regardless of which field it actually reads. For state that changes often and has many consumers, that causes real perf problems. Zustand or Redux with selectors solve this because each component subscribes to a derived slice and only re-renders when *that slice* changes, not the whole store."

---
