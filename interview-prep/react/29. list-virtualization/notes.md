# List Virtualization

## What you need to know

**List virtualization** (also called **windowing**) means rendering only the DOM nodes for items that are **visible in the viewport** (plus a small **overscan** buffer), instead of mounting thousands of rows from a full `.map()`.

As the user scrolls, the library **repositions / recycles** a small pool of row elements using absolute positioning (or transforms) so they appear at the correct scroll offsets in a tall scrollable container.

Use it when lists are **large enough that full DOM cost is the bottleneck** (often hundreds–thousands of rows, especially with rich row UI). Skip it for small bounded lists — complexity isn’t free.

Prerequisites: [React DevTools Profiler](../28.%20react-devtools-profiler/notes.md), [re-render vs DOM](../8.%20rerender-vs-dom/notes.md). RN parallel: `FlatList` / `FlashList` in `../../react-native/06-performance.md`.

---

## The problem (preserved)

```jsx
// Naive: every item becomes a real DOM node
<ul>
  {items.map((item) => (
    <li key={item.id}>{item.name}</li>
  ))}
</ul>
```

With 10,000 items the browser must **create, layout, and paint** ~10,000 nodes even if only ~30 fit on screen. Cost hits:

- **Initial mount** (slow first paint / TTI)  
- **Updates** (data change re-renders a huge tree)  
- **Memory** (large DOM + React fiber tree)  
- Sometimes **scroll** if updates re-render the whole list carelessly  

Profiler symptom: one commit with a huge list parent / thousands of row components, or Chrome Performance showing heavy **layout/paint**.

---

## The solution: windowing (preserved)

```text
Full list height (logical): 10,000 × 48px = 480,000px scroll range
Mounted DOM rows:           ~ viewport/rowHeight + overscan  (e.g. 20–40 nodes)

On scroll:
  compute visible index range
  render those items with style={{ position, top/height, ... }}
  recycle the same row components for new indices
```

Core ideas:

1. **Window** — only indices `[start, end]` currently needed.  
2. **Overscan** — a few extra rows above/below so fast scrolling doesn’t flash empty space.  
3. **Positioning** — each row gets a `style` (absolute `top`/`height` or transform) so it sits where it would in the full list.  
4. **Spacer / total size** — outer container scroll height reflects *full* list length so the scrollbar feels correct even though most rows aren’t mounted.

You still hold the **data array** in memory; you just don’t mount **DOM/React nodes** for offscreen rows.

---

## Minimal `react-window` example (preserved)

```jsx
import { FixedSizeList } from 'react-window';

function VirtualizedList({ items }) {
  return (
    <FixedSizeList
      height={600}
      width="100%"
      itemCount={items.length}
      itemSize={48}
    >
      {({ index, style }) => (
        <div style={style}>{items[index].name}</div>
      )}
    </FixedSizeList>
  );
}
```

- `height` / `width` — viewport of the list.  
- `itemCount` / `itemSize` — how to compute total scroll size and visible range (**fixed** row height).  
- Row render prop receives **`style`** — **must** apply it to the row root or positioning breaks.  
- Variable-size lists need measurement APIs (`VariableSizeList`, TanStack Virtual, etc.) — harder than fixed size.

---

## Libraries (web ecosystem, preserved)

| Library | Character |
| --- | --- |
| **`react-window`** | Lightweight, minimal API; good default for fixed/variable lists & grids |
| **`react-virtualized`** | Older, richer, heavier; mostly superseded by `react-window` (same author, leaner) |
| **`@tanstack/react-virtual`** | Headless: scroll/measure logic, you own markup — fits TanStack stacks |

Interview: name **one** default (`react-window` or TanStack Virtual) and know virtualization ≠ a specific brand.

---

## When you actually need it (preserved)

**Reach for it when:**

- Hundreds–thousands+ of rows  
- Non-trivial per-row UI (images, inputs, nested widgets)  
- Profiler / Performance shows list mount or update as the bottleneck  

**Not needed when:**

- Small bounded lists (tens of items)  
- Cost is elsewhere (network waterfall, one expensive chart, CSS)  

Virtualization adds: height estimation, scroll container setup, trickier **find-in-page**, SEO (if content must be in DOM for crawlers), some a11y patterns, sticky headers, dynamic row size bugs. **Profile first** — don’t virtualize every `<ul>` preemptively.

---

## Tradeoffs and edge cases

| Concern | Why it matters |
| --- | --- |
| **Fixed vs variable height** | Fixed is easy; variable needs measure + cache or estimates (jumpiness if wrong) |
| **Keys / recycling** | Rows reuse components for new indices — avoid storing “index-only” local state that should follow an item id |
| **Focus / forms** | Inputs in rows can lose focus or state when scrolled off unless state is lifted to item id |
| **Ctrl+F / find-in-page** | Offscreen text isn’t in the DOM — browser search won’t find it |
| **Accessibility** | Ensure roles, virtual focus management if building custom widgets |
| **SSR / SEO** | May need non-virtualized critical content or progressive strategies |
| **Sticky rows / sections** | Supported by some libs; more complexity |

---

## RN overlap (preserved)

Same mental model as React Native **`FlatList` / `FlashList`**: windowing + recycling. Web uses absolute-positioned divs; RN uses native recycler views. Mentioning both in interviews shows cross-platform depth — see `../../react-native/06-performance.md`.

---

## Virtualization vs other list performance tactics

| Tactic | What it fixes |
| --- | --- |
| **Virtualization** | Too many **DOM nodes** / mount cost |
| **`React.memo` on rows** | Wasted **re-renders** when parent updates but row props stable — still mounts all rows if you `.map()` everything |
| **Pagination / infinite query** | Too much **data** / network — complementary (fewer items *and/or* window DOM) |
| **Keys by id** | Correct reconciliation when list mutates |

Memo alone does **not** replace virtualization for 10k mounted rows.

---

## Interview answer (preserved)

**Q: When would you virtualize a list, and what's the tradeoff?**

> “When the list is large enough that rendering every row costs more than the benefit — typically hundreds of rows or more, especially with non-trivial row content. Virtualization only mounts visible rows plus a small overscan buffer, dramatically cutting DOM node count and render/layout cost. The tradeoff is complexity: you often need known or estimated row heights, native browser behaviors like Ctrl+F find-in-page or plain scrollbar-drag-to-position become harder to preserve perfectly, and it’s one more moving part to maintain — so I only reach for it once profiling shows the unvirtualized list is the actual bottleneck, not preemptively for every list in the app.”

---

## Common mistakes and misconceptions

1. Virtualizing lists of 20 items “for best practice.”  
2. Forgetting to apply `style` to the row root.  
3. Assuming `memo` on rows fixes 5,000 DOM nodes.  
4. Keeping row UI state keyed only by `index` while scrolling recycles that index’s component for another item.  
5. Wrong `itemSize` → gaps, overlap, jumpy scroll.  
6. Virtualizing before measuring — bottleneck was fetch or CSS.  
7. Confusing pagination (data) with windowing (DOM).

---

## Connections to other concepts

```
thousands of fibers + DOM nodes
  → slow mount / layout
  → virtualize: small window of nodes

Profiler: fat list commit
  → candidate for windowing

memo / useCallback
  → help updates inside the window
  → don’t replace windowing for scale

FlatList (RN)
  → same windowing idea, native implementation
```

---

## Interview perspective

Be ready to:

1. Define windowing + overscan in one sentence.  
2. When yes / when no + tradeoffs (heights, find-in-page, complexity).  
3. Name `react-window` or TanStack Virtual.  
4. Contrast with memo and pagination.  
5. Cross-link to RN `FlatList`.  
6. Tie decision to **profiling**.

---

# Self-test

## Core recall

1. What problem does list virtualization solve?
2. What is a “window” in this context?
3. What is overscan?
4. Why does each row receive a `style` prop in `react-window`?
5. Name three web virtualization libraries and one-line differences.
6. Roughly when is virtualization worth it vs not?
7. Does virtualization mean the data array isn’t held in memory?
8. How does this relate to RN `FlatList`?

## Explain why

1. Why is mounting 10,000 `<li>`s expensive even if most are offscreen?
2. Why doesn’t `React.memo` on each row replace virtualization?
3. Why do variable-height rows make virtualization harder?
4. Why can find-in-page break under virtualization?
5. Why profile before virtualizing every table?
6. Why can local state inside a row “jump” to another item on scroll?

## Compare and contrast

1. Full `.map()` vs virtualized list  
2. `react-window` vs `react-virtualized` vs `@tanstack/react-virtual`  
3. Virtualization vs pagination / infinite scroll  
4. Virtualization vs memoizing list rows  
5. Web windowing vs RN `FlatList` / `FlashList`  

## Predict / choose

1. 25 static settings rows — virtualize?  
2. 8,000 log lines, simple text, scrollable panel — lean?  
3. Profiler: list mount 400ms, 2,000 row components — first structural fix?  
4. Product grid 50 cards with images, already paginated 50/page — need windowing?

## Debugging

1. Virtual list shows overlapping rows; `itemSize={40}` but rows are ~72px tall. Cause?  
2. Row component omits spreading/applying `style`. Symptom?  
3. Controlled input in a row loses typed text when user scrolls away and back. Likely cause?  
4. After adding `react-window`, scroll is jumpy with dynamic content heights. Direction?

## Application

1. Sketch `FixedSizeList` usage for `items` with row height 56 and viewport 400.  
2. Explain overscan to an interviewer in two sentences.  
3. Spoken: when virtualize + tradeoff.  
4. List two a11y/UX caveats you’d mention in a design review.

## Interview questions

1. When would you virtualize a list, and what's the tradeoff?  
   - Follow-up: Which library would you pick and why?  
   - Follow-up: How is this like FlatList?
2. How does windowing work at a high level?  
3. Virtualization vs just paginating the API — same thing?  
4. What breaks or gets harder when you virtualize?

## Connections

1. How does the Profiler guide the virtualization decision?
2. How do memo/useCallback still matter *inside* a virtualized list?
3. How does “re-render vs DOM” clarify what virtualization optimizes?
4. How do infinite React Query pages + virtualization compose?
