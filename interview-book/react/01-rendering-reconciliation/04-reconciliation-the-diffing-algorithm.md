# 04. Reconciliation: the diffing algorithm

> Source: `interview-prep/react/01-rendering-reconciliation.md`

### The core heuristic problem

A generic tree-diff algorithm is O(n^3) in the general case - way too slow for UI updates. React uses two heuristics to get to **O(n)**:

1. **Different component types produce different trees.** If a `<div>` becomes a `<span>` (or a class/function component changes type) at the same position, React does **not** try to diff their children - it tears down the old subtree entirely (unmounting it and all its state) and builds a fresh one.
2. **Keys hint at stable identity across renders for lists.** Developers can hint which children are "the same" element across renders via a `key` prop, so React can match items even if their position/order in the array changes, instead of assuming order-based identity.

### Element-by-element diff rules (per sibling position)

For each position in a children list, React compares old element vs new element:

| Comparison | Result |
|---|---|
| Same type (`'div'` -> `'div'`, or `MyComp` -> `MyComp`) | Reuse the underlying DOM node/instance; update changed props only |
| Different type (`'div'` -> `'span'`, `MyComp` -> `OtherComp`) | Unmount old subtree (run cleanup effects, destroy DOM), mount new subtree from scratch |
| Same type + different `key` | Treated as a different element - old one removed, new one mounted (identity mismatch) |

### Why "different type = full remount" matters practically

This is a very common real bug source: conditionally rendering different component types (or even the same JSX at a different position in the tree) can silently reset state you expected to persist.

```jsx
// BUG: switching `isEditing` remounts the whole subtree because
// the ternary branches render structurally different trees at the same slot in some cases,
// and any local state inside <Editor> / <Viewer> is lost on every toggle - which might be desired,
// but often isn't and confuses candidates who don't understand *why* state reset happened.
function Field({ isEditing }) {
  return isEditing ? <Editor /> : <Viewer />;
}
```

If you *wanted* state to persist across the toggle, you'd need to keep the same component type mounted and just change its props/rendered content, or explicitly lift the state above the branch point.

### Keys and list diffing in depth

Without keys, React falls back to matching by **index** in the array. This works fine if the list never reorders, inserts in the middle, or removes from the middle - but breaks (functionally or performance-wise) the moment it does.

**Classic key bug - index as key with reordering:**

```jsx
// items = [{id: 1, text: 'A'}, {id: 2, text: 'B'}]
{items.map((item, index) => (
  <TodoRow key={index} item={item} />   // BAD: index as key
))}
```

If a new item is prepended (`[{id: 3, text: 'C'}, {id: 1, text: 'A'}, {id: 2, text: 'B'}]`), React sees:
- index 0: previously `{id:1}`, now `{id:3}` -> same type, same key (`0`) -> React thinks it's the *same element*, just updates its props (text). It does **not** unmount/remount, so any **internal state inside `TodoRow`** (like an uncontrolled input's value, or `useState` for "is this row expanded") stays attached to the *wrong* logical item - it stays at index 0 but now represents different data. This produces classic bugs: text inputs showing the wrong value, checkboxes toggled on the wrong row, animations firing on the wrong element.

**Fix - use a stable, unique identifier:**

```jsx
{items.map((item) => (
  <TodoRow key={item.id} item={item} />   // GOOD: stable identity
))}
```

Now when the array reorders, React matches fibers by `id`, correctly moving the DOM node instead of morphing row 0's identity into new data, so per-row state and DOM (focus, scroll position, CSS transition state) travel with the correct logical item.

### When index-as-key is actually fine

- The list is **static and never reorders, inserts, or deletes** (rare but happens, e.g., a fixed set of tabs).
- Items have **no internal state and no keyed side effects** (no controlled inputs per row, no animation, no focus).
- As a last resort with genuinely no stable ID available - but flag it as a known risk if items can be added/removed/reordered.

### Interview question

**Q: Why does React need `key`, and what breaks without a stable key?**

> "Keys give React a stable identity for list items across renders. Without them, React defaults to positional/index matching, which breaks down when the list is reordered, or items are inserted/removed anywhere except the end - state and uncontrolled DOM properties (input values, focus, checkbox state, CSS transitions) can get silently reassigned to the wrong logical item because React thinks the *position* is the same element rather than tracking identity. I use a stable unique ID from the data - never the array index - whenever the list can reorder or mutate in the middle."

**Follow-up: What happens if two siblings have the same key?**
> "React warns in development ('Encountered two children with the same key') and behavior becomes unreliable - it may only render one of them correctly, or silently overwrite/duplicate DOM references, because keys are assumed unique among siblings at that level."

---
