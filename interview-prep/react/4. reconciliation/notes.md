# Reconciliation: The Diffing Algorithm

## What you need to know

**Reconciliation** is how React decides what changed between the previous UI tree and the next one, then plans minimal host updates (applied in commit).

A fully general tree diff is **O(n³)** — too slow for UI. React uses **heuristics** to get roughly **O(n)**:

1. **Different types ⇒ different trees** — tear down old subtree, mount new (don’t deep-diff across type changes).  
2. **Keys hint identity** in lists — match the “same” item across reorders instead of only by index.

You should predict: **when state resets**, **why index-as-key breaks**, and **what duplicate keys do**.

Prerequisites: [Fiber](../3.%20fiber/notes.md) (identity lives on fibers), [render vs commit](../2.%20render-vs-commit/notes.md).

---

## The core heuristic problem

Without assumptions, comparing two arbitrary trees is expensive. React trades optimality for speed with rules that match how UIs are usually written:

- You rarely morph a `<div>` into a `<span>` and expect the same subtree semantics.  
- Lists of similar items need an ID when order changes.

Wrong heuristics ⇒ wrong reuse of fibers/DOM ⇒ **state stuck on the wrong item** or **unnecessary remounts**.

---

## Element-by-element rules (per sibling position)

For each slot among siblings, old element vs new:

| Comparison | Result |
| --- | --- |
| Same type (`div`→`div`, `MyComp`→`MyComp`) | **Reuse** fiber/DOM (or instance); update changed props |
| Different type (`div`→`span`, `A`→`B`) | **Unmount** old subtree (effects cleanup, destroy DOM); **mount** new from scratch |
| Same type + different `key` | Treated as **different** identity — remove old, mount new |

“Same type” means the same host tag string or the **same component function/class reference** at that position (with key considered for list matching).

---

## Different type = full remount (practical bugs)

Local state, effects, DOM focus, and uncontrolled inputs live with the **fiber instance**. Change type at that tree position → that instance is destroyed → **state resets**.

```jsx
function Field({ isEditing }) {
  return isEditing ? <Editor /> : <Viewer />;
}
```

Toggling `isEditing` switches component **type** at the same parent slot → `<Editor>` unmounts and `<Viewer>` mounts (or vice versa). Any `useState` inside `Editor` is gone. That may be desired; often people expect state to survive and don’t know why it vanished.

**If you need state to persist across the toggle:**

- Keep **one** component type mounted and switch content via props, or  
- **Lift state** above the branch so it isn’t owned by the remounted child.

Also: moving the same component to a **different position** in the tree (different parent slot / without a stable key in a list) can look like a remount — React matches by position (+ key among siblings), not by “same JSX shape somewhere else.”

---

## Keys and list diffing

### Default: index matching

Without keys, React matches children **by order** (index). Fine for append-only / static lists. Breaks when you **insert, delete in the middle, or reorder**.

### Classic bug: `key={index}` with reordering

```jsx
// items = [{id: 1, text: 'A'}, {id: 2, text: 'B'}]
{items.map((item, index) => (
  <TodoRow key={index} item={item} /> // BAD when list mutates mid-list / reorders
))}
```

Prepend `{id: 3, text: 'C'}`:

- Index `0` still has `key={0}` — React reuses that fiber.  
- Props change from item 1 → item 3.  
- **Internal state** of `TodoRow` (expanded flag, uncontrolled input) **stays on index 0** but now shows/edits the wrong logical todo.

Symptoms: wrong input text, wrong checkbox, focus/animation on the wrong row.

### Fix: stable unique id

```jsx
{items.map((item) => (
  <TodoRow key={item.id} item={item} />
))}
```

On reorder, React **moves** the matching fiber/DOM with the id — per-row state travels with the correct item.

Keys are scoped among **siblings** at that level (not globally unique across the whole app).

---

## When index-as-key is actually fine

- List is **static** — no reorder, mid-insert, or mid-delete.  
- Items have **no internal state** and no per-row DOM identity that matters (focus, uncontrolled inputs, enter/exit animations).  
- Last resort with no stable id — treat as a known risk if the list can change shape.

Static map of three fixed tabs with no local state → index keys are usually OK. Todo list with inputs → never.

---

## Duplicate keys

Preserved follow-up:

> React warns in development (`Encountered two children with the same key`). Behavior is **unreliable** — identity matching breaks; React may mishandle updates because keys are assumed **unique among siblings**.

Never use random keys (`key={Math.random()}`) every render — that forces remount every time (state always resets, poor performance).

---

## What reconciliation is not

- Not a guarantee of the mathematically minimal DOM patch — **heuristics**.  
- Not the same as “Virtual DOM is always faster” — it’s a **predictable update model**.  
- Keys are **not** props your component receives (not in `props.key` for you to read as data) — they’re for React’s identity. Pass `id={item.id}` separately if the child needs the id.

---

## Common mistakes and misconceptions

1. `key={index}` on dynamic lists.  
2. `key={Math.random()}` or new UUID every render.  
3. Expecting state to survive `<A />` ↔ `<B />` at the same slot.  
4. Using array index after filter/sort without stable ids.  
5. Duplicate keys among siblings.  
6. Thinking keys must be unique app-wide (only among siblings).  
7. Using the item’s display text as key when text can collide or change.

---

## Connections to other concepts

```
elements (new tree each render)
  → reconcile onto fibers by type + position/key
    → reuse vs remount
      → commit DOM / run effect cleanups on unmount

Fiber identity
  → where useState / DOM node stick

type change or key change
  → new identity → state reset

stable key
  → correct list moves / state follows item
```

---

## Interview perspective

**Q: Why does React need `key`, and what breaks without a stable key?**

Preserved answer:

> Keys give stable identity for list items across renders. Without them, React uses index matching, which breaks on reorder/mid-list insert/remove — state and uncontrolled DOM (inputs, focus, checkboxes, transitions) can attach to the wrong logical item. Use a stable unique id from data — not index — when the list can mutate mid-list or reorder.

**Follow-up: same key twice?** Dev warning; unreliable updates — keys must be unique among siblings.

Also ready: type change ⇒ full remount; O(n) heuristics vs O(n³) general diff.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
