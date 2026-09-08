# React Query (TanStack Query)

## What you need to know

A **query** is **cached server state** identified by a **key**. That is the [taxonomy](../23.%20state-taxonomy/notes.md) **server** row: **not** Redux, **not** Zustand lists.

Interviewers expect fluency on:

- **Query keys** and **key factories**
- **`staleTime` vs `gcTime`** (`cacheTime` was renamed)
- Fetching, **refetching**, **invalidation**
- Mutations: **`onSuccess` / `onSettled`**
- **Optimistic updates + rollback**
- **Placeholder** vs **initial** data
- **Pagination / infinite** queries
- **Cancellation** on unmount
- **Online/offline** basics
- **Deduping** and cache as **performance**

**Mental model (preserve):**

- Query = cache entry keyed by an array
- **`staleTime`:** how long data is **fresh** (no refetch **needed**)
- **`gcTime`:** how long **inactive** data stays in **memory** before GC
- **Invalidation** marks stale and **typically refetches** active observers

**Key factory (preserve):**

```text
walletKeys = {
  all: ['wallet'],
  balances: () => [...walletKeys.all, 'balances'],
  transactions: (accountId) => [...walletKeys.all, 'tx', accountId],
}
```

**Mutation pattern (preserve):** mutate → **optimistic** cache → **rollback** on error → **invalidate** on **settle**.

This unit is **RQ cache semantics**. **RTK Query vs RQ** is next. HTTP interceptors / refresh races are [05-networking.md](../05-networking.md).

---

## Keys and factories

The key is the **identity** of the cache entry. Same key → **same** cache, **deduped** in-flight fetch, **shared** `data`.

```ts
useQuery({ queryKey: walletKeys.transactions(id), queryFn: () => api.txs(id) });
```

**Hierarchy:** `invalidateQueries({ queryKey: walletKeys.all })` hits **balances and all txs** because they **start with** `['wallet']`. `walletKeys.transactions(id)` invalidates **one** account.

**Typos** (`['walet']`) = **silent second cache**. Factories = **one** place to rename.

Put factories in **`features/wallet/api/keys.ts`**, not magic strings in screens.

---

## `staleTime` vs `gcTime`

| | **staleTime** | **gcTime** (old **cacheTime**) |
| --- | --- | --- |
| Question | Is this **fresh** enough to **skip refetch**? | If **nobody** is observing, **how long** until we **drop** the entry? |
| Default (v4/v5 mental) | **`0`** — immediately **stale** | **Minutes** (v5 default **5 min**) |
| Observer mounts | If **stale**, **refetch** (still **show** cached data if present) | If already **GC’d**, **no** cache → loading from scratch |
| Fintech | Short staleTime on **balances** (money moves). Longer on **static** FX tables | Don’t confuse with “data is fresh” |

**Fresh ≠ in memory.** Cached + **stale** = show **old** balance **and** refetch. Cached + **fresh** = **no** network.

**`isFetching`:** a request is in flight (including **background** refetch). **`isPending` / no data yet:** first load. Don’t say `isLoading` only — interviewers like **background refetch** vs **empty**.

Preserve:

> `staleTime` controls freshness — when React Query should consider data stale and eligible to refetch. `gcTime` controls memory lifetime of unused cache entries. Freshness and garbage collection are different concerns.

---

## Fetch, refetch, invalidate

**Fetch:** `queryFn` runs when a query is **enabled**, **no fresh data**, and **online** (defaults).

**Refetch:** mount / focus / reconnect / interval / **`invalidateQueries`** — if **stale** (or forced). RN: **`refetchOnWindowFocus`** is **weaker** than web; **reconnect** / **AppState** still matter. Don’t claim “every app switch refetches” unless you **configured** it.

**`invalidateQueries`:** mark **stale**; **active** queries **refetch**. **Inactive** stay stale until next mount (then refetch). That’s why **key factories** matter: after transfer, `invalidateQueries({ queryKey: walletKeys.all })` **balances + txs**.

---

## Mutations: `onSuccess` vs `onSettled`

```ts
useMutation({
  mutationFn: createTransfer,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: walletKeys.all }),
  onSettled: () => queryClient.invalidateQueries({ queryKey: walletKeys.all }),
});
```

**`onSuccess`:** only **OK**. **`onSettled`:** **success and error**. Curriculum favorite uses **settle** to **always** reconcile with the server after an optimistic attempt (including **failed** — cache may have been **rolled back**, then **invalidate** still **refetches truth**).

**`onError`:** rollback **snapshot**. Don’t **only** `onSuccess` invalidate if you **optimistically** wrote — **error** path must **restore**.

---

## Optimistic updates + rollback (interview favorite)

```ts
onMutate: async (newTx) => {
  await queryClient.cancelQueries({ queryKey: walletKeys.transactions(id) });
  const previous = queryClient.getQueryData(walletKeys.transactions(id));
  queryClient.setQueryData(walletKeys.transactions(id), (old) => [newTx, ...(old ?? [])]);
  return { previous };
},
onError: (_err, _vars, ctx) => {
  queryClient.setQueryData(walletKeys.transactions(id), ctx?.previous);
},
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: walletKeys.all });
},
```

**Cancel** in-flight fetches so they **don’t overwrite** the optimistic write. **Snapshot** for **rollback**. **Invalidate on settle** so **server** is authority (fintech: **never** trust optimistic **money** forever).

Preserve:

> Optimistic update for immediate UX, then invalidate transactions and balances on settle to reconcile with server truth.

---

## `placeholderData` vs `initialData`

| | **initialData** | **placeholderData** |
| --- | --- | --- |
| Role | **Seed the cache** as if you **had** data | **Show something** while fetching; **not** the same as a completed fetch |
| `staleTime` | Clock starts; can **skip** refetch if still **fresh** | Real fetch still happens; UI isn’t empty |
| Pagination | — | **`keepPreviousData`** / `placeholderData: keepPreviousData` so the **old page** stays while the **next** key loads |

**Don’t** `initialData` a **guessed balance** and a **long staleTime** — you’ll **skip** the network and **show fiction**.

---

## Infinite queries (pagination)

`useInfiniteQuery`: `pages[]`, `getNextPageParam`, `fetchNextPage`. The **key** still includes **accountId** (factory). **Invalidate** `walletKeys.transactions(id)` after a transfer so **pages** **refetch** — don’t **manually** patch five pages unless you **must** (optimistic on **page 0** is already hard).

Offset vs cursor **HTTP** design is [05-networking.md](../05-networking.md). Here: **RQ holds pages**, not Zustand.

---

## Cancellation, offline, dedupe

**Unmount:** RQ **aborts** the `queryFn` `signal` (if you pass `signal` to `fetch`). Prevents **setState on unmounted** and **wasted** radio.

**Offline:** default **don’t** hammer a dead network; **mutations** can **pause**. Fintech: **queue** vs **fail** is a **product** choice; don’t claim RQ **replaces** idempotent **transfer** APIs.

**Dedupe:** two screens `useQuery` **same key** → **one** request. That’s a **performance** feature (and why keys must be **stable**).

---

## Common mistakes and misconceptions

- **`staleTime` = `gcTime`.** Freshness ≠ memory TTL.
- **Default staleTime 0** forgotten — “why does it always refetch?”
- **Invalidate a typo key** — nothing refetches.
- **Optimistic without rollback / cancel.**
- **`onSuccess` only** after optimistic write.
- **`initialData` fake money** + long staleTime.
- **Lists in Zustand** “and RQ.”
- Ignoring **`signal`** so abort does nothing.
- **RTK vs RQ** as the first answer when they asked **staleTime**.

---

## Connections to other concepts

`taxonomy (server) → RQ cache keyed → invalidate after mutation → don’t clone in Zustand`

- **[Zustand](../25.%20zustand/notes.md):** `selectedAccountId` only; **txs** here.
- **[Redux](../26.%20redux-toolkit/notes.md):** **usually no** API in slices — preserve that spoken answer.
- **[DTO/mappers](../19.%20data-domain/notes.md):** `queryFn` returns DTO; **map** in the hook/`select`.
- **[QueryClient Context](../24.%20context-api/notes.md):** **DI** of the cache host.
- **§6:** same job, **Redux-shaped** API.

---

## Interview perspective

Three preserved answers: **staleTime vs gcTime**, **API in Redux?**, **txs after transfer**. Then **key factory** and **optimistic + settle**.

Spoken 30–60s:

> A query is server state in a cache, keyed by a factory so I can invalidate a whole wallet or one account’s txs. staleTime is freshness; gcTime is how long unused entries stay in memory. After a transfer I optimistically update, roll back on error, and invalidate balances and transactions on settle so the server wins. I don’t copy that list into Redux or Zustand.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
