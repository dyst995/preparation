# React Query — Self-test

## Core recall

1. What is a **query** in the mental model?
2. Recite **`staleTime` vs `gcTime`** (spoken answer). `cacheTime` is what?
3. Recite the **four-step** mutation pattern.
4. Recite **should API data live in Redux?**
5. Recite **how you update txs after a transfer.**
6. Write the **walletKeys** factory from memory (all / balances / transactions).
7. Three benefits of key factories.
8. What does **invalidation** do?
9. **Dedupe:** what happens with two `useQuery`s on the same key?
10. What happens to an in-flight query when the screen **unmounts** (if `signal` is wired)?

## Explain why

1. Why hierarchical keys (`['wallet']` prefix)?
2. Why default **`staleTime: 0`** surprises people (“it always refetches”)?
3. Why a **stale** cache can still **show data** while refetching?
4. Why **`gcTime`** doesn’t mean “data is still fresh”?
5. Why **invalidate `walletKeys.all`** after a transfer, not only txs?
6. Why **cancel** queries in `onMutate`?
7. Why **rollback** on error instead of only invalidating?
8. Why **`onSettled`** (not only `onSuccess`) in the favorite pattern?
9. Why **`initialData`** + long `staleTime` is dangerous for a **balance**?
10. Why key **typos** cause “invalidation does nothing”?

## Compare and contrast

1. `staleTime` vs `gcTime`.
2. `isPending` (no data) vs `isFetching` (in flight).
3. `onSuccess` vs `onSettled` vs `onError`.
4. `placeholderData` vs `initialData`.
5. `invalidateQueries` vs `setQueryData`.
6. `useQuery` vs `useInfiniteQuery`.
7. RQ cache vs Zustand `transactions`.
8. This unit vs [05-networking](../05-networking.md) pagination (offset/cursor vs `pages`).

## Predict the output

1. `staleTime: 60_000`, data fetched 10s ago. Component remounts. Network? Why?

2. `staleTime: 0`, cached data exists. Remount. Network? Does the user see old data first?

3. Last observer unmounts. `gcTime: 5000`. 6s later you open the screen. Cache?

4. `invalidateQueries({ queryKey: ['wallet'] })` with keys `['wallet','balances']` and `['wallet','tx', id]`. What refetches?

5. Optimistic prepend tx; in-flight **old** fetch **completes after** and `setQueryData` from that fetch. Without `cancelQueries`?

6. `placeholderData: keepPreviousData`, you change `accountId` in the key. What does the user see while the new query loads?

## Debugging

1. Invalidation uses `['transactions']` but queries use `walletKeys.transactions(id)` = `['wallet','tx', id]`. Symptom?

2. Transfer OK, list wrong, **Zustand** also has txs. Diagnose.

3. Optimistic UI stuck after **500**. No `onError` restore. Fix?

4. `isLoading` stays true on **pull-to-refresh** while the list is visible. Which flag did they mean?

5. Two wallet widgets fire **two** identical GETs. Keys differ by **string vs number** `id`. Why?

6. `initialData: { amountMinor: 0 }` and `staleTime: Infinity` on balances. What’s the product bug?

## Application

1. Write `walletKeys` as in the curriculum.

2. Sketch `useMutation` with `onMutate` snapshot, `onError` rollback, `onSettled` invalidate `walletKeys.all`.

3. Recite all three curriculum interview answers.

4. Pick `staleTime` for: balances; app-config flags that rarely change. One sentence each.

5. PR rule: “After money mutations we must …”

6. `queryFn` + mapper: where does [DTO → domain](../19.%20data-domain/notes.md) run?

## Interview questions

1. `staleTime` vs `gcTime`?  
   **Follow-up:** What are the defaults / why always refetch?

2. Should API data live in Redux?  
   **Follow-up:** Zustand?

3. How do you update a transactions list after a transfer?  
   **Follow-up:** Why invalidate balances too? Why rollback?

4. What is a query key factory and why?

5. `placeholderData` vs `initialData`? Infinite query after a transfer?

## Connections

1. How does this **implement** the taxonomy **server** row?
2. How does invalidation **prevent** the [golden rule](../23.%20state-taxonomy/notes.md) bug **if** you don’t clone into Zustand?
3. How do factories relate to [feature `api/`](../15.%20feature-layering/notes.md)?
4. How does QueryClient in [Context](../24.%20context-api/notes.md) fit?
5. What will **RTK Query** duplicate conceptually that you should **not** re-learn as a second cache in Redux **and** RQ?
