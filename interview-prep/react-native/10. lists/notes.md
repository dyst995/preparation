# Lists: FlatList, SectionList, FlashList

## What you need to know

**Virtualization (windowing)** means only **visible rows plus a buffer** exist as native views. `ScrollView` + `.map` **mounts everything** — fine for a short settings page, a **junior tell** for a feed.

`FlatList` is the RN default. **`SectionList`** is grouped virtualization (headers + rows). **FlashList** (Shopify) **recycles** native cells instead of FlatList’s typical **mount/unmount** — awareness + when to switch, not a rewrite of Shopify’s docs.

**Always profile first.** Tuning `windowSize` without measuring is theater.

Prerequisites: [core components](../7.%20core-components/notes.md) (`ScrollView` vs list), [threads](../4.%20threads/notes.md) (JS render vs UI layout), [StyleSheet](../9.%20stylesheet-flexbox/notes.md) (inline styles vs memo). Full prop checklist: [06-performance.md](../06-performance.md).

Curriculum this unit completes:

- Why `ScrollView` + `.map` fails
- Windowing
- Stable `keyExtractor`
- Light, pure `renderItem` / memo vs anonymous props
- `getItemLayout` for **fixed** height
- `windowSize`, `maxToRenderPerBatch`, `initialNumToRender`, `removeClippedSubviews`
- `SectionList`, FlashList awareness
- Nested `VirtualizedList` warning

---

## Why `ScrollView` + `.map` fails

```jsx
<ScrollView>
  {items.map((item) => (
    <Row key={item.id} item={item} />
  ))}
</ScrollView>
```

10,000 items → **10,000** host views + Yoga layout + JS fibers. Cost: **TTI**, **memory**, **UI-thread** layout, JS if the parent re-renders the whole map.

**Virtualized list:** logical scroll range is still “tall”; only a **window** of cells is mounted. As you scroll, cells **enter/leave** (FlatList) or **recycle** (FlashList).

---

## Anatomy of a `FlatList`

```jsx
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={renderItem}
  getItemLayout={(_, index) => ({
    length: ROW_H,
    offset: ROW_H * index,
    index,
  })}
/>
```

**`data`:** stable array reference when contents didn’t change. `data={items.filter(...)}` **inline** is a **new array every render**.

**`extraData`:** when the row depends on **outside** `item` (selection set). Forgetting it → **stale row UI**. (Performance chapter; mention in interviews.)

---

## `keyExtractor` — identity, not index

Same rule as React `key`. **`index` as key** after insert/reorder → **state sticks to the wrong row** (TextInput in a cell, expanded/collapsed). Use a **stable id**.

Duplicate ids → reconciliation chaos. Missing extractor → RN may fall back to index-like behavior.

---

## `renderItem` — purity, memo, anonymous props

`renderItem` should stay **cheap**: presentational row, **no** `JSON.parse` / heavy format per call.

```jsx
// Defeats memo: new function + style every parent render
renderItem={({ item }) => (
  <Row item={item} style={{ padding: 8 }} onPress={() => go(item.id)} />
)}

const renderItem = useCallback(
  ({ item }) => <Row item={item} onPress={onPressRow} />,
  [onPressRow],
);
```

**Balance with readability:** a module-level `renderItem` or `memo(Row)` + stable `onPress` from the parent. Don’t wrap every pixel in `useCallback` as religion — **measure**. Interviewers still ding **inline arrows that bust memo** on hot lists.

Keep **images** thumbnail-sized; full-res in every cell is an **OOM** classic (especially Android).

---

## `getItemLayout`

If every row has a **known height** (or a **formula**), return `{ length, offset, index }`. FlatList **skips measuring** → faster first layout, fewer **scroll jumps**, happier **`scrollToIndex`**.

**Wrong constant** with variable-height rows → **jumps**. If heights are truly unknown, **don’t fake it**; tighten everything else / consider FlashList estimation.

---

## Window knobs (tradeoffs, not free wins)

| Prop | Idea | Tradeoff |
| --- | --- | --- |
| **`initialNumToRender`** | First paint batch | Too high: slow TTI. Too low: blank first screen |
| **`windowSize`** | Viewport-heights kept around the view (default is **large**) | Lower: memory, more **blank cells** on fast fling. Higher: smoother, more RAM |
| **`maxToRenderPerBatch`** | How many cells per JS batch while filling | Too high: JS hitch. Too low: slow to fill |
| **`removeClippedSubviews`** | Detach offscreen native views (Android often) | Memory win; can **glitch** overlays / sticky headers — **test** |

Say **tradeoff** out loud. Reciting names without “blank cells vs memory” is a mid answer.

---

## `SectionList`

Grouped data: **section title** + rows, still virtualized.

```text
sections: [{ title: 'A', data: [...] }, ...]
```

Same rules: stable keys, light rows, don’t nest in a `ScrollView`. Use it when the **UX is grouped**, not as a perf hack.

---

## FlashList (awareness)

Shopify **FlashList**: API **close** to FlatList; internals **recycle** views (RecyclerView / UICollectionView family) instead of constantly **creating/destroying** cells. Needs **`estimatedItemSize`**.

**Reach for it** when the list is **huge / fast-scroll** and **tuned FlatList is still the measured bottleneck**. **Don’t** add it by default in a conservative fintech app (EasyPay-style: fewer native-adjacent deps).

---

## Nested lists

`VirtualizedList` inside `ScrollView` (or another list) **breaks windowing** — RN **warns**. The inner list often **renders all items**. Fix: **one** scrolling virtualized list; headers via `ListHeaderComponent`, or a different UX.

---

## Common mistakes and misconceptions

- Index keys; duplicate keys
- Huge trees / full-res images per row
- Inline `style` / `onPress` busting `memo`
- Nested `VirtualizedList`
- `getItemLayout` on **variable** height guessed as 72
- FlashList “because Twitter said so” without a profile
- Virtualization ≠ **image lazy load** (related, different)

---

## Connections to other concepts

`window of host views → less Yoga/UI work + less JS row render`

- **[Core components](../7.%20core-components/notes.md):** when ScrollView is still OK.
- **[Threads](../4.%20threads/notes.md):** blank cells on fling = **JS** not filling the window; scroll **physics** can still be UI-thread.
- **[StyleSheet](../9.%20stylesheet-flexbox/notes.md):** stable styles for memoized rows.
- **React web virtualization:** same windowing idea, different host.
- **Performance chapter:** full optimize-FlatList spoken answer + `extraData`.

---

## Interview perspective

Preserved core answer:

> Use a virtualized list so only visible rows (plus a window) mount. Keep `renderItem` light, stable keys, avoid heavy anonymous props where they force re-renders, use fixed-height optimizations when possible, and profile before micro-optimizing. For very large lists, consider FlashList.

Common bugs to name: **unstable keys**, fat rows, full-res images, anonymous props, **nested VirtualizedList**.

Add: `getItemLayout` needs **real** heights; `windowSize` is a **memory vs blank-cell** tradeoff; FlashList **recycles**.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
