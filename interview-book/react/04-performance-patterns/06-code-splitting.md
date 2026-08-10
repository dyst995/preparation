# 06. Code splitting

> Source: `interview-prep/react/04-performance-patterns.md`

### Why bundle size matters

Every KB of JS shipped to the browser must be downloaded, parsed, compiled, and executed before the app is interactive. A large single bundle delays **Time to Interactive (TTI)**, especially on slower networks/devices.

### `React.lazy` + `Suspense`

```jsx
const SettingsPage = React.lazy(() => import('./SettingsPage'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <SettingsPage />
    </Suspense>
  );
}
```

`React.lazy` defers loading a component's code (and its own dependencies) until it's actually rendered, splitting it into a separate chunk that bundlers (Webpack/Vite/etc.) emit and fetch on demand. `Suspense` provides the fallback UI to show while that chunk loads.

### Route-based splitting (the highest-leverage default)

The single most common and highest-value application of code splitting: lazy-load each route/page, so users only download the code for the page they're actually visiting, not the entire app upfront.

```jsx
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Settings = React.lazy(() => import('./pages/Settings'));

<Routes>
  <Route path="/dashboard" element={<Suspense fallback={<Spinner />}><Dashboard /></Suspense>} />
  <Route path="/settings" element={<Suspense fallback={<Spinner />}><Settings /></Suspense>} />
</Routes>
```

### Component-level splitting for heavy, conditionally-shown UI

Good candidates: rich text editors, charting libraries, modal-only flows (e.g., a heavy "export to PDF" dialog), anything behind a feature flag or a rarely-used admin panel.

### Tradeoffs to mention

- Every lazy boundary needs a `Suspense` fallback - too many small boundaries can create a "waterfall of spinners" that feels worse than a single upfront load; group sensibly (usually per-route is the sweet spot before going finer-grained).
- Splitting too aggressively increases the *number* of network requests, which has its own overhead - balance against measured wins, not intuition.
- Preloading is often worth pairing with lazy loading (e.g., preload the next likely route on hover/intent) to hide the network latency the split introduces.

### Interview question

**Q: How would you reduce a React app's initial bundle size?**

> "Start by measuring - a bundle analyzer shows what's actually large. The highest-leverage default is route-based code splitting with `React.lazy` and `Suspense`, so users only download the JS for the page they're on. Beyond that, I look for heavy, conditionally-used components - rich editors, charting libraries, rarely-used admin UI - and split those individually. I also check for accidental full-library imports (e.g., importing an entire icon set or utility library instead of the specific exports) that defeat tree-shaking. I'd pair aggressive splitting with preloading likely-next routes on hover/intent so the extra network request doesn't show up as added latency to the user."

---
