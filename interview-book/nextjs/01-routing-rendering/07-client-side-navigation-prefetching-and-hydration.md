# 07. Client-side navigation, prefetching, and hydration

> Source: `interview-prep/nextjs/01-routing-rendering.md`

### Topics to learn

- [ ] `<Link>` prefetches linked routes in the viewport by default (production only) for instant navigation
- [ ] `useRouter()` (from `next/navigation` in App Router, not `next/router`) for programmatic navigation
- [ ] Soft navigation: App Router reuses layouts and only re-renders/fetches the changed segment
- [ ] Hydration: the client "attaches" React to server-rendered HTML, matching the DOM instead of re-creating it
- [ ] Hydration mismatch errors: caused by rendering something different on server vs first client render (e.g. `Date.now()`, `Math.random()`, browser-only checks like `typeof window` used inside render, locale/timezone differences)
- [ ] `suppressHydrationWarning` as a narrow escape hatch, not a general fix

### Interview question

**Q: You see "Hydration failed because the initial UI does not match what was rendered on the server." How do you debug it?**

> "First I look for anything non-deterministic or environment-dependent in the render path - current time/date formatting, random IDs, `window`/`navigator` checks that run during render instead of in `useEffect`, or browser extensions injecting markup. The fix is usually to move client-only logic into `useEffect` so it runs after hydration, or to render a stable placeholder on the server and swap it in after mount. I treat `suppressHydrationWarning` as a last resort for truly unavoidable cases like third-party timestamp widgets, not a general fix."

---
