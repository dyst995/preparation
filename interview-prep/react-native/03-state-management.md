# 03 — State Management

> Goal: Choose and justify the right state tool for each kind of data — especially the combo you actually use: **React Query + Zustand** (and Redux/RTK when appropriate).

---

## Learning objectives

1. Classify state: local, server, global client, form, navigation, session.
2. Explain why server state rarely belongs in Redux.
3. Deeply understand React Query cache semantics.
4. Use Zustand effectively with selectors and minimal re-renders.
5. Compare Redux Toolkit and RTK Query vs React Query.
6. Implement safe persistence for mobile (especially fintech).
7. Design optimistic updates with rollback.
8. Answer “Redux vs Zustand vs Context” without dogma.

---

## 1. The state taxonomy (memorize this)

| Kind of state | Examples | Preferred home |
|---|---|---|
| **Local UI** | modal open, tab index, input focus | `useState` / `useReducer` |
| **Server state** | balances, transactions, profile from API | React Query / RTK Query |
| **Global client state** | selected account, UI theme, onboarding flags | Zustand (or Redux if complex) |
| **Session/auth** | access token presence, user id | dedicated auth store + secure storage |
| **Form state** | large multi-step forms | form library or local reducer |
| **Navigation state** | current route, params | React Navigation |
| **Derived state** | filtered list from cached data | compute/select, don’t duplicate |

### Interview golden rule

> “The biggest state bug is putting the same data in two places and letting them drift.”

---

## 2. Context API — where it fits and where it fails

### Topics to learn
- [ ] Context for dependency injection (theme, i18n, services)
- [ ] Why Context is a poor high-frequency store
- [ ] Split contexts to avoid rerender fan-out
- [ ] Context + memoization realities

### Use Context for
- Theme
- I18n
- Auth “presence” at a coarse grain (sometimes)
- Injecting a query client or services

### Avoid Context for
- Rapidly changing values (e.g. scroll position, per-keystroke state)
- Large global business stores without selectors

### Answer sketch

> “Context is great for low-frequency app-wide dependencies. It’s not my default global data store because any value change re-renders consumers unless carefully split and memoized. For complex client state I prefer Zustand; for server state, React Query.”

---

## 3. Zustand — deep dive

### Topics to learn
- [ ] Creating stores
- [ ] Selectors and shallow comparison
- [ ] Actions colocated with state
- [ ] Slices pattern for larger stores
- [ ] Middleware: `persist`, `devtools`, `subscribeWithSelector`
- [ ] When to split multiple stores vs one store
- [ ] Avoiding storing server lists in Zustand

### Why Zustand works well in RN

- Minimal boilerplate
- Excellent selector-based subscriptions
- Easy to use outside React (rare, but useful)
- Fits feature-based architecture (feature stores or small app stores)

### Patterns

**Good:** UI/client store

```text
walletUiStore: { selectedAccountId, isFilterOpen, setSelectedAccountId }
```

**Bad:** duplicating transactions list already fetched by React Query

### Selector discipline

- Subscribe only to the slice you need
- Prefer multiple small selectors over selecting the whole store
- Keep actions stable

### Interview questions

**Q: How does Zustand prevent unnecessary re-renders?**

> “Components select slices of state. They re-render only when the selected value changes. If you select the entire store, you lose that benefit.”

**Q: One store or many?**

> “I start with small domain stores (auth, wallet UI). I merge only when coordination costs dominate. I don’t create a dozen toy stores for no reason.”

---

## 4. Redux & Redux Toolkit — deep dive

### Topics to learn
- [ ] Single store + slices (RTK)
- [ ] Immutability via Immer in RTK
- [ ] Middleware (logging, listeners)
- [ ] When Redux complexity is justified
- [ ] DevTools time-travel value in complex flows
- [ ] Common overuse: stuffing everything into Redux

### When Redux still makes sense

- Complex multi-step client workflows with lots of cross-feature coordination
- Team already standardized on Redux
- Need mature middleware patterns / entity adapters for large client caches
- Existing codebase is Redux-heavy (Wizer-style ownership may include RTK Query)

### When Redux is unnecessary

- Mostly CRUD server data
- Simple UI state
- Small/medium apps where Zustand + React Query is enough

### Interview answer

> “Redux Toolkit is excellent when client-side state transitions are complex and shared widely. For many RN apps, React Query handles server state and Zustand handles light global client state with less boilerplate. I choose based on complexity, not fashion.”

---

## 5. React Query (TanStack Query) — deep dive

This is critical. Interviewers increasingly expect fluency.

### Topics to learn
- [ ] Query keys and key factories
- [ ] `staleTime` vs `gcTime` (cacheTime renamed)
- [ ] Fetching, refetching, invalidation
- [ ] Mutations and `onSuccess` / `onSettled` invalidation
- [ ] Optimistic updates + rollback
- [ ] Placeholder data / initial data
- [ ] Pagination / infinite queries
- [ ] Query cancellation on unmount
- [ ] Online/offline behavior basics
- [ ] Deduping and caching as performance features

### Mental model

- A **query** is cached server state identified by a **key**
- `staleTime`: how long data is considered fresh (no refetch needed)
- `gcTime`: how long inactive data stays in memory before garbage collection
- Invalidation marks queries stale and typically triggers refetch

### Key factory pattern

```text
walletKeys = {
  all: ['wallet'],
  balances: () => [...walletKeys.all, 'balances'],
  transactions: (accountId) => [...walletKeys.all, 'tx', accountId],
}
```

Benefits: consistent invalidation, fewer string typos, easier refactors.

### Mutation pattern (interview favorite)

1. Mutate
2. Optimistic update cache
3. On error: rollback
4. On settle: invalidate authoritative queries

### Interview questions

**Q: staleTime vs gcTime?**

> “`staleTime` controls freshness — when React Query should consider data stale and eligible to refetch. `gcTime` controls memory lifetime of unused cache entries. Freshness and garbage collection are different concerns.”

**Q: Should API data live in Redux?**

> “Usually no. Server state has caching, deduping, retries, and invalidation needs that React Query already solves. Redux duplication often causes sync bugs.”

**Q: How do you update a transactions list after a transfer?**

> “Optimistic update for immediate UX, then invalidate transactions and balances on settle to reconcile with server truth.”

---

## 6. RTK Query vs React Query

| Dimension | React Query | RTK Query |
|---|---|---|
| Best with | Any store (Zustand/Context/none) | Natural with Redux |
| Boilerplate | Low–medium | Medium, codegen-ish endpoints |
| Cache tools | Excellent | Excellent inside Redux world |
| Learning curve | Query-focused | Redux + RQ concepts |
| Your CV | React Query + Zustand | RTK Query on Wizer |

### Answer sketch

> “I’ve used both. React Query pairs cleanly with Zustand. RTK Query is a strong choice when Redux is already the app backbone. Functionally both solve server-state caching; ecosystem fit matters.”

---

## 7. Auth/session state (fintech-sensitive)

### Topics to learn
- [ ] In-memory session vs persisted session
- [ ] Access token vs refresh token handling
- [ ] Rehydration on startup
- [ ] Clearing all stores/caches on logout
- [ ] Preventing UI flash of authenticated routes

### Logout checklist (memorize)

- [ ] Clear secure storage tokens
- [ ] Clear React Query cache (`queryClient.clear()`)
- [ ] Reset Zustand/Redux auth slices
- [ ] Reset navigation state
- [ ] Cancel in-flight requests / invalidate auth headers
- [ ] Stop notification listeners if needed

### Interview question

**Q: How do you prevent stale user data after logout?**

> “Logout is a multi-step reset: delete tokens, clear server caches, reset client stores, and reset navigation. If you only flip an `isLoggedIn` boolean, you’ll leak cached personal data.”

---

## 8. Persistence

### Topics to learn
- [ ] What is safe to persist
- [ ] What must use Keychain/Keystore
- [ ] Zustand persist middleware caveats
- [ ] Rehydration timing and splash/bootstrap
- [ ] Migrating persisted schemas (versioning)

### Persist vs do not persist

| Persist OK (usually) | Do not persist in plain storage |
|---|---|
| Theme preference | Access/refresh tokens |
| Language | PANs / CVV / secrets |
| Non-sensitive UI flags | Raw personal financial payloads if avoidable |

### Interview answer

> “I persist non-sensitive UI preferences casually. Tokens and secrets go to secure storage. I version persisted state and handle rehydration explicitly during bootstrap so navigation doesn’t race.”

---

## 9. Optimistic UI design

### Example: send money

1. User confirms transfer
2. Disable submit / show pending row
3. Optimistically deduct available balance in cache (carefully)
4. Send mutation
5. Success: invalidate balances + transactions
6. Failure: rollback + show actionable error

### Risks

- Over-optimistic updates on irreversible financial actions
- Double spend UI if button not locked
- Server-side idempotency still required

### Interview nuance

> “Optimistic UI is a UX tool, not a source of truth. The server remains authoritative, and payment APIs should be idempotent.”

---

## 10. Derived state and duplication traps

### Anti-patterns

- Copying React Query data into Zustand “for convenience”
- Storing filtered lists separately instead of deriving
- Multiple sources for `user`

### Better

- Select/filter from query data in render or via memoized selectors
- Keep canonical user profile in React Query
- Keep `selectedUserId` (client choice) in Zustand if needed

---

## Interview question bank

1. When do you use Zustand vs Redux vs React Query?
2. Why is server state different from client state?
3. Explain query keys and invalidation.
4. Explain `staleTime` vs `gcTime`.
5. How do you do optimistic updates safely?
6. How do selectors work in Zustand?
7. When is Context enough?
8. How do you structure auth state on mobile?
9. What happens on logout to caches and stores?
10. Compare RTK Query and React Query.
11. How would you store a selected account ID vs account balances?
12. How do you avoid re-render storms from a global store?

---

## Model answers (short)

### Zustand vs Redux vs React Query

> “React Query for server state. Zustand for lightweight global client/UI state. Redux when client workflows are complex or the codebase is already Redux-standardized. I avoid putting API caches into Redux by default.”

### How do you keep performance good with global state?

> “Narrow selectors, split stores by domain, keep high-frequency state local, and don’t put rapidly changing values in a wide global provider.”

---

## Hands-on drills

- [ ] Build a tiny screen: React Query list + Zustand filter flag.
- [ ] Implement mutation with optimistic add + rollback.
- [ ] Write an auth logout function that clears everything.
- [ ] Draw a diagram: which state goes where for EasyPay.
- [ ] Explain staleTime settings you’d choose for: profile, balances, static config.

Suggested defaults to discuss (not dogma):
- Static config: long `staleTime` (hours+)
- Profile: medium (minutes)
- Balances: short (seconds–minute) depending on product needs
- Always be ready to justify with product freshness requirements

---

## Green flags / red flags

**Green**
- Clear taxonomy of state
- Cache invalidation fluency
- Logout/cache reset awareness
- Tradeoff-driven tool choice

**Red**
- “Everything in Redux”
- “Zustand replaces React Query”
- No logout cache clearing
- Persisting tokens in AsyncStorage casually

---

## Tie to your CV

- EasyPay: React Query + Zustand + secure APIs
- Wizer: Redux Toolkit Query + NestJS admin features
- Be ready to say why different projects used different stacks and what you’d choose today for a green-field fintech app.

---

## Senior-Level Best Practices

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

## Mastery checklist

- [ ] I can classify any piece of state in under 5 seconds
- [ ] I can explain React Query cache keys/invalidation on a whiteboard
- [ ] I can implement optimistic transfer UX carefully
- [ ] I can defend Zustand + React Query as a default RN stack
- [ ] I can compare with Redux/RTK Query without trashing either
