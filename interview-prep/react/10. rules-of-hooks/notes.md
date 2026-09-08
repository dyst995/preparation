# The Rules of Hooks

## What you need to know

Two hard rules (plus a tooling corollary):

1. **Only call hooks at the top level** — never in loops, conditions, or nested functions.  
2. **Only call hooks from React function components or custom hooks** — not plain JS helpers, class components, or the body of an event handler (you may *use* values/setters from hooks inside handlers).  
3. **Custom hooks should be named `use…`** — so ESLint/`eslint-plugin-react-hooks` and humans know the top-level rules apply inside them.

Mechanism behind rule 1: [hooks mechanics](../9.%20hooks-mechanics/notes.md) — call **order is identity** on the fiber’s hook list. This unit is the **practice playbook**: how to get conditional / per-item behavior **without** breaking that order.

---

## Rule 1 — Top level only

Every render of a given component instance must execute the **same sequence** of hook calls.

| Illegal | Why |
| --- | --- |
| `if (x) useEffect(…)` | Call skipped → later slots shift |
| `items.map(() => useState(…))` | Hook count depends on length |
| `function handleClick() { useState(…) }` | Nested function; not part of the render walk |
| Early `return` **before** hooks | Some renders omit later hooks |

“Top level” means the top level of the **function component or custom hook body**, not “top of the file.”

---

## Rule 2 — Only from components / custom hooks

Hooks need a **current fiber** React is rendering. Calling `useState` from a random util or from inside `onClick` has no valid hook list to append to (or isn’t during the render pass).

```jsx
// OK: hook at top level; setter used in handler
function Form() {
  const [text, setText] = useState('');
  function onChange(e) {
    setText(e.target.value); // not a hook call
  }
  return <input value={text} onChange={onChange} />;
}
```

Classes use `this.state` / lifecycles — **don’t** call hooks in class methods.

---

## Corollary — `use` prefix on custom hooks

```jsx
function useAdminAudit(isAdmin) {
  useEffect(() => {
    if (!isAdmin) return;
    // …
  }, [isAdmin]);
}
```

- Lint treats `useFoo` as a hook → enforces unconditional top-level calls **inside** it.  
- Calling `useFoo()` only from components/other `use*` hooks keeps the composed list ordered.  
- Naming a non-hook `useSomething` confuses lint; omitting `use` on a real custom hook can hide violations.

Not a runtime React requirement historically, but **practical law** in modern codebases.

---

## Legitimate “conditional” patterns (preserved)

### Always call; branch inside

```jsx
// WRONG
if (isEnabled) {
  useEffect(() => { /* … */ }, []);
}

// RIGHT
useEffect(() => {
  if (!isEnabled) return;
  // … effect logic
}, [isEnabled]);
```

Same for `useMemo` / `useCallback`: call always; return a fallback or skip work inside.

### Per-item state: child components, not a loop of hooks

```jsx
// WRONG
items.forEach((item) => {
  const [state, setState] = useState(item.value);
});

// RIGHT — one hook sequence per ItemRow fiber
function ItemRow({ item }) {
  const [value, setValue] = useState(item.value);
  return /* … */;
}

function List({ items }) {
  return items.map((item) => <ItemRow key={item.id} item={item} />);
}
```

Each row instance has its **own** fiber and hook list. Adding/removing rows changes **which components mount**, not the hook order inside a single component.

Alternative: one `useState` holding an array/map of values in the parent (single stable hook).

---

## Admin-only hook (preserved interview answer)

**Q: You need a hook only for admin users. How do you structure this?**

> Always call the hook unconditionally; put the condition **inside** — e.g. `useEffect(() => { if (!isAdmin) return; … }, [isAdmin])` — or extract `useAdminOnly(…)` and **always** call it, letting it no-op when not admin. **Never** wrap the hook call in `if (isAdmin)`.

Optional: split UI so `<AdminPanel />` only mounts for admins — then that child can own admin hooks at its top level (mount/unmount is fine; conditional **hook calls** in the parent are not).

---

## Early returns — safe pattern

```jsx
function Profile({ userId }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    if (!userId) return;
    // load…
  }, [userId]);

  if (!userId) return null; // AFTER hooks
  return <div>{user?.name}</div>;
}
```

Hooks first (unconditional), then conditional UI.

---

## Common mistakes and misconceptions

1. “I’ll only call `useEffect` when admin to save work” — use internal `if` instead.  
2. Hooks inside `map`/`forEach` for row state.  
3. Calling hooks in event handlers or async callbacks.  
4. Early return before hooks.  
5. Custom hook without `use` prefix so lint misses violations.  
6. Thinking mounting `<Admin />` conditionally violates rules — **conditional components are fine**; conditional **hook calls** are not.

---

## Connections to other concepts

```
Rules of Hooks (practice)
  ↑ enforced because
hooks mechanics (positional list)

conditional UI / mount child
  ≠ conditional hook call

eslint-plugin-react-hooks
  → static enforcement of these rules

ItemRow per key
  → reconciliation identity + own hook list
```

---

## Interview perspective

Be ready to:

1. State both rules + `use` naming.  
2. Rewrite a conditional `useEffect` correctly.  
3. Explain per-item state via child components.  
4. Answer the admin-only hook question without wrapping the call in `if`.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
