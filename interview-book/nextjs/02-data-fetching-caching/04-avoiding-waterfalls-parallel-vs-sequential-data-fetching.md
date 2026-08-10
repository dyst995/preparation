# 04. Avoiding waterfalls - parallel vs sequential data fetching

> Source: `interview-prep/nextjs/02-data-fetching-caching.md`

### Topics to learn

- [ ] A waterfall happens when one `await` blocks the start of the next, unrelated fetch
- [ ] Fix: start independent fetches without awaiting immediately, then `await Promise.all([...])`
- [ ] Fix (component-level): let sibling Server Components each do their own `await fetch` - React can start them in parallel since they're independent branches of the tree (with Request Memoization dedupe if they hit the same URL)
- [ ] Sequential fetching is sometimes *necessary* (fetch a user, then fetch that user's orders using the user's id) - not every waterfall is a bug, but unnecessary ones are
- [ ] `Promise.all` failure behavior: one rejection rejects the whole batch - decide if you want `Promise.allSettled` for partial-failure tolerance

### Example: waterfall (bad) vs parallel (good)

```tsx
// BAD - sequential waterfall, these two calls don't depend on each other
async function Page() {
  const user = await getUser();      // waits ~200ms
  const settings = await getSettings(); // then waits another ~150ms
  // total: ~350ms, even though these could overlap
}
```

```tsx
// GOOD - parallel
async function Page() {
  const userPromise = getUser();
  const settingsPromise = getSettings();
  const [user, settings] = await Promise.all([userPromise, settingsPromise]);
  // total: ~200ms (the slower of the two)
}
```

```tsx
// ALSO GOOD - component-level parallelism
async function Page() {
  return (
    <>
      <UserPanel />      {/* awaits getUser() internally */}
      <SettingsPanel />  {/* awaits getSettings() internally, runs concurrently */}
    </>
  );
}
```

### Interview question

**Q: How do you detect a data-fetching waterfall in an existing Next.js app?**

> "I look at the Next.js dev overlay / server timing, or add temporary console timestamps around fetches, to see if calls that don't depend on each other are still happening back-to-back instead of overlapping. In production, I'd look at server response time traces (APM, or even just logging fetch start/end) for a page and check if the total time is roughly the sum of all fetches (waterfall) versus the max of the slowest one (parallel). The fix is almost always either `Promise.all` at one level, or restructuring so independent data lives in separate Server Components that each fetch on their own."

---
