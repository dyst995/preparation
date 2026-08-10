# 04. FlatList performance  deep dive (high interview weight)

> Source: `interview-prep/react-native/06-performance.md`

This is one of the most tested RN performance topics. Know every important prop and its tradeoff, not just the names.

### Topics to learn
- [ ] Virtualization/windowing concept (recap) and the render-window lifecycle
- [ ] `keyExtractor` correctness and stability
- [ ] `renderItem` cost, purity, and memoization strategy
- [ ] `getItemLayout` � what it unlocks and its constraint (fixed/predictable height)
- [ ] `initialNumToRender`
- [ ] `windowSize`
- [ ] `maxToRenderPerBatch`
- [ ] `updateCellsBatchingPeriod`
- [ ] `removeClippedSubviews`
- [ ] `onEndReachedThreshold` / `onEndReached` for pagination
- [ ] `ListEmptyComponent`, `ListHeaderComponent`, `ListFooterComponent` � layout implications
- [ ] `extraData` for triggering re-render when non-prop state changes
- [ ] Avoiding nested `FlatList`/`VirtualizedList` inside `ScrollView`
- [ ] Item layout stability � avoid dynamic heights that fight `getItemLayout`
- [ ] Image loading strategy inside rows (thumbnails, caching, placeholders)
- [ ] `CellRendererComponent` for advanced custom cell wrapping (rare, but shows depth)

### Prop-by-prop reference table

| Prop | What it controls | Tradeoff / gotcha |
|---|---|---|
| `keyExtractor` | Stable identity per row for reconciliation | Using array index as key causes state bugs and wasted re-renders on reorder/insert; use a stable ID |
| `renderItem` | Function that renders each row | Must be light and ideally memoized (`React.memo` on the row component); avoid creating new inline functions/objects per item |
| `getItemLayout` | Precomputed `{ length, offset, index }` so FlatList skips measuring | Huge perf win, but only valid for fixed (or precisely computable) row heights; wrong values cause visual glitches/scroll jumps |
| `initialNumToRender` | How many items render on first mount | Higher = smoother initial scroll but slower first paint; tune to just cover the initial viewport + a little buffer |
| `windowSize` | Multiplier of viewport-heights kept rendered above/below (default 21 ? 10 above + 10 below + visible) | Lower = less memory/CPU but more blank cells on fast scroll ("flicker"/"popping"); higher = smoother fast scroll but more memory |
| `maxToRenderPerBatch` | Max items rendered per batch during scroll | Lower = smaller, more frequent, cheaper batches (helps keep JS thread responsive); too low can slow down time-to-fill-screen while scrolling fast |
| `updateCellsBatchingPeriod` | Delay (ms) between render batches | Higher = fewer, chunkier updates (can feel less responsive); lower = more frequent updates (more CPU) |
| `removeClippedSubviews` | Detaches views outside the viewport from the native hierarchy (Android historically bigger win) | Can cause rendering glitches in some nested/absolute-positioned layouts; test carefully, especially with sticky headers or overlays |
| `onEndReachedThreshold` | Distance (in units of viewport length) from the end to trigger `onEndReached` | Too small = pagination trigger fires late (user sees a loading gap); too large = fires too early, wasting requests |
| `extraData` | Forces re-render of items when something outside `item`/`index` changes (e.g. a "selected" set) | Forgetting this is the #1 cause of "my list doesn't update the UI even though state changed" bugs |
| `ListHeaderComponent`/`ListFooterComponent` | Non-virtualized header/footer content | Keep them light � they're not windowed |
| `CellRendererComponent` | Custom wrapper per cell (e.g. custom animations, z-index control) | Advanced; only reach for it with a specific measured need |

### Core interview answer for "how do you optimize a FlatList?"

> "First I confirm it's actually the list that's slow via profiling, not something else on the screen. Then, in order of impact: I make sure `keyExtractor` returns a stable unique ID, not index. I keep `renderItem` a memoized, presentational component with primitive or memoized props. If rows have a fixed or computable height, I add `getItemLayout` to skip measurement entirely � this alone often fixes scroll-jump and initial-render-time issues. I tune `initialNumToRender` to the actual initial viewport instead of an oversized default, and adjust `windowSize`/`maxToRenderPerBatch` based on whether I'm optimizing for memory (lower) or scroll smoothness (higher) � that's a tradeoff, not a free win. I check `removeClippedSubviews` empirically since it can help Android memory but sometimes causes rendering glitches. I make sure images in rows are properly sized/cached, not full-resolution network images. And I always confirm any lift by re-measuring FPS and memory, not by assumption."

### Common FlatList bugs (great interview material)

- Using array index as `keyExtractor` ? item state bleeds into the wrong row after insert/delete/reorder.
- Passing `data.filter(...)` or `data.map(...)` inline as the `data` prop ? new array reference every render, defeats internal optimizations, can cause unnecessary re-renders.
- Nesting a `FlatList` inside a `ScrollView` (or another `VirtualizedList`) ? breaks virtualization, RN warns about this, and you lose all the perf benefit.
- Rows with dynamic/unknown heights combined with `getItemLayout` using a guessed constant ? visible scroll jumping.
- Loading full-resolution images per row with no caching/resizing ? memory spikes, especially on Android with many rows scrolled through in a session (classic OOM crash contributor).
- Forgetting `extraData` when row appearance depends on external state (selection, favorites) ? stale UI.
- Heavy work (formatting dates, computing derived fields) done inline in `renderItem` on every render instead of memoized/precomputed once when data arrives.

### FlashList (Shopify) � awareness level

### Topics to learn
- [ ] What problem FlashList solves vs FlatList (recycling views instead of mount/unmount)
- [ ] `estimatedItemSize` requirement
- [ ] API similarity to FlatList (easy migration path) but different internals
- [ ] When it's worth the migration vs when FlatList is "good enough"

FlashList reuses (recycles) native views similarly to `RecyclerView`/`UICollectionView` recycling, rather than mounting/unmounting cells as FlatList does. This reduces the cost of view creation/teardown for very large or fast-scrolling lists, and tends to keep memory flatter over long scroll sessions.

**Interview framing**: "FlashList is a drop-in-ish replacement from Shopify built on view recycling instead of FlatList's mount/unmount model. It needs `estimatedItemSize` to pre-plan its recycling pool. I'd reach for it on very large, highly dynamic lists (feeds, chat) where FlatList's mount/unmount overhead is measurably the bottleneck � but I wouldn't reach for it by default; if FlatList profiles fine for the dataset size, I keep the simpler, more battle-tested dependency, especially in a fintech app (EasyPay) where I favor fewer, well-understood native-adjacent dependencies."

### Interview questions for this section

**Q: `getItemLayout` � what does it require and what does it save you?**
> "It requires that you can compute each row's length and offset without rendering it � normally a fixed row height, or a formula for variable-but-predictable heights. In exchange, FlatList skips its async layout measurement pass, which speeds up initial render and prevents scroll position jumps, especially valuable for `scrollToIndex` calls."

**Q: How do you handle variable-height rows performantly?**
> "If the variability is limited to a few known heights (e.g. text vs text+image), I still try to precompute layout with a formula for `getItemLayout`. If heights are truly unpredictable, I accept the measurement cost but keep everything else tight � memoized rows, stable keys, tuned `windowSize` � and consider FlashList, which handles variable sizes more gracefully via estimation and recycling."

---
