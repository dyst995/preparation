# How Hooks Work Mechanically — Self-test

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
