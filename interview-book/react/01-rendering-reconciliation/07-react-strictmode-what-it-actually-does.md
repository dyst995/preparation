# 07. React.StrictMode - what it actually does

> Source: `interview-prep/react/01-rendering-reconciliation.md`

`StrictMode` is a development-only wrapper that helps surface bugs related to impure rendering and unsafe lifecycles. It does **not** run in production and has **zero runtime cost** there.

What it does in development:

1. **Double-invokes** component function bodies (render), `useState`/`useMemo`/`useReducer` initializer functions, and (in React 18+) mount/cleanup/mount of `useEffect` on initial mount - to help surface side effects that shouldn't be in render, or effects with missing/incorrect cleanup.
2. Warns about legacy/unsafe lifecycle methods (`componentWillMount`, etc.) in class components.
3. Warns about legacy string refs and legacy context API usage.
4. Helps detect unexpected side effects from render-phase code by making them run twice, so non-idempotent behavior becomes visible (e.g., an API call fired directly in render, or a subscription added without cleanup).

### Why effects "fire twice" in dev with React 18 StrictMode

React 18's `StrictMode` deliberately does: mount -> run effects -> **simulate unmount (run cleanup)** -> **remount (run effects again)** on the *initial* mount of a component tree. This is intentional: it simulates what happens when a component is unmounted and remounted (e.g., due to Suspense/Fast Refresh/tab restoration in some environments), forcing you to write effects whose cleanup correctly undoes their setup - which is exactly what makes effects resilient to being torn down and rebuilt at arbitrary times.

**If your effect breaks under this double-fire, your cleanup function is incomplete** - that's the bug StrictMode is designed to catch, not a StrictMode bug itself.

### Interview question

**Q: Why does my `useEffect` run twice in development, and should I worry about it in production?**

> "In React 18, `StrictMode` intentionally mounts, unmounts, and remounts components once in development to verify effects clean up correctly - this simulates future concurrent-rendering scenarios where components can be torn down and rebuilt. It does not happen in production and has no production cost. If the double-fire causes a visible bug - like a duplicate network call with a side effect, or a subscription leak - that means the effect's cleanup function isn't correctly undoing everything the effect set up, which is a real bug StrictMode surfaced early, not something to suppress."

---
