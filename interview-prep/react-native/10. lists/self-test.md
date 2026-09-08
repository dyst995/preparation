# Lists: FlatList, SectionList, FlashList — Self-test

## Core recall

1. Why does `ScrollView` + `.map` fail for large data?
2. What is windowing / virtualization in one sentence?
3. What should `keyExtractor` return, and why not `index`?
4. What does `getItemLayout` require, and what does it skip?
5. `windowSize` — what does lowering it trade?
6. `initialNumToRender` — what goes wrong if it’s huge?
7. When do you use `SectionList` vs `FlatList`?
8. What does FlashList change internally vs FlatList (one idea)?

## Explain why

1. Why can native scroll still feel OK while list cells pop in blank?
2. Why do index keys break `TextInput` state in a row after insert?
3. Why does `renderItem={() => <Row style={{}} onPress={() => {}} />}` fight `React.memo`?
4. Why is nested `FlatList` inside `ScrollView` a virtualization bug?
5. Why can a wrong `getItemLayout` length be worse than omitting it?
6. Why isn’t FlashList the default in a conservative production app?

## Compare and contrast

1. `ScrollView` + map vs `FlatList`
2. FlatList mount/unmount vs FlashList recycle
3. `SectionList` vs fake sections in one FlatList
4. `windowSize` vs `maxToRenderPerBatch`
5. `removeClippedSubviews` help vs glitch risk
6. Virtualization vs lazy-loading images

## Predict the output

1. 2,000 rows in `ScrollView` `.map`. How many row host views on first paint (order of magnitude)? Explain.

2. `keyExtractor={(_, i) => String(i)}`, user inserts at the top. A focused TextInput in row 0 — what identity bug?

3. `getItemLayout` says `length: 72` but some rows are 140px. Fast `scrollToIndex` — what do you expect?

4. `data={items.filter((x) => x.on)}` inline on every parent render. What identity problem?

## Debugging

1. RN warning: VirtualizedList nested in ScrollView. What’s the fix direction?

2. List doesn’t update checkmarks when `selectedIds` changes; `item` objects unchanged. Which prop?

3. Fast fling shows white holes; they set `windowSize={1}` for “memory.” Diagnosis?

4. Android OOM after scrolling a feed of uncropped photos. First list-shaped fix?

## Application

1. Write a `keyExtractor` and a `getItemLayout` for fixed `ROW = 56`.

2. Name four FlatList props you’d mention in “how do you optimize a list?” in impact order.

3. When would you still use `ScrollView` + map?

4. One sentence: when you migrate to FlashList.

## Interview questions

1. Core list performance answer (virtualized, keys, renderItem, getItemLayout, profile, FlashList).  
   **Follow-ups:** `getItemLayout` constraints? Nested lists? Why not index keys?

2. `windowSize` / `maxToRenderPerBatch` — are they free FPS?

3. FlashList vs FlatList — when to switch?

4. How do you keep `renderItem` from busting memo without unreadable code?

5. Name three common list bugs from the curriculum.

## Connections

1. How does this protect the **JS** thread vs the **UI** thread?
2. How do StyleSheet stable refs connect to memoized rows?
3. How is this the same idea as web list virtualization?
4. How does `removeClippedSubviews` relate to native view hierarchy (not JS)?
5. What belongs in `06-performance.md` beyond this unit (`extraData`, pagination threshold, …)?
