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

# Self-test

## Core recall

1. Why doesn’t React use a general O(n³) tree diff?
2. What are React’s two main reconciliation heuristics?
3. What happens when the element type at a position changes?
4. What happens when type is the same but `key` changes?
5. Without keys, how does React match list children?
6. What goes wrong with `key={index}` when you prepend an item?
7. When is index-as-key acceptable?
8. What does React assume about keys among siblings?

## Explain why

1. Why tear down the whole subtree on type change instead of diffing children anyway?
2. Why do keys exist if React already has array order?
3. Why does row-local `useState` “move” to the wrong todo with index keys?
4. Why can switching `Editor` / `Viewer` reset state even with no list?
5. Why is `key={Math.random()}` harmful?
6. Why aren’t keys passed as normal props into your component?

## Compare and contrast

1. Same-type update vs different-type remount  
2. Stable `id` key vs index key  
3. Reordering with good keys vs without keys  
4. State lift vs keeping one component type to preserve state across UI modes  
5. Duplicate keys vs missing keys  
6. Reconciliation heuristics vs optimal minimal diff  

## Predict the behavior

1.
```jsx
{flag ? <input key="a" /> : <input key="b" />}
```
Does focus/state inside the input survive toggling `flag`? Why?

2.
```jsx
{flag ? <Editor /> : <Viewer />}
```
Does `Editor`’s `useState` survive `flag` true→false→true?

3. List keyed by index; item at index 0 has local `expanded=true`; prepend a new item. What is expanded after reconcile?

4. List keyed by `item.id`; reorder items. Do per-id fibers move with their items?

5. Two children both `key="1"`. What should you expect?

## Debugging

1. Todo text inputs show the wrong todo’s text after sorting. Suspect?

2. Form state clears every time user toggles “edit mode” between two different components. Suspect?

3. DevTools warning about same key. Impact?

4. Accordion animation remounts every parent render; keys are new UUIDs each time. Fix?

5. Filtered list uses index keys; deleting an item in the middle corrupts later rows’ local state. Explain.

## Application

1. Rewrite a `map` of users to use a stable key.

2. Refactor `isEditing ? <Editor /> : <Viewer />` so draft text state can persist (sketch approach).

3. Decide index vs id key for: (a) static emoji legend, (b) searchable sortable table, (c) infinite scroll feed with prepend.

4. Explain in two sentences what you’ll check when “state resets mysteriously.”

## Interview questions

1. Why does React need `key`, and what breaks without a stable key?  
   **Follow-ups:** Duplicate keys? When is index OK?

2. What are the reconciliation heuristics that keep diffing O(n)?

3. What happens when component type changes at the same position?

4. Walk through the index-as-key prepend bug.

5. How do keys relate to Fiber identity?

## Connections

1. How does reconciliation decide whether a fiber is reused (Fiber unit)?
2. How do unmounts from type/key changes interact with effect cleanups (render/commit)?
3. How does this relate to “re-render ≠ DOM update”?
4. Why does list performance advice start with keys before memo?
5. How does conditional rendering of different types connect to state ownership?
