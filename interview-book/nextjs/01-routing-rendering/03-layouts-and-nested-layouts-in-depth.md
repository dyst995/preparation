# 03. Layouts and nested layouts in depth

> Source: `interview-prep/nextjs/01-routing-rendering.md`

### Topics to learn

- [ ] Root layout is mandatory in App Router and must render `<html>` and `<body>`
- [ ] Layouts receive `{ children }` and (for the root) can't access route params directly unless declared
- [ ] Layouts can be Server Components and fetch their own data (e.g. nav data) independent of the page
- [ ] Layouts do **not** re-render on navigation between children - this is a deliberate performance feature, not a bug
- [ ] Metadata API (`export const metadata` / `generateMetadata`) is layout/page-scoped and merges up the tree

### Why this matters for real apps (Clean House framing)

> "On Clean House, the manager dashboard has a persistent shell - sidebar navigation, warehouse selector, user menu - while the content area swaps between warehouse management, delivery workflows, and reporting views. Structuring that as a `layout.tsx` around nested `page.tsx` routes means the shell doesn't remount or refetch when a manager clicks between sections, which was a real, noticeable UX improvement over an approach that treats every route as a fully separate client tree."

### Interview question

**Q: If a layout fetches data, and I navigate to a child page, does the layout refetch?**

> "No - by design, a layout instance persists across navigations to its children, so it does not remount or re-run its data fetching. If the layout's data actually needs to change (e.g. it depends on something in the URL that changed), Next.js will re-render it, but if nothing it depends on changed, it stays put. That's part of why nested layouts are more efficient than re-rendering a shared header/sidebar from scratch on every route in Pages Router."

---
