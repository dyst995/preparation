# 11. Hands-on drills (do these)

> Source: `interview-prep/react/04-performance-patterns.md`

- [ ] Build a parent with a counter and a child rendering a large list of rows; wrap the child in `React.memo`; pass an inline object/array prop and observe it still re-renders on counter increments; fix with `useMemo` in the parent.
- [ ] Record a React DevTools Profiler session of a page with an obviously unnecessary re-render cascade; identify the culprit; fix it; re-record to confirm.
- [ ] Render a 10,000-row list with plain `.map()`, observe scroll jank in the Chrome Performance tab; swap in `react-window`'s `FixedSizeList`; confirm the improvement.
- [ ] Convert a single-bundle app's routes to `React.lazy` + `Suspense`; inspect the Network tab to confirm separate chunks load per route.
- [ ] Build a page with 3 independent React Query calls nested so they accidentally waterfall (each inside the previous one's loading gate); flatten them to fire in parallel; confirm via Network tab timing.
- [ ] Build a search input that filters a large in-memory list on every keystroke; observe typing lag; fix with `useTransition`, confirming typing stays responsive while results lag slightly behind.

---
