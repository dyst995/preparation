# List Virtualization — Answers

## Core recall

1. Avoid creating/layout/painting DOM (and React nodes) for every list item when only a viewport-worth are visible.  
2. The set of item indices currently mounted (visible range).  
3. Extra rows rendered outside the viewport to reduce blank flash during fast scroll.  
4. It absolutely positions/sizes the row in the virtual scroll coordinate space — required for correct placement.  
5. **react-window** — lean default; **react-virtualized** — older/heavier; **TanStack Virtual** — headless primitive.  
6. Worth it: hundreds–thousands+ / complex rows / measured bottleneck. Not: small tens of items.  
7. No — data can stay in memory; only DOM/window is sparse.  
8. Same windowing + recycling idea; RN implements via native lists.

## Explain why

1. Browser still builds and lays out offscreen nodes; cost scales with count, not with visible count.  
2. Memo skips *re-render work* but `.map()` still *mounts* all rows — DOM size remains.  
3. Total height and per-row offsets depend on measurements/estimates; errors → jump/gap/overlap.  
4. Offscreen text isn’t in the document, so in-page search can’t see it.  
5. Complexity and UX tradeoffs; bottleneck might be network/CSS/compute elsewhere.  
6. Row components recycle by index; state tied to the component instance follows the slot, not the item id.

## Compare and contrast

1. **Full map:** all nodes. **Virtualized:** ~visible+overscan nodes, positioned in a tall scroller.  
2. Window lean vs virtualized heavy legacy vs TanStack headless ownership of markup.  
3. **Pagination:** fewer *items fetched/held*. **Virtualization:** fewer *mounted nodes* for a large in-memory (or appended) list. Often combined.  
4. Memo = update efficiency for mounted rows; virtualization = don’t mount most rows.  
5. Same idea; web div positioning vs native recycler.

## Predict / choose

1. **No** — not worth complexity.  
2. **Yes, lean virtualize** (or confirm with profile) — large DOM is the risk.  
3. **Virtualize** (also check row cost); memo alone insufficient.  
4. **Usually no** — 50 is small; optimize images if needed.

## Debugging

1. Underestimated `itemSize` — positions assume 40px → overlap; fix size or use variable-size API.  
2. Rows stack incorrectly / all at origin — scroll looks broken.  
3. State lived in recycled row instance; lift state by `item.id` or controlled from parent store.  
4. Measure/cache real heights (`VariableSizeList` / TanStack measure); avoid wrong estimates.

## Application

1.
```jsx
<FixedSizeList height={400} width="100%" itemCount={items.length} itemSize={56}>
  {({ index, style }) => <div style={style}>{items[index].name}</div>}
</FixedSizeList>
```

2. Only visible indices mount; overscan adds a few extra rows so scrolling doesn’t reveal empty gaps before the next batch mounts.  
3. Paraphrase preserved interview answer — large lists, DOM savings, complexity/heights/find-in-page; profile first.  
4. Find-in-page gaps; focus/forms in recycled rows; announce list size carefully for SR users.

## Interview questions

1. **Spoken:** Virtualize when full render cost dominates — hundreds+ rows, rich cells; mounts visible+overscan only. Tradeoff: heights, find-in-page, a11y/complexity — only after profiling. Pick `react-window` for simple fixed lists or TanStack if headless/stack fit. Same idea as RN FlatList.  
2. **Spoken:** Compute visible index range from scrollTop; render those rows with absolute offsets; keep container scroll height = full logical height.  
3. **Spoken:** No — pagination limits data; virtualization limits DOM. Use both for huge datasets.  
4. **Spoken:** Variable heights, search-in-page, some SEO/a11y, sticky headers, form state in rows.

## Connections

1. Fat list commits / long layout → evidence to virtualize; short bars → look elsewhere.  
2. Parent of the window still updates — stable row props + memo reduce work for the *visible* rows.  
3. Virtualization cuts DOM/commit work by not creating nodes; pure JS re-render memo is a different lever.  
4. Infinite query appends pages to `items`; virtual list windows that growing array so DOM stays small while data grows.
