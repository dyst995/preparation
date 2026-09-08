# React Query — Answers

## Core recall

1. **Cached server state identified by a key.**
2. **staleTime = freshness / eligible to refetch. gcTime = memory TTL of unused entries.** Different concerns. **`cacheTime`** is the **old name** of **gcTime**.
3. **Mutate → optimistic cache → rollback on error → invalidate on settle.**
4. **Usually no** — RQ already does cache, dedupe, retries, invalidation; Redux copies **sync-bug**.
5. **Optimistic UX, then invalidate txs and balances on settle** (server truth).
6. `all: ['wallet']`; `balances: () => [...all, 'balances']`; `transactions: (id) => [...all, 'tx', accountId]`.
7. **Consistent invalidation; fewer typos; easier refactors.**
8. Marks **stale**; **typically refetches** **active** queries.
9. **One** in-flight request; **shared** cache.
10. **Abort** via `AbortSignal` — request **cancelled** if `queryFn` uses `signal`.

## Explain why

1. **Prefix invalidation** — one `all` invalidates **the feature’s** server state.
2. **Default fresh window is zero** — every mount/focus **may** refetch even with cache.
3. Cache is **there**; **stale** only means **eligible** to refetch. **isFetching** true, **data** still shown.
4. **GC** drops **unused** memory. An entry can be **stale** and **still in memory**, or **fresh** until GC after unmount **wait**.
5. Transfer changes **balance and** the **list**.
6. So an in-flight **GET** doesn’t **overwrite** the optimistic write with **pre-mutation** JSON.
7. Invalidation is **async**; user would **see** the optimistic row **until** refetch. **Restore snapshot** **immediately**.
8. **Error and success** both need **server reconcile**; `onSuccess` **skips** the error path.
9. RQ may treat it as **real cached data** and **skip** fetch — **wrong money**.
10. You’re invalidating a **different** cache identity. **No observers** of that key.

## Compare and contrast

1. **Freshness vs memory TTL.**
2. **Empty vs in-flight** (including **background**).
3. **OK only / always / failure rollback.**
4. **Seeded cache vs display-while-fetching.**
5. **Mark stale + refetch** vs **write cache now** (optimistic).
6. **One blob** vs **pages** + `fetchNextPage`.
7. **Server owner vs clone → drift.**
8. **Networking:** how pages are **requested**. RQ: how pages are **cached**.

## Predict the output

1. **No refetch** (still **fresh**). **Show cache.**
2. **Yes refetch** (stale). **Yes** — **cached** shown, **isFetching**.
3. **GC’d** — **no** cache; **pending** fetch.
4. **Both** balances and that txs query (and any other `['wallet', …]`).
5. **Optimistic row disappears** / replaced by **old** list — **lost** write. **Cancel** first.
6. **Previous account’s list** until new data (**placeholder**), not a blank spinner (if configured).

## Debugging

1. **Key mismatch** — invalidate **never** hits observers. Use **factory**.
2. **Two owners.** Delete Zustand list; **only** RQ + invalidate.
3. **`onError` setQueryData(previous)**; then **onSettled** invalidate.
4. They wanted **`isFetching`**. **`isPending`** is **no data**. Pull-to-refresh **has** data.
5. **Keys unequal** (`'1'` vs `1`) → **no dedupe**. **Normalize** id in the factory.
6. **Fiction forever** — never hits API. **Don’t** seed money with **Infinity** stale.

## Application

1. Match curriculum `walletKeys`.
2. Match notes `onMutate` / `onError` / `onSettled` sketch.
3. Three spoken paragraphs from notes.
4. **Balances:** **low** staleTime (or 0). **Flags:** **higher** staleTime.
5. **…invalidate (and optimistic+rollback) wallet keys — balances and txs — not a Zustand copy.**
6. **`queryFn` or `select`** in the **feature hook** — **not** in JSX.

## Interview questions

1. **Spoken:** staleTime = **freshness** / refetch eligibility. gcTime = **unused memory** lifetime. Different.  
   **Follow-up:** **staleTime 0** default → refetch when stale on mount; cache can still **display**.

2. **Spoken:** Usually **no**. RQ: cache, dedupe, retries, invalidation. Redux copies **drift**.  
   **Follow-up:** Zustand **same** — **don’t** clone lists.

3. **Spoken:** Optimistic for UX; rollback on error; **invalidate txs and balances on settle**.  
   **Follow-up:** Transfer **moves money**. Cancel in-flight; snapshot rollback.

4. **Spoken:** Functions that build **hierarchical** keys — **invalidate `all`**, fewer typos.

5. **Spoken:** **initialData** seeds cache; **placeholder** is **interim UI**. After transfer, **invalidate** the infinite **key** so **pages** refetch — don’t hand-edit every page unless you must.

## Connections

1. **Balances/txs** **are** queries, **not** Redux.
2. **One** cache + **invalidate** = **one** truth. A Zustand copy **breaks** that.
3. **`features/wallet/api`** owns **keys + queryFn**; screens **use** hooks.
4. **QueryClientProvider** injects the **cache**; **stable** client.
5. **One** server cache. Wizer **RTKQ** **or** RQ — **not both** for the **same** resource.
