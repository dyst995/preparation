# 16. Senior-Level Best Practices

> Source: `interview-prep/react-native/03-state-management.md`

### Decision framework: picking a state tool without dogma

| Question | Answer points to |
|---|---|
| Does this data come from the server and need caching/invalidation? | React Query / RTK Query - never a plain global store |
| Does it change on every keystroke or frame (search input, scroll position, drag offset)? | Local `useState` or a ref, kept out of any global store entirely |
| Is it shared across 3+ unrelated screens but purely client-side (theme, selected account, filters)? | Zustand slice, selector-scoped |
| Is the team already standardized on Redux, or are there complex multi-step client workflows with heavy cross-feature coordination? | Redux Toolkit is justified - don't fight an established, working pattern for fashion's sake |
| Is it a secret (token, PAN, biometric flag)? | Secure storage (Keychain/Keystore-backed), never AsyncStorage, never a persisted plain store |
| Does it need to survive app restarts but is not sensitive (theme, locale)? | Persisted Zustand slice with an explicit schema version |

### Production checklist (state-management, ship-ready)

- [ ] Logout clears all of: secure storage tokens, React Query cache (`queryClient.clear()`), client store auth/session slices, navigation state, and any open socket/notification listeners
- [ ] Every persisted store has a schema version and a migration path for old shapes, not a silent crash on stale persisted data after an app update
- [ ] `staleTime`/`gcTime` values are deliberately chosen per query type (balances vs static config) and documented, not left at library defaults everywhere
- [ ] Mutations that touch money have explicit idempotency keys and are not blindly retried by the client
- [ ] No screen reads the same business value from two different stores (e.g. a duplicated "balance" living in both React Query cache and Zustand)
- [ ] Optimistic updates have a tested rollback path (deliberately fail a mutation in dev and confirm the UI recovers correctly)
- [ ] Query key factories exist for every feature's server state - no raw string arrays scattered through `useQuery` calls

### Anti-patterns seniors reject in code review

- **Copying React Query data into Zustand "just to have it globally accessible."** This creates two sources of truth that will drift; instead, expose a selector/hook over the query cache, or lift the query higher in the tree.
- **Putting everything in Redux "because that's our state management."** Server data with caching/retry/invalidation needs doesn't belong in a hand-rolled reducer duplicating what React Query already solves correctly.
- **Selecting the entire Zustand store in a component** (`const store = useStore()`) instead of narrow selectors - silently reintroduces the exact re-render fan-out problem Zustand exists to avoid.
- **Optimistic updates on irreversible financial actions with no rollback tested** - "the happy path worked in the demo" is not sufficient verification for a money-movement mutation.
- **Flipping a single `isLoggedIn` boolean on logout** without clearing caches/stores - leaks the previous user's cached personal/financial data into the next session, a real fintech-grade security bug, not just a UX glitch.
- **Persisting tokens via `AsyncStorage` "temporarily"** - temporary hacks like this are exactly what security reviews (and real attackers) find first.

### Failure modes & how seniors debug them

| Symptom | Likely root cause | Diagnose with | Fix |
|---|---|---|---|
| Balance shown on one screen doesn't match another screen after a transfer | Two sources of truth (cached duplicate in Zustand/Redux vs React Query) | Search codebase for the value being read from more than one store | Make React Query the single source; other stores hold only IDs/selection, not copies of server data |
| Previous user's data flashes briefly after a new user logs in on the same device | Incomplete logout - `queryClient.clear()` missing or store slices not reset | Manually log out/in as two different test accounts and watch network + React DevTools | Centralize logout into one function that clears every store/cache/listener, call it from a single place |
| App crashes on first launch after an app update, but works after a fresh install | Persisted store schema changed, old shape gets deserialized into new code expecting different fields | Reproduce by installing the old version, populating state, then updating in place | Add a persisted-state migration function keyed by a version number |
| Optimistic UI shows success, but the server actually rejected the request | Optimistic update not rolled back on mutation error, or rollback logic untested | Force a mutation to fail in a dev/staging environment | Implement and test the `onError` rollback path explicitly, don't assume `onSuccess` is the only path that runs |
| Global store re-renders the whole app on every keystroke in one screen | High-frequency state (search text, animation value) stored in a global selector-less store or wide Context | React DevTools Profiler "why did this render" | Move high-frequency state to local `useState`/ref, or a narrowly-scoped store slice |

### Observability / metrics to watch

- **React Query cache size / query count in production** (if instrumented) - unbounded growth suggests missing `gcTime` tuning or queries that never get cleaned up.
- **Mutation failure rate for money-movement endpoints**, segmented by whether the client retried - helps catch a client-side retry bug masquerading as a backend issue.
- **Time between "logout tapped" and "all stores/caches actually cleared"** - should be near-instant; regressions here are a real security signal, not just perf.
- **Re-render counts on high-traffic screens** (dashboard, transaction list) via React DevTools Profiler sampling during QA - catches Context/selector regressions before users do.
- **Crash/ANR correlation with app-update events** - spikes right after a release often point to a persisted-state migration bug.

### Scalability & team practices

- **One documented "state taxonomy" table lives in the repo** (server / global client / local / session / form / navigation) so new engineers classify state consistently instead of guessing per PR.
- **A single, reviewed `logout()`/`resetAppState()` function is the only place session teardown happens** - never duplicated inline in multiple screens.
- **Query key factories are a required pattern**, enforced in code review, so invalidation after mutations is consistent across features and doesn't rely on remembering exact string arrays.
- **State-tool choice is documented per feature in an ADR** when it deviates from the default (e.g. "Wizer uses RTK Query because the codebase was already Redux-standardized") so it doesn't look like inconsistency to a new hire.
- **Persisted schema versioning is a checklist item in PR review** whenever a persisted store's shape changes - this is cheap to check and expensive to debug after the fact.

### Tradeoffs table

| Choice | Pro | Con |
|---|---|---|
| React Query + Zustand | Low boilerplate, clear server/client split, fast to onboard | Less mature time-travel debugging than Redux DevTools for complex client workflows |
| Redux Toolkit + RTK Query | Mature middleware ecosystem, time-travel debugging, good for complex cross-feature workflows | More boilerplate/ceremony for simple CRUD-heavy screens |
| Optimistic updates | Feels instant, better perceived performance | Requires a genuinely tested rollback path; risky if treated as "fire and forget" on financial actions |
| Persisting client state | Better UX across restarts (no refetch/reset flash) | Requires schema versioning discipline; wrong choice for anything sensitive |
| Context for cross-cutting concerns | Simple, no dependency, great for low-frequency values | Poor for high-frequency data; re-render fan-out without careful splitting/memoization |

### Harder follow-up interview questions (with model answers)

**Q: Two engineers on your team disagree - one wants to put a newly-fetched list into Redux "to keep it consistent with the rest of the app," the other wants React Query. How do you resolve it?**

> "I'd separate the question of 'server data caching' from 'is our client state tool consistent.' The list is server state with real caching/invalidation/retry needs that React Query already solves correctly; duplicating that in Redux means we now own cache invalidation logic ourselves and risk drift. I'd let Redux stay the tool for genuinely client-side, multi-step workflows, and use React Query for anything backed by an API endpoint - documented as a rule so it's not re-litigated per feature."

**Q: How would you design state for an in-progress multi-step KYC/onboarding flow that must survive the app being backgrounded or killed mid-flow?**

> "Non-sensitive step progress and form field values I'd persist in a small versioned Zustand slice keyed by a flow id, so the user can resume where they left off. Anything sensitive - document images, ID numbers - I would not persist to disk in plain form; I'd either keep those in memory only and re-request if the app was killed, or store them behind secure storage with a short TTL. I'd also make the resume logic idempotent server-side, since users killing and reopening mid-upload is a normal mobile pattern, not an edge case."

**Q: Your React Query `staleTime` for account balances is set to 5 minutes globally, and a user complains their balance was stale right after a transfer. What happened, and how do you fix it?**

> "`staleTime` controls background refetch eligibility, but after a mutation you should be explicitly invalidating the affected queries rather than waiting for staleness to expire naturally. The bug is almost certainly a missing `invalidateQueries` call for the balances key in the transfer mutation's `onSettled`. I'd fix the mutation, and add a lightweight test or checklist item ensuring every money-moving mutation invalidates balances and transactions."

**Q: When is it acceptable to skip the rollback path for an optimistic update?**

> "Only for low-stakes, easily-visible-as-wrong, non-financial UI state - like an optimistic 'liked' toggle where a brief flicker back on failure is harmless. For anything involving money, irreversible actions, or state that would mislead the user about their actual account status, I always implement and test the rollback - the cost of getting it wrong is a support ticket or worse, a trust problem in a fintech product."

**Q: How do you test that your logout function actually clears everything, given how easy it is to add a new store later and forget to wire it in?**

> "I centralize teardown into one function and, where possible, write an integration test that logs in as user A, populates some cached data, logs out, logs in as user B, and asserts none of user A's cached data is visible. That test fails loudly the moment someone adds a new store or cache without wiring it into the shared logout path, instead of relying on someone remembering to update a manual checklist."

### What I'd say in a staff/senior interview

> "My default answer to 'Redux vs Zustand vs React Query' is that it's the wrong question if asked in isolation - the real skill is classifying what kind of state you're looking at before picking a tool. Server state, client state, session state, and form state have genuinely different lifecycle and correctness requirements, and most of the production bugs I've fixed - and most of the crash-rate work I did on MyCreditInfo and Wizer - trace back to two places holding the same logical piece of data and drifting apart, especially around logout and stale caches. I treat 'clear everything correctly on logout' as a security-adjacent requirement in fintech, not just a UX nicety, and I test it like one."

---
