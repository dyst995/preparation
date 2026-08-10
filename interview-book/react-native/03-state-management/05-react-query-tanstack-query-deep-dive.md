# 05. React Query (TanStack Query)  deep dive

> Source: `interview-prep/react-native/03-state-management.md`

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

> �`staleTime` controls freshness � when React Query should consider data stale and eligible to refetch. `gcTime` controls memory lifetime of unused cache entries. Freshness and garbage collection are different concerns.�

**Q: Should API data live in Redux?**

> �Usually no. Server state has caching, deduping, retries, and invalidation needs that React Query already solves. Redux duplication often causes sync bugs.�

**Q: How do you update a transactions list after a transfer?**

> �Optimistic update for immediate UX, then invalidate transactions and balances on settle to reconcile with server truth.�

---
