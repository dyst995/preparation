# `React.StrictMode` — What It Actually Does — Answers

## Core recall

1. **No** — those extra double-invokes are development-only.
2. Double-invoke render/initializers; React 18 effect mount/cleanup/remount; warn on unsafe lifecycles / legacy refs / legacy context.
3. **Setup → cleanup → setup** (after mount), on initial mount.
4. **Missing or incorrect effect cleanup** (and non-resilient setup).
5. **Impure render** / non-idempotent render-phase side effects.
6. **No** — it’s a wrapper for checks, not visible UI.
7. Examples: `componentWillMount`, string refs, legacy context API.
8. The **effect cleanup / setup idempotency** — not StrictMode itself.

## Explain why

1. Real apps remount components; cleanup must undo setup so remount doesn’t leak or duplicate.
2. Production builds don’t perform the StrictMode double-render/double-effect stress passes.
3. First setup starts an interval; simulated cleanup should clear it; without cleanup, remount starts a **second** interval.
4. Duplicate fetch usually means no abort/ignore-stale on cleanup — hiding StrictMode leaves the bug for real remounts.
5. Initializers should be pure; side effects there run twice and reveal the mistake.
6. Concurrent/Suspense can discard and rebuild UI — same teardown resilience StrictMode practices early.

## Compare and contrast

1. **Render double:** probes render purity. **Effect cycle:** probes cleanup on remount.
2. **React StrictMode:** runtime/dev behavior checks. **TS strict:** compile-time type checks.
3. **Dev:** intentional extra remount cycle. **Prod:** single mount/effect setup (for that mount).
4. **In render:** caught by double render (and is always wrong). **In effect:** allowed, but must clean up under remount probe.
5. **Incomplete cleanup:** real bug. **“StrictMode bug”:** misattribution.
6. **Warnings:** legacy APIs. **Double-invoke:** behavioral probes for purity/cleanup.

## Predict the behavior

1. Roughly: `setup` → `cleanup` → `setup` (exact timing relative to paint still “after commit,” but remount cycle is the point).
2. **One** setup (no StrictMode remount stress).
3. Two in-flight requests; late response may setState on wrong generation — need abort or ignore flag in cleanup.
4. **Two** (dev StrictMode double render) — move fetch to effect.

## Debugging

1. **StrictMode** (or other remount) in local/dev only — expected.
2. Missing cleanup / duplicate subscribe — fix cleanup; don’t only disable StrictMode.
3. Dedupe intentionally (session id, ref “already sent”), or accept setup/cleanup that doesn’t double-send (e.g. send on unmount carefully) — still write correct cleanup for listeners.
4. Likely **remount from unstable key**, not only StrictMode — fix keys.
5. **StrictMode warning** about unsafe lifecycle — migrate off it.

## Application

1.
```jsx
useEffect(() => {
  const onResize = () => { /* … */ };
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}, []);
```

2.
```jsx
useEffect(() => {
  const ac = new AbortController();
  fetch(url, { signal: ac.signal })
    .then(/* … */)
    .catch(/* ignore abort */);
  return () => ac.abort();
}, [url]);
```

3.
```jsx
createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

4. Dev only? StrictMode on? Cleanup present? Unstable key remounting? Fetch in render vs effect?

## Interview questions

1. **Spoken:** React 18 StrictMode remounts once in dev to verify effect cleanup; not in production. Breakage ⇒ fix cleanup, don’t suppress the tool.  
   **Follow-ups:** Also double-renders; warns on legacy APIs; fix abort/unsubscribe.

2. **Spoken:** Dev-only helper to surface impure render, bad cleanups, and legacy patterns early.

3. **Spoken:** Double-invokes render so side effects in render show up as duplicates/wrongness.

4. **Spoken:** Matches real teardown/rebuild; forces cleanup to be correct and setup to be repeatable.

5. **Spoken:** Design for remount (dedupe, or cleanup-safe patterns); don’t rely on “effects run once forever.”

## Connections

1. Double render is a purity probe — same rules as the pure-components unit.
2. Effects run after commit; StrictMode still exercises their setup/cleanup lifecycle.
3. Concurrent remounts need the same cleanup discipline Fiber/Suspense imply.
4. Type/key changes also remount — can look like double effects; check identity too.
5. React 17 StrictMode emphasized double render more; **effect remount cycle is the React 18 interview headline**.
