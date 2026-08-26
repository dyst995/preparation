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

# Self-test

## Core recall

1. Where does a function component’s hook state live?
2. How does React match a hook call on re-render to stored state?
3. Why do the Rules of Hooks exist (one sentence)?
4. What goes wrong if you skip a hook call between renders?
5. Can you put an `if` *inside* `useEffect`? Why is that different?
6. Do custom hooks get their own fiber?
7. What eslint plugin enforces hook rules?
8. What happens to hook state when the component fiber remounts?

## Explain why

1. Why isn’t the variable name `count` enough to find the right `useState`?
2. Why does a loop of `useEffect` keyed by list length break?
3. Why must hooks run before an early `return null`?
4. Why are custom hooks allowed to call hooks at all?
5. Why does React report “fewer hooks than expected” in development?
6. Why can two identical `useState(0)` calls still be distinct state cells?

## Compare and contrast

1. Conditional hook call vs conditional logic inside an effect  
2. Hook list on a fiber vs React element tree  
3. Custom hook vs component (regarding the hook list)  
4. Skipping a hook vs remounting the component  
5. Rules of Hooks vs “don’t mutate during render”  
6. Position identity vs `key` identity for list items  

## Predict the behavior

1.
```jsx
function C({ on }) {
  const [a, setA] = useState(0);
  if (on) useState(1);
  const [b, setB] = useState(2);
}
```
What happens when `on` flips true → false?

2. Custom hook `useX` calls `useState` then `useEffect`. Component calls `useX()` twice. How many hook nodes on the fiber (minimum)?

3. `if (!data) return null;` then `useState` below — first render has `data`, second doesn’t. Result?

4. Always call `useEffect`; inside, `if (!id) return;` — hook count stable?

## Debugging

1. Dev: “Rendered more hooks than during the previous render.” Likely cause?

2. `ref.current` looks like an effect dependency object / bizarre values after a toggle. Suspect conditional hooks?

3. Lint fails on hooks in `if (x) { useMemo(...) }`. How to rewrite?

4. State from “first useState” seems to show up in “second useState” after a refactor that wrapped a hook in a condition. Explain via slots.

## Application

1. Rewrite the `shouldTrack` example so tracking is conditional but hooks are unconditional.

2. Write a small `useToggle(initial)` custom hook (state + callback) that obeys the rules.

3. Fix:

```jsx
function Profile({ userId }) {
  if (!userId) return null;
  const [user, setUser] = useState(null);
  useEffect(() => { load(userId).then(setUser); }, [userId]);
  return <div>{user?.name}</div>;
}
```

4. Explain in two sentences why ESLint wants hooks at the top level.

## Interview questions

1. Why can’t hooks be called conditionally or inside loops?  
   **Follow-ups:** Custom hooks? How do you conditionally run an effect?

2. How are hooks stored and looked up on re-render?

3. What is the relationship between fibers and hooks?

4. What breaks if hook order changes between renders?

5. Why the `use*` naming convention for custom hooks?

## Connections

1. How does this unit build directly on Fiber?
2. How does remount-from-reconciliation reset hooks?
3. How do StrictMode double-invokes still keep the same hook order?
4. Why is purity of render compatible with a stable hook walk every time?
5. How will `useState` / `useEffect` units sit as “what each node stores”?
