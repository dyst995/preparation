# Code Splitting

## What you need to know

**Code splitting** breaks the app’s JavaScript into **multiple chunks** so the browser downloads **only what’s needed** for the current screen (or interaction), instead of one giant bundle up front.

In React, the common API is **`React.lazy` + dynamic `import()` + `Suspense`**. The highest-leverage default is **route-based** splitting; then split heavy, rarely shown components.

Goal metric: improve **Time to Interactive (TTI)** / initial load — every KB must be downloaded, parsed, compiled, and executed.

Related: measure with a **bundle analyzer**; avoid imports that defeat **tree-shaking**. Preload likely-next chunks to hide latency.

---

## Why bundle size matters (preserved)

```text
Download JS → parse → compile → execute → interactive
```

A large **single** bundle forces all of that work before the user can use the app — worse on slow networks and low-end devices. Splitting moves non-critical code off the **critical path**.

Code splitting is about **when** code loads, not about making algorithms faster. It’s complementary to memo/virtualization (runtime), not a substitute.

---

## Dynamic `import()` and chunks

```js
import('./SettingsPage'); // returns Promise<{ default: Component }>
```

Bundlers (Webpack, Vite, etc.) treat this as a **split point**: emit a separate file (chunk) fetched when the import runs.

`React.lazy` wraps that pattern for components:

```jsx
const SettingsPage = React.lazy(() => import('./SettingsPage'));
```

**Requirement:** the module’s **default export** must be a component (named-only exports need a small re-export wrapper).

First render of `<SettingsPage />` triggers the fetch; until resolved, the nearest **`Suspense`** shows `fallback`.

---

## `React.lazy` + `Suspense` (preserved)

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

| Piece | Role |
| --- | --- |
| `React.lazy` | Component that suspends until its chunk loads |
| `import()` | Split point / network fetch |
| `Suspense` | Declarative loading UI for that wait |

Without a Suspense boundary above a lazy component, React errors when it suspends.

After the chunk loads once, subsequent navigations typically use the **cached** module (still may pay parse/exec once per session as needed).

---

## Route-based splitting (highest leverage, preserved)

Users visit one page at a time — don’t ship Dashboard + Settings + Admin + Charts on first paint.

```jsx
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Settings = React.lazy(() => import('./pages/Settings'));

<Routes>
  <Route
    path="/dashboard"
    element={
      <Suspense fallback={<Spinner />}>
        <Dashboard />
      </Suspense>
    }
  />
  <Route
    path="/settings"
    element={
      <Suspense fallback={<Spinner />}>
        <Settings />
      </Suspense>
    }
  />
</Routes>
```

Many routers integrate lazy routes / shared layout Suspense — same idea: **one Suspense per navigation** often feels better than spinners inside every widget.

Framework note: Next.js / Remix have their own splitting and routing models; the **principle** (don’t ship unused routes) still holds even if the API isn’t hand-rolled `React.lazy`.

---

## Component-level splitting (preserved)

Good candidates:

- Rich text editors  
- Charting libraries  
- Heavy modal-only flows (e.g. “export PDF”)  
- Feature-flagged or rare admin panels  

```jsx
const PdfExportModal = React.lazy(() => import('./PdfExportModal'));

function Toolbar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Export</button>
      {open && (
        <Suspense fallback={<Spinner />}>
          <PdfExportModal onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
```

Split when the dependency is **large** and **not needed on first paint**. Splitting a 2 KB button component is noise.

---

## Tradeoffs (preserved)

1. **Suspense waterfall of spinners** — too many tiny boundaries feel worse than one upfront load; prefer **per-route** (or per major feature) before micro-splitting.  
2. **More network requests** — each chunk has HTTP overhead; balance against measured bundle wins.  
3. **Latency of the split** — hide with **preloading** on hover/intent (or prefetch on visible links).

```jsx
// Intent-based preload sketch
function SettingsLink() {
  const preload = () => {
    import('./pages/Settings'); // start fetch early
  };
  return (
    <Link to="/settings" onMouseEnter={preload} onFocus={preload}>
      Settings
    </Link>
  );
}
```

(Some routers/`preload` helpers do this more cleanly.)

---

## Bundle analysis and tree-shaking (from interview answer)

Reducing initial JS isn’t only `lazy`:

1. **Measure** — webpack-bundle-analyzer, Vite rollup visualizer, etc. See what’s actually large.  
2. **Route / heavy component splits** as above.  
3. **Import hygiene** — `import _ from 'lodash'` or entire icon packs can defeat **tree-shaking**; prefer `import debounce from 'lodash/debounce'` or tree-shake-friendly libraries / per-icon imports.  
4. **Duplicate dependencies** — analyzer often reveals accidental doubles.

Tree-shaking = dead-code elimination at build time for **unused exports**. Code splitting = **deferred loading** of used-but-not-yet-needed modules. Both shrink what runs on first paint; they solve different shapes of “too much JS.”

---

## Errors and SSR (interview-level awareness)

- Wrap lazy trees with an **error boundary** for failed chunk loads (network blip, stale deploy hash).  
- Classic `React.lazy` is aimed at **client** rendering; SSR frameworks use their own data/code-splitting story (e.g. Next.js). Don’t claim bare `lazy` “just works” for all SSR without qualifications.

---

## Interview answer (preserved)

**Q: How would you reduce a React app's initial bundle size?**

> “Start by measuring — a bundle analyzer shows what’s actually large. The highest-leverage default is route-based code splitting with `React.lazy` and `Suspense`, so users only download the JS for the page they’re on. Beyond that, I look for heavy, conditionally-used components — rich editors, charting libraries, rarely-used admin UI — and split those individually. I also check for accidental full-library imports (e.g., importing an entire icon set or utility library instead of the specific exports) that defeat tree-shaking. I’d pair aggressive splitting with preloading likely-next routes on hover/intent so the extra network request doesn’t show up as added latency to the user.”

---

## Common mistakes and misconceptions

1. Lazy without Suspense.  
2. Micro-splitting everything → spinner waterfall + request spam.  
3. Skipping measurement / analyzer.  
4. Expecting `lazy` to fix slow **runtime** renders (lists, compute).  
5. Named export only → lazy import fails; need default.  
6. Forgetting preload → every navigation feels laggy.  
7. Confusing tree-shaking with code splitting.  
8. Splitting tiny local components for “best practice.”

---

## Connections to other concepts

```
large initial bundle
  → worse TTI
  → split routes / heavy UI
  → Suspense fallback while chunk loads

bundle analyzer
  → find what to split or tree-shake

preload on intent
  → hide split latency

runtime perf (memo, virtualize)
  → different axis: after JS already downloaded
```

---

## Interview perspective

Be ready to:

1. Explain lazy + Suspense + dynamic import.  
2. Argue **route-first** splitting.  
3. Name tradeoffs (spinners, request count) + preload.  
4. Mention analyzer + tree-shaking imports.  
5. Distinguish code splitting from runtime memoization.

---

# Self-test

## Core recall

1. What is code splitting?
2. Why does large JS hurt TTI?
3. What does `React.lazy(() => import(...))` do?
4. What is `Suspense`’s role with lazy components?
5. What is the highest-leverage default split strategy?
6. Name three good component-level split candidates.
7. What export shape does `React.lazy` expect?
8. What is preloading in this context?

## Explain why

1. Why prefer route-based splits before splitting every widget?
2. Why can too many Suspense boundaries feel worse than a bigger initial bundle?
3. Why measure with a bundle analyzer first?
4. Why pair lazy loading with preload on hover?
5. Why doesn’t code splitting replace list virtualization?
6. Why do barrel/`lodash` full imports matter when talking about bundle size?

## Compare and contrast

1. Code splitting vs tree-shaking  
2. Route-based vs component-level splitting  
3. `React.lazy` vs static `import`  
4. One Suspense per route vs Suspense per tiny component  
5. Code splitting vs `React.memo` / runtime memoization  

## Predict / choose

1. First visit `/` — is Settings chunk downloaded if Settings is lazy and unused?  
2. Open PDF modal first time — what does user see if Suspense wraps the lazy modal?  
3. 40 lazy boundaries each with their own spinner on one page load — risk?  
4. Chart library only used on `/analytics` — where should the split live?

## Debugging

1. Error: lazy component / suspended without Suspense. Fix?  
2. `React.lazy(() => import('./X'))` fails; `X` only has `export function X`. Fix?  
3. After deploy, users get chunk load errors on old tabs. Mitigation?  
4. Initial bundle still huge; analyzer shows `recharts` on the main chunk though charts are one route. Cause?

## Application

1. Write lazy + Suspense for a `AdminPanel` route element.  
2. Sketch preload-on-hover for that route’s import.  
3. Spoken answer: reduce initial bundle size.  
4. List a split plan for an app with Home, Dashboard, Settings, and a Monaco editor in Settings only.

## Interview questions

1. How would you reduce a React app's initial bundle size?  
   - Follow-up: What’s the downside of aggressive splitting?  
   - Follow-up: How do you hide lazy-route latency?
2. Explain `React.lazy` and `Suspense`.  
3. Route-based vs component splitting — when each?  
4. How do you decide what to split?

## Connections

1. How does this relate to the chapter’s “measure first” theme?
2. How do Suspense fallbacks relate to perceived performance vs raw TTI?
3. How might waterfalls of lazy chunks resemble request waterfalls (later in the chapter)?
4. How does import hygiene connect to tree-shaking and analyzers?
