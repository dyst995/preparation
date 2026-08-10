# 02. The Rules of Hooks

> Source: `interview-prep/react/02-hooks-deep-dive.md`

1. **Only call hooks at the top level.** Never inside loops, conditions, or nested functions - ensures call order stays consistent across renders.
2. **Only call hooks from React function components or custom hooks.** Not from regular JS functions, class components, or event handler bodies directly (you can call a hook-derived function *inside* an event handler, but the hook call itself must be at the top level of the component).
3. (Practical corollary) **Custom hooks must start with `use`** - this isn't just convention, it's how the linter (`eslint-plugin-react-hooks`) and React's own tooling identify which functions need the "top-level, unconditional" rules applied.

### Legitimate ways to handle "conditional" logic without violating the rules

```jsx
// WRONG: conditional hook call
if (isEnabled) {
  useEffect(() => { ... }, []);
}

// RIGHT: always call the hook; branch inside it
useEffect(() => {
  if (!isEnabled) return;
  // ... effect logic
}, [isEnabled]);
```

```jsx
// WRONG: hook in a loop
items.forEach(item => {
  const [state, setState] = useState(item.value); // BAD
});

// RIGHT: lift array-item state into a single structure, or render a child component
// per item where each child owns its own useState call at a stable position.
function ItemRow({ item }) {
  const [value, setValue] = useState(item.value); // fine - one per component instance
  return ...;
}
```

### Interview question

**Q: You need a hook only for admin users. How do you structure this?**

> "I always call the hook unconditionally, and put the conditional logic *inside* the hook body - e.g., `useEffect(() => { if (!isAdmin) return; ...}, [isAdmin])` - or I extract the admin-only behavior into a custom hook and always call it, letting the hook internally no-op when the condition isn't met. I never wrap the hook call itself in an `if`."

---
