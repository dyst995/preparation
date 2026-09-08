# Lists: FlatList, SectionList, FlashList — Answers

## Core recall

1. It **mounts every row** as a native view — memory, layout, JS tree explode.
2. Only **visible + buffer** cells are mounted (logical list can still be long).
3. A **stable unique id**. Index **moves** after insert/reorder → wrong row **state**.
4. **Known** length/offset per index. Skips **async measurement**.
5. **Less memory/CPU** vs more **blank cells** on fast scroll.
6. **Slow first paint / TTI** — too much work before first frame.
7. **Grouped** UI (section headers). Same virtualization rules.
8. **Recycles** native views instead of constantly **mount/unmount**.

## Explain why

1. **UI thread** can pan the scroll view; **JS** hasn’t created cells for the new window yet.
2. React reuses the component **by key**; index 0 is still “the first cell instance.”
3. **New** `style` / `onPress` every time → memo shallow-compare **fails**.
4. Inner list often **cannot window**; it thinks the viewport is unbounded. Warning is real.
5. Offsets **lie** → jump, overlap, `scrollToIndex` wrong.
6. Extra **dependency** and migration; FlatList is enough if **profiled** fine (esp. fintech risk appetite).

## Compare and contrast

1. **All mounted** vs **windowed**.
2. **Create/destroy** cells vs **reuse** a pool (`estimatedItemSize`).
3. **Built-in sections** vs you flattening groups into one `data` (possible, more work).
4. **How much** is kept around vs **how many** attach per JS batch.
5. **Detach offscreen native views** vs sticky/overlay **bugs**.
6. **Which rows exist** vs **when images download**. Do both on feeds.

## Predict the output

1. **~2,000** (all of them) — not ~15.
2. The instance that **was** row 0 **keeps** the TextInput; it now shows the **new** first item’s data or mixed state — **index key**.
3. **Jumps / wrong offset** — layout math doesn’t match real height.
4. **New `data` array** every time → list thinks data changed; extra work / lost internal opts.

## Debugging

1. **One** virtualized scroller; `ListHeaderComponent` / flatten; don’t wrap FlatList in ScrollView.
2. **`extraData={selectedIds}`** (or put selection **on the item**).
3. **Window too small** — raise `windowSize` or accept blanks; don’t cargo-cult `1`.
4. **Resize/cache** thumbnails; don’t decode 4000px into a 40px cell.

## Application

1. `keyExtractor={(item) => item.id}`; `getItemLayout={(_, i) => ({ length: 56, offset: 56 * i, index: i })}`
2. e.g. **keys → light memoized row → getItemLayout if fixed → initialNumToRender/windowSize** (then images, removeClipped, FlashList).
3. **Short** bounded content (settings, small form).
4. **Measured** huge/fast list still limited by FlatList mount/unmount after tuning.

## Interview questions

1. **Spoken:** Virtualize so only a window mounts; stable keys; light renderItem; fixed-height `getItemLayout`; profile before micro-opts; FlashList for very large lists.  
   **Follow-ups:** Known heights only. Nested list breaks windowing. Index keys steal state.

2. **Spoken:** **No** — memory vs blank cells / JS batch size vs hitch. Tune from a profile.

3. **Spoken:** Recycle vs mount/unmount; `estimatedItemSize`; switch when FlatList is the **measured** bottleneck.

4. **Spoken:** `memo(Row)`, module-level or `useCallback` `renderItem`, StyleSheet not inline objects; don’t callback-wrap the universe.

5. Unstable keys; fat rows; full-res images; anonymous props; nested VirtualizedList.

## Connections

1. Fewer **row functions** (JS) and fewer **Yoga nodes** (UI). Blank on fling is often **JS**.
2. Stable `style` refs keep **memo** honest.
3. Same **window**; DOM vs **native views**.
4. Native hierarchy detach — **UI/memory**, not JS virtualization itself.
5. `extraData`, `onEndReached`, `updateCellsBatchingPeriod`, full spoken optimize-FlatList paragraph.
