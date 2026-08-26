# Code Splitting — Answers

## Core recall

1. Splitting JS into chunks loaded on demand instead of one upfront bundle.  
2. Download/parse/compile/execute all block interactivity — more KB ⇒ worse TTI, especially on slow devices/networks.  
3. Creates a component that loads its module via dynamic `import()` on first render.  
4. Shows `fallback` UI while the lazy chunk is loading (component suspended).  
5. Route-/page-based lazy loading.  
6. Editors, charts, heavy modals/admin/feature-flagged UI (examples along those lines).  
7. A module **default export** that is a React component.  
8. Starting the chunk fetch early (e.g. link hover/intent) before navigation renders the lazy component.

## Explain why

1. Matches how users navigate; biggest unused-code win with few boundaries and coherent UX.  
2. Sequential or stacked spinners feel broken; UX cost can exceed load savings.  
3. Guessing wastes effort — analyzer shows real weight and accidental imports.  
4. Lazy introduces a network hop; preload overlaps fetch with user intent so navigation feels instant.  
5. Splitting affects **download**; virtualization affects **DOM/runtime** for large lists already on the page.  
6. They pull large unused code into the bundle when tree-shaking can’t eliminate it.

## Compare and contrast

1. **Tree-shaking:** drop unused exports at build. **Splitting:** defer loading of code you *do* use later.  
2. **Route:** default, coarse. **Component:** heavy conditional islands inside a route.  
3. **Static:** in initial graph. **lazy/dynamic:** separate chunk on demand.  
4. **Per route:** one loading state. **Per widget:** spinner spam / request chatter risk.  
5. **Split:** less JS on first load. **memo:** fewer re-renders after load.

## Predict / choose

1. **No** (not required for that visit) — chunk loads when that route/component renders.  
2. **Fallback spinner** (or whatever fallback) until chunk resolves, then modal.  
3. Spinner waterfall / many requests / poor perceived performance.  
4. Lazy the analytics route (or the chart component only used there) — keep it off home’s critical path.

## Debugging

1. Wrap with `<Suspense fallback={...}>` above the lazy tree.  
2. Add `export default X` or `lazy(() => import('./X').then(m => ({ default: m.X })))`.  
3. Error boundary + reload/resync strategy; cache-busting awareness for old HTML referencing old chunk hashes.  
4. Static import of charts from a shared module pulled into the main entry — move import behind lazy route/component boundary.

## Application

1.
```jsx
const AdminPanel = React.lazy(() => import('./AdminPanel'));
<Route
  path="/admin"
  element={
    <Suspense fallback={<Spinner />}>
      <AdminPanel />
    </Suspense>
  }
/>
```

2. `onMouseEnter={() => import('./AdminPanel')}` on the Admin link (or router preload API).  
3. Paraphrase preserved answer: measure → route lazy → heavy conditional splits → tree-shake imports → preload.  
4. Lazy Dashboard & Settings routes; keep Home eager if landing; lazy Monaco (or whole Settings) so editor isn’t on Home/Dashboard chunks.

## Interview questions

1. **Spoken:** Analyzer first; route-based `React.lazy`+`Suspense`; then heavy conditional UI; fix fat imports for tree-shaking; preload next routes. Downside: more requests + spinner UX if over-split. Hide latency with intent preload.  
2. **Spoken:** `lazy` wraps dynamic import into a component that suspends until loaded; `Suspense` shows fallback during that wait.  
3. **Spoken:** Routes first always; component-level when a large dep is rare inside a page.  
4. **Spoken:** What’s on the critical path vs large+conditional; confirm with analyzer and real navigation metrics.

## Connections

1. Same discipline as Profiler — measure (analyzer/Lighthouse) before spraying `lazy` everywhere.  
2. Fallback improves **perceived** wait; still want small critical JS for real TTI.  
3. Nested lazy without preload can chain fetches like request waterfalls — group boundaries and prefetch.  
4. Analyzer finds fat modules; correct import paths let tree-shaking delete unused code from the critical chunk.
