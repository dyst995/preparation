# 10. Lists: FlatList, SectionList, FlashList

> Source: `interview-prep/react-native/01-fundamentals.md`

### Topics to learn
- [ ] Why `ScrollView` + `.map` fails for large data
- [ ] Windowing / virtualization concept
- [ ] `keyExtractor` stability
- [ ] `renderItem` purity and memoization
- [ ] `getItemLayout` when rows are fixed height
- [ ] `windowSize`, `maxToRenderPerBatch`, `initialNumToRender`, `removeClippedSubviews`
- [ ] `SectionList` for grouped data
- [ ] FlashList (Shopify) as a common performance upgrade � awareness
- [ ] Avoiding inline anonymous `renderItem` recreating everything carelessly (balance with readability)

### Core interview answer for list performance

> �Use a virtualized list so only visible rows (plus a window) mount. Keep `renderItem` light, stable keys, avoid heavy anonymous props where they force re-renders, use fixed-height optimizations when possible, and profile before micro-optimizing. For very large lists, consider FlashList.�

### Common list bugs

- Unstable keys ? state reuse bugs / jank
- Putting huge trees inside each row
- Fetching images at full resolution in every cell
- Anonymous object/style props breaking memoization
- Nested `VirtualizedList` warnings (list inside scroll/list)

---
