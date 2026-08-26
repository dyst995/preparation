# How Hooks Work Mechanically — Answers

## Core recall

1. On the component’s **fiber**, as a linked list (conceptually `memoizedState` → `next` → …).
2. By **call position / order** in that list — not by name.
3. Because hooks have **no identity except call order** on the fiber.
4. Later hooks **shift slots**; React reads the wrong node’s state (or throws in dev).
5. **Yes** — the `useEffect` **call** still happens; only the callback’s behavior is conditional. Slot stays put.
6. **No** — their hooks append to the **same** component fiber’s list.
7. **`eslint-plugin-react-hooks`** (rules-of-hooks / exhaustive-deps).
8. New fiber ⇒ **new** list; previous hook state is gone (reset).

## Explain why

1. Names are your locals; React never indexes hooks by variable name — only by walk order.
2. Length changes ⇒ different number of hook calls ⇒ list length / positions disagree across renders.
3. Otherwise some renders call the hook and others don’t → positional mismatch.
4. They’re called during the component’s render, in a fixed order, so they extend the same ordered list.
5. Dev check: hook call count this render ≠ previous render’s list length.
6. Each call consumes the **next** slot — first and second `useState` are adjacent distinct nodes.

## Compare and contrast

1. **Conditional call:** changes list shape. **Conditional inside effect:** list shape fixed; behavior gated.
2. **Hook list:** persistent instance state on fiber. **Elements:** per-render UI description.
3. **Custom hook:** helper that pushes more nodes onto **this** component’s list. **Component:** owns the fiber.
4. **Skip hook:** corrupts pairing on same fiber. **Remount:** intentional fresh list (state reset OK).
5. **Rules of Hooks:** stable hook identity. **Purity:** no side effects during the render walk — related but different rules.
6. **Hook position:** identity of state cells. **`key`:** identity of child fibers in a list.

## Predict the behavior

1. **Mismatch / error** — second slot was `useState(1)` then becomes `useState(2)` / fewer hooks; corrupted pairing.
2. **Four** — state, effect, state, effect.
3. **Hooks mismatch** when `data` becomes missing — early return skips `useState`.
4. **Yes** — `useEffect` always called; early return inside callback is fine.

## Debugging

1. Conditional/loop/early-return hook — more calls this render than last.
2. Yes — slots shifted; ref slot reading wrong node type/data.
3. Always call `useMemo`; put condition inside the factory, or split components.
4. After the condition, call N reads what used to be call N+1’s storage — “wrong” state appears in the wrong variable.

## Application

1.
```jsx
const [name, setName] = useState('');
useEffect(() => {
  if (!shouldTrack) return;
  track(name);
}, [shouldTrack, name]);
const ref = useRef(null);
```

2.
```jsx
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = () => setOn((v) => !v);
  return [on, toggle];
}
```

3. Call hooks first, then guard UI:
```jsx
const [user, setUser] = useState(null);
useEffect(() => {
  if (!userId) return;
  load(userId).then(setUser);
}, [userId]);
if (!userId) return null;
```

4. Top-level same-order calls keep the fiber’s hook list aligned so each call maps to the correct stored state.

## Interview questions

1. **Spoken:** Ordered linked list on the fiber; position is identity; skipping shifts later hooks → wrong state.  
   **Follow-ups:** Custom hooks OK if they always call the same hooks; gate logic inside effects, not around hook calls.

2. **Spoken:** Walk the list in order; each hook call advances to the next node and reads/writes that slot.

3. **Spoken:** Fiber = instance; hook list hangs off it and persists across re-renders of that instance.

4. **Spoken:** Slot misalignment — wrong memoized values, broken refs/effects, or “fewer/more hooks” error.

5. **Spoken:** Signals that the function may call hooks (lint + convention); must only be used from components/other `use*` hooks.

## Connections

1. Fiber is the persistent instance; hooks are how function components store state on that instance.
2. Type/key remount ⇒ new fiber ⇒ empty new hook list (state reset), which is correct remount behavior.
3. Double render still runs the **same** unconditional hook sequence twice — order preserved; purity still required.
4. Every render walks the same hooks; side effects don’t belong in that walk — only reading/updating hook slots.
5. Later units detail what each node stores (state value, effect deps/destroy, ref.current) — this unit is the shared addressing scheme.
