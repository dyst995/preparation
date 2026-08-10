# 05. List virtualization

> Source: `interview-prep/react/04-performance-patterns.md`

### The problem

Rendering a `.map()` over thousands of DOM nodes means the browser must create, layout, and paint *all* of them, even the 30 currently visible in the viewport - this is expensive both on initial render and on every subsequent update (scroll-triggered re-renders, data changes).

### The solution: windowing/virtualization

Render only the DOM nodes for items **currently visible (plus a small buffer/"overscan")**, and recycle/reposition nodes as the user scrolls, using absolute positioning (or transforms) to place each rendered row where it would appear in the full (unrendered) list.

### Libraries (web ecosystem)

- **`react-window`** - lightweight, minimal API, good default choice for fixed or variable-size lists/grids.
- **`react-virtualized`** - older, more feature-rich, heavier; largely superseded by `react-window` (same author, leaner successor) for most use cases.
- **`@tanstack/react-virtual`** - headless virtualization primitive (from the TanStack team, same org as React Query) - gives you the scroll/measurement logic without prescribing markup, good fit if you're already using other TanStack tools.

```jsx
import { FixedSizeList } from 'react-window';

function VirtualizedList({ items }) {
  return (
    <FixedSizeList height={600} width={'100%'} itemCount={items.length} itemSize={48}>
      {({ index, style }) => (
        <div style={style}>{items[index].name}</div>   // `style` positions this row absolutely
      )}
    </FixedSizeList>
  );
}
```

### When you actually need it

- Lists in the hundreds-to-thousands+ of rows, especially with any per-row complexity (images, interactive controls).
- NOT needed for small, bounded lists (tens of items) - virtualization adds its own complexity (fixed/estimated row heights, harder to implement natural browser find-in-page/SEO/accessibility patterns) and isn't worth it below a real threshold you should verify by profiling, not assuming.

### RN overlap note

You already know this pattern from React Native's `FlatList`/`FlashList` (see `../react-native/06-performance.md`) - web virtualization is the same core idea (windowing + recycling), just implemented via absolute-positioned `<div>`s instead of native recycler views. This is a good cross-reference to mention in interviews to show depth across both platforms.

### Interview question

**Q: When would you virtualize a list, and what's the tradeoff?**

> "When the list is large enough that rendering every row costs more than the benefit - typically hundreds of rows or more, especially with non-trivial row content. Virtualization only mounts visible rows plus a small overscan buffer, dramatically cutting DOM node count and render/layout cost. The tradeoff is complexity: you often need known or estimated row heights, native browser behaviors like Ctrl+F find-in-page or plain scrollbar-drag-to-position become harder to preserve perfectly, and it's one more moving part to maintain - so I only reach for it once profiling shows the unvirtualized list is the actual bottleneck, not preemptively for every list in the app."

---
