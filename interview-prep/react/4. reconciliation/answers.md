# Reconciliation: The Diffing Algorithm — Answers

## Core recall

1. General tree diff is **O(n³)** — too slow for UI; React uses heuristics for ~**O(n)**.
2. **Different types ⇒ different trees** (full remount); **keys** give list identity across reorders.
3. **Unmount** old subtree; **mount** new from scratch (state/effects/DOM of old are torn down).
4. Treated as **different identity** — old removed, new mounted.
5. By **index / position** in the array.
6. React reuses the index-0 fiber; props change to the new item but **local state stays** — wrong item “owns” old state.
7. Static lists with no mid-list churn, or items with **no** meaningful local state/DOM identity.
8. Keys are **unique among siblings** at that level.

## Explain why

1. UIs rarely mean “same subtree, different root type”; deep-diffing would be costly and usually wrong — remount is the safe/fast default.
2. Order isn’t identity once items move; keys tell React which child is which across renders.
3. State is stored on the **reused fiber**; index key ⇒ same fiber at that index ⇒ state doesn’t follow `item.id`.
4. Ternary swaps **component type** ⇒ remount ⇒ that fiber’s state is destroyed.
5. New key every render ⇒ constant remount ⇒ lost state + wasted DOM work.
6. Keys are for React’s reconciler, not part of the child’s public props API (`key` isn’t for your logic — pass `id` separately).

## Compare and contrast

1. **Same type:** reuse, update props. **Different type:** destroy and recreate subtree.
2. **`id`:** identity follows data. **Index:** identity follows position.
3. **Good keys:** move fibers with items. **No/index keys:** morph props on positional fibers → state bugs.
4. **Lift state:** state above branch survives. **One type:** avoid remount by not switching component types.
5. **Duplicate:** ambiguous identity, warnings, unreliable updates. **Missing:** fallback to index matching.
6. **Heuristics:** fast, good enough for UI conventions. **Optimal diff:** expensive, rarely needed if keys/types are used well.

## Predict the behavior

1. **No** (typically) — different keys ⇒ different identity ⇒ remount; focus/internal state reset.
2. **No** — type change unmounts `Editor`; remounting later is a fresh instance.
3. **Still the first row’s fiber** — now showing the prepended item’s props with `expanded=true` (wrong logical item).
4. **Yes** — matched by id; state/DOM move with the item.
5. **Dev warning**; updates unreliable — fix uniqueness.

## Debugging

1. **Index keys (or unstable keys)** after sort — state stuck on position.
2. **Type change remount** (`Editor`/`Viewer`) — lift state or keep one component.
3. Sibling identity collisions — fix duplicate keys.
4. Use **stable keys** from data (or stable constants), not per-render UUIDs.
5. Index matching after delete shifts later items onto earlier fibers — local state misaligned.

## Application

1.
```jsx
{users.map((u) => (
  <UserRow key={u.id} user={u} />
))}
```

2. Lift draft into parent, or single `Field` component with `mode="edit" | "view"` props (same type mounted).

3. (a) index OK (b) stable row id (c) stable id — especially with prepend.

4. Did **type** or **key**/position identity change? Is the list keyed by **index** while reordering?

## Interview questions

1. **Spoken:** Keys = stable list identity. Without them, index matching mis-assigns state/DOM on reorder/mid-list edits. Use data ids, not index, when the list can change shape.  
   **Follow-ups:** Duplicates → warning/unreliable; index OK only for static/stateless lists.

2. **Spoken:** Type change ⇒ replace subtree; keys ⇒ match list items in ~O(n) instead of general tree diff.

3. **Spoken:** Old subtree unmounts (state/effects cleaned up); new type mounts fresh.

4. **Spoken:** Prepend keeps `key={0}` fiber; new item’s props land on old state — classic wrong-input bug; fix with `key={id}`.

5. **Spoken:** Key + type + sibling position decide whether the same fiber is reused; reuse preserves hooks/DOM identity.

## Connections

1. Same type + matching key ⇒ reuse fiber; else create/delete fibers as units of work.
2. Remount runs **passive/layout effect cleanups** on the way out during commit of deletions.
3. Reconcile may reuse fiber and skip host work if props/text unchanged — re-render without DOM churn.
4. Wrong keys cause remounts or wrong updates that memo can’t fix; identity first, then memo.
5. State should live where identity is stable — above conditional type branches if it must survive the toggle.
