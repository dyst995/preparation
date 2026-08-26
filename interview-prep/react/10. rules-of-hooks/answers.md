# The Rules of Hooks — Answers

## Core recall

1. **Top level only** (no loops/conditions/nested fns); **only from function components or custom hooks**.
2. So call **order stays stable** — order is how React matches hook state.
3. React **function components** and **custom hooks** only.
4. So tooling/lint know to enforce hook rules inside them (and humans recognize hook composition).
5. Always `useEffect(…);` and `if (!isEnabled) return;` inside (include `isEnabled` in deps).
6. Render a **child component per item**; each child’s top-level `useState`, or one parent state structure.
7. **Yes** you can call the setter; that is **not** a hook call — the `useState` already ran at top level.
8. **No** — mounting/unmounting components is fine; that doesn’t skip hooks inside a still-rendering parent incorrectly if the parent’s own hooks stay unconditional.

## Explain why

1. First changes whether the hook runs (list shape). Second always runs the hook; only the effect body is gated.
2. Hook count would equal `items.length` and change as the list changes → positional mismatch / illegal.
3. Each mounted row is its own component instance/fiber with a **fixed** one-`useState` sequence.
4. Otherwise renders that take the early path never call the hook → count mismatch.
5. Hooks must run during render of a component/custom hook, not later in an event.
6. Without `use`, lint may not treat the function as a hook and miss conditional calls inside it.

## Compare and contrast

1. **Conditional call:** illegal, shifts slots. **Conditional mount:** child fiber exists or not; child’s hooks only run while mounted — OK.
2. **Inside:** stable slots. **Skip call:** unstable slots.
3. **Parent array:** one hook, indexed updates. **Child state:** many fibers, natural isolation + keys.
4. **Call `useState`:** establishes slot. **`setState` in handler:** updates that slot later.
5. **Custom hook:** may call hooks; must follow rules. **Helper:** must not call hooks.
6. **Rules of Hooks:** where/whether you may call. **exhaustive-deps:** dependency arrays correctness when you do call `useEffect`/`useMemo`/….

## Predict the behavior / validity

1. **Invalid** — hook after conditional return.  
2. **Valid** — `AdminPanel`’s hooks run only when that component renders.  
3. **Valid.**  
4. **Invalid** — hooks in a loop.

## Debugging

1. Move `useEffect` to top level; put condition inside the callback; fix deps.  
2. Feature flag changed hook count — remove conditional call; always call `useFoo` and no-op inside.  
3. `useEffect(() => { if (!isAdmin) return; subscribe…; return cleanup; }, [isAdmin]);`  
4. Extract `ItemRow` with local state + stable `key`, or lift to one map state in parent.

## Application

1.
```jsx
useEffect(() => {
  if (!isEnabled) return;
  // …
}, [isEnabled]);
```

2.
```jsx
function useAdminAudit(isAdmin) {
  useEffect(() => {
    if (!isAdmin) return;
    // audit setup + cleanup
  }, [isAdmin]);
}
```

3.
```jsx
function ItemRow({ item }) {
  const [editing, setEditing] = useState(false);
  return /* … */;
}
// List: items.map(i => <ItemRow key={i.id} item={i} />)
```

4. Declare all hooks first; then `if (!user) return null`.

5. “Always call the hook; no-op inside when `!isAdmin` (or mount an admin-only child).”

## Interview questions

1. **Spoken:** Always call unconditionally; branch inside the hook or in a custom hook that no-ops; or mount an admin-only child that owns the hooks. Never `if (isAdmin) useX()`.  
   **Follow-ups:** Child mount OK; conditional call breaks positional identity.

2. **Spoken:** Top-level + components/custom hooks only — because hooks are a positional list on the fiber.

3. **Spoken:** Child component per item (each with its own hooks) or one aggregated state structure in the parent — not hooks inside `map`.

4. **Spoken:** Hook call registers state during render; `setState` in a click schedules an update using that already-registered hook.

5. **Spoken:** Marks the function as a hook for lint and readers so composition rules are enforced.

## Connections

1. Rules exist so the linked-list walk always hits the same slots — mechanics unit explained why.
2. Stable `key` keeps the same `ItemRow` fiber (and its hook state) attached to the same logical item.
3. Lint encodes rule 1/2 and uses `use` naming to find custom hook boundaries.
4. Effect still mounts/cleans up; early `return` in setup should pair with proper cleanup when enabled — StrictMode still remounts.
5. Prefer admin child when admin UI/state is large and shouldn’t live in the parent; prefer no-op hook when the parent always needs a tiny shared audit effect API.
