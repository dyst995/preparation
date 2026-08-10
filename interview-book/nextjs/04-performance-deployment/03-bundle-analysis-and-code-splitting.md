# 03. Bundle analysis and code splitting

> Source: `interview-prep/nextjs/04-performance-deployment.md`

### Topics to learn

- [ ] `@next/bundle-analyzer` wraps `next.config.js` and generates a visual treemap of what's in each JS bundle
- [ ] Automatic route-based code splitting - each route only ships the JS it needs, not the whole app
- [ ] `next/dynamic` for manual code splitting of heavy Client Components (charting libraries, rich text editors, map widgets) so they aren't in the main bundle for routes that don't need them
- [ ] `ssr: false` option in `next/dynamic` to skip server-rendering a component entirely (for browser-only libraries)
- [ ] Server Components already reduce client bundle size structurally - this is often a bigger win than manual splitting, since non-interactive UI ships zero JS by default
- [ ] Common bundle bloat causes: importing a whole utility library instead of a single function (check for tree-shaking support), accidentally marking a large subtree `"use client"`, including heavy moment.js/lodash-style libraries without lighter alternatives

### Example: lazy-loading a heavy client widget

```tsx
import dynamic from "next/dynamic";

const RevenueChart = dynamic(() => import("./revenue-chart"), {
  loading: () => <ChartSkeleton />,
  ssr: false, // charting library only works in the browser
});
```

### Interview question

**Q: How would you find out why a page's JS bundle is unexpectedly large?**

> "I'd run the bundle analyzer against the build to see the actual treemap of what's shipped for that route, then look for the usual suspects: a large third-party library that isn't tree-shaken well, a component that's marked `'use client'` higher in the tree than necessary (pulling everything under it into the client bundle), or a heavy widget that's always loaded eagerly instead of via `next/dynamic`. On a Server-Components-first App Router app, my first instinct is also to check whether something that could stay a Server Component was accidentally made a Client Component."

---
