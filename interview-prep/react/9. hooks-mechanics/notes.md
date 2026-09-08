# How Hooks Work Mechanically

## What you need to know

Each **function component instance** has a **fiber**. That fiber stores hooks as a **linked list** (on `memoizedState`). Every `useState` / `useEffect` / `useRef` / … call is **one node**, matched across renders **only by call order (position)** — not by name.

That single fact is why the **Rules of Hooks** exist:

1. Only call hooks at the **top level** (not in conditions, loops, or nested functions).  
2. Only call hooks from **React function components** or **custom hooks**.

Interview bar: explain the linked list, show how a conditional hook **shifts slots**, and give the preserved “order *is* identity” answer.

Prerequisite: [Fiber](../3.%20fiber/notes.md).

---

## The linked-list mental model (preserved)

```javascript
// After:
// const [a, setA] = useState(0);
// useEffect(() => {...}, [a]);
// const ref = useRef(null);

fiber.memoizedState = {
  memoizedState: 0, // useState value
  next: {
    memoizedState: { deps: [0], destroy: fn }, // useEffect record
    next: {
      memoizedState: { current: null }, // useRef
      next: null,
    },
  },
};
```

(Exact internal shapes vary; the interview model is **ordered slots linked by `next`**.)

### Per render

1. React sets a cursor to the **first** hook on this fiber.  
2. Each hook call reads/writes the **current** node, then advances `next`.  
3. End of function: number of calls must match the list length (dev checks).

Hooks don’t look up `"useState named count"` — they take **whatever is next in line**.

---

## Why order must be stable every render

### Conditional hook (preserved bug)

```jsx
function Bad({ shouldTrack }) {
  const [name, setName] = useState('');
  if (shouldTrack) {
    useEffect(() => {
      track(name);
    }, [name]); // BAD: conditional
  }
  const ref = useRef(null);
  return <input value={name} onChange={(e) => setName(e.target.value)} ref={ref} />;
}
```

| Render | Call 1 | Call 2 | Call 3 |
| --- | --- | --- | --- |
| `shouldTrack === true` | `useState` | `useEffect` | `useRef` |
| `shouldTrack === false` | `useState` | `useRef` | — |

When tracking turns off, call 2 is `useRef` but the fiber’s slot 2 may still be the **effect** node → React reads the wrong `memoizedState` (effect record treated as a ref, or “fewer hooks than expected”). State corruption or a **dev error**: rendered fewer/more hooks than expected.

### Loops

```jsx
// BAD: hook count depends on items.length
for (const id of items) {
  useEffect(() => subscribe(id), [id]);
}
```

Changing `items.length` changes how many hooks ran → same positional mismatch.

### Early return before a hook

```jsx
function Bad({ user }) {
  if (!user) return null;
  const [x, setX] = useState(0); // BAD: skipped when !user
}
```

First render with `user` creates the slot; later `user == null` skips the call → mismatch. Put hooks **above** guards, or return null **after** hooks.

---

## What *is* allowed

### Conditional *logic inside* a hook

```jsx
useEffect(() => {
  if (!shouldTrack) return;
  track(name);
}, [shouldTrack, name]);
```

The **`useEffect` call always runs**; the effect callback may no-op. Slot count stable.

### Custom hooks

```jsx
function useFormField(initial) {
  const [value, setValue] = useState(initial);
  useEffect(() => { /* … */ }, [value]);
  return [value, setValue];
}

function Form() {
  const [a, setA] = useFormField('');
  const [b, setB] = useFormField('');
  // fiber list: state, effect, state, effect — still fixed order
}
```

Custom hooks are **just functions** that call hooks. Their hooks **append to the same fiber list** in the order the custom hook runs. Rules still apply *inside* custom hooks (no conditional hook calls there either).

Naming convention `use*` signals “this may call hooks” so lint rules and humans know.

---

## Rules of Hooks (complete statement)

1. **Top level only** — same sequence every render of this component instance.  
2. **React functions only** — function components or custom hooks; not plain event handlers, class methods, or random utils.

ESLint plugin `eslint-plugin-react-hooks` (`rules-of-hooks`) catches many violations statically.

---

## Identity: fiber + position, not the hook “name”

- Remounting the component (new fiber: type/key change) → **new** hook list; state resets.  
- Same fiber, same positions → state **persists** across re-renders.  
- Two `useState(0)` calls are two slots — distinguished only by **which was called first**.

That’s why “which useState?” is answered by **order in the source**, not variable names.

---

## Common mistakes and misconceptions

1. Conditionally calling hooks “only when needed.”  
2. Hooks inside `if`, loops, or nested helpers that aren’t custom hooks.  
3. Early `return` before hooks.  
4. Thinking custom hooks get a separate fiber list (they don’t — same component fiber).  
5. Calling hooks from class components.  
6. Assuming React matches hooks by variable name or by hook *type* sequence only (types can differ per slot; position is what pairs calls to storage).

---

## Connections to other concepts

```
Fiber (component instance)
  → memoizedState hook linked list
    → call order = identity
      → Rules of Hooks

conditional JSX / state
  ≠ conditional hook calls
    → put conditions inside effects/callbacks

reconciliation remount
  → new fiber → fresh hook list (state reset)
```

---

## Interview perspective

**Q: Why can’t hooks be called conditionally or inside loops?**

Preserved answer:

> React stores hooks per component as an ordered linked list on the fiber, matched by **call position** across renders — not by name. Skip a call and every later hook shifts; React reads the wrong slot’s state. Hooks have no other identity mechanism; **call order is their identity**.

Follow-ups: custom hooks? fix for “run effect only sometimes”? what error do you see in dev?

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
