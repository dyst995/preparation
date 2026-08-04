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

## Mastery checklist

- [ ] I can classify any piece of state in under 5 seconds
- [ ] I can explain React Query cache keys/invalidation on a whiteboard
- [ ] I can implement optimistic transfer UX carefully
- [ ] I can defend Zustand + React Query as a default RN stack
- [ ] I can compare with Redux/RTK Query without trashing either
