# 02. File-based routing conventions (App Router)

> Source: `interview-prep/nextjs/01-routing-rendering.md`

### Topics to learn

- [ ] `page.tsx` = publicly reachable route UI for that segment
- [ ] `layout.tsx` = shared UI that wraps `page.tsx` and all children; persists across navigation
- [ ] `template.tsx` = like layout but remounts on navigation (rare; e.g. re-run enter animations)
- [ ] `loading.tsx` = automatic `<Suspense>` fallback for that segment while it (and its data) loads
- [ ] `error.tsx` = client error boundary for that segment (`"use client"` required)
- [ ] `not-found.tsx` = rendered on `notFound()` call or unmatched route
- [ ] Dynamic segments: `[id]`, catch-all `[...slug]`, optional catch-all `[[...slug]]`
- [ ] Route groups `(marketing)` - organize without affecting the URL
- [ ] Parallel routes `@slot` and intercepting routes `(.)folder` - advanced, know they exist and roughly why (modals that also work as full pages, dashboards with independent sections)
- [ ] `route.ts` = Route Handler (API endpoint) for that segment, not a page

### File tree example

```text
app/
  layout.tsx              # root layout - <html>, <body>, global providers
  page.tsx                # "/"
  loading.tsx             # loading UI for "/"
  (marketing)/
    about/
      page.tsx             # "/about" - group doesn't affect URL
  dashboard/
    layout.tsx             # persists across all /dashboard/* routes
    page.tsx                # "/dashboard"
    loading.tsx
    orders/
      [orderId]/
        page.tsx            # "/dashboard/orders/123"
        error.tsx
  api/
    orders/
      route.ts              # GET/POST /api/orders
```

### Interview question

**Q: What is the difference between `layout.tsx` and `template.tsx`?**

> "A layout persists its state and DOM across navigations within that segment - it doesn't remount when you move between sibling pages. A template remounts on every navigation, so local state resets and effects rerun. I'd reach for a template only when I specifically need per-navigation behavior, like re-triggering an enter animation - layouts are the default for shared nav, sidebars, and providers."

**Q: How would you build a dashboard with a persistent sidebar and independently loading content panels?**

> "A `layout.tsx` at the `dashboard` segment renders the sidebar once, and `{children}` is the routed content. Each nested route gets its own `loading.tsx`, so navigating between dashboard sections shows a local skeleton for the panel while the sidebar stays mounted and interactive. If two independent panels needed to load and navigate independently on the same URL, that's what parallel routes (`@slot`) are for."

---
