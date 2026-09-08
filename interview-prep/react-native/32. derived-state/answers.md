# Derived state and duplication traps — Answers

## Core recall

1. Copy RQ into Zustand “for convenience”; store **filtered lists** instead of deriving; **multiple sources** for `user`.
2. Filter/select from query in **render** or **memoized selectors**; **canonical profile** in RQ; **`selectedUserId`** in Zustand if needed.
3. **The biggest state bug is putting the same data in two places and letting them drift.**
4. A **pure view** of canonical data (+ client inputs) that you **recompute**, not a stored copy.
5. **Filter / selection ids / UI flags** — not `transactions[]`.
6. **React Query.**
7. **Client choice** (pointer), not the server document.
8. Auth store profile, RQ `['profile']`, `route.params.user`, JWT claims.
9. **Only RQ.** The Zustand copy stays **stale**.
10. **Don’t copy RQ into Zustand. Derive filters. Profile in RQ. selectedUserId in Zustand. Two copies drift on invalidate, rollback, logout.**

## Explain why

1. Invalidate **refetches the cache**. The store **doesn’t subscribe** to that unless you **manually** write again — and you **won’t** everywhere.
2. Rollback restores **`setQueryData` snapshot**. Zustand still has the **optimistic** (or pre-rollback) **array**.
3. `filtered` is a **snapshot** of an old `filter(txs)`. New `txs` don’t change `filtered` until **another write**.
4. Every `set` is a **write** to a **second** canonical. Effects are **sync jobs**, not derivation.
5. Logout cleared **RQ**; the **store field** wasn’t reset → header still has a **name**.
6. Navigation **doesn’t update** that object when GET /me changes; other entry points **omit** it.
7. Token is **auth**, not a **profile document**. Name changes **don’t** rewrite the JWT.
8. `find` **always** uses current `accounts`. A stored **object** is a **fork** of one fetch.
9. Extra renders vs **wrong data**. `useMemo` is **perf**; `setState(filtered)` is **correctness**.
10. Second owner **on disk** — stale ledger **and** PII at rest.

## Compare and contrast

1. **Canonical:** one owner, writes. **Derived:** function of that; no independent `set`.
2. **Id** in Zustand. **Balances / list** in RQ.
3. **Input** vs **output snapshot**.
4. `select` is a **per-observer view** of the **same** cache. Zustand array is a **second store**.
5. **Session pointer** vs **GET /me document**.
6. **Read-through** the cache once vs **keeping** a clone in sync **forever**.
7. Taxonomy **named** derived. This unit is **the three traps** and the **id vs document** split.
8. Optimistic **patches one cache**. Copies mean the **UI isn’t that cache**.

## Predict the output

1. **Old txs** (last copy). Transfer **missing**.
2. **Wrong filter** — still the previous `visible` until `txs` identity changes (or never).
3. **No pending row** (or list unchanged).
4. **Still shows “Nika”** — ghost logged-in chrome.
5. **Disagree** — RQ has new name, auth store **old**.
6. **Yes** — same **query key**; `select` reruns on new `data`.

## Debugging

1. **Two sources** for balance. Make the header **`useQuery`**; delete Zustand balance.
2. Store **`searchQuery` string** only; `useMemo` filter RQ `data`. Drop `filteredList`.
3. Pass **`userId`**; screen **fetches**. Don’t treat params object as canonical profile.
4. Persist **rehydrated txs**; logout didn’t **partialize** them out / wipe that key. **Don’t persist lists.**
5. **Stale nested object** — store **id**, derive account from RQ.
6. **One** filter owner (local **or** store flag). Derive `visible`. Delete `visibleTxs`.

## Application

1. Three anti-patterns + Better + golden rule + spoken paragraph.
2. `useQuery` txs; `statusFilter` in Zustand; `visible = useMemo(filter, [txs, statusFilter])`.
3. Ids/filters/`userId` → client. `accounts`/`profile`/`pendingTxs[]` stored → **server / don’t store**.
4. **…ids, filters, flags — never server lists or profile documents.**
5. `const { data: txs } = useQuery(...)`; `const filter = useStore(s => s.statusFilter)`; derive `visible`.
6. Session: `userId` + tokens. RQ: profile. Zustand: `selectedUserId` if choosing; **not** a second `user`.

## Interview questions

1. **Spoken:** Selected account **id** in Zustand (or route). **Balances** in React Query. I don’t copy balances into the store.  
   **Follow-up:** Filter **flag** in Zustand; **filter the query data** in render/`useMemo`. Don’t store `filteredTxs`.

2. **Spoken:** Convenience is a **second owner**. Invalidate, optimistic rollback, logout, persist — the copy **lies**. I read the cache and **derive**.

3. **Spoken:** Canonical **profile** in RQ. Session is **userId** + vault.  
   **Follow-up:** Auth store should **not** keep a **forked profile**; at most **id** / presence.

4. **Spoken:** FlatList `data={visible}` where `visible` is **derived** from RQ. Mutation **invalidates** the key; list **follows**. No `setTxs`.

5. **Spoken:** Same data in two places **drifting** — this unit’s copies of **txs** and `user`.

## Connections

1. Golden rule → **don’t copy**; derived row → **filter in render**; id vs document → **`selectedUserId`**.
2. Selector **picks `statusFilter`**. Computing `filteredTxs` **inside** the selector from **RQ data you don’t have in the store** still needs **txs from RQ**. Don’t **put the array in Zustand** so the selector can return it.
3. Invalidate updates **observers of that key**. A Zustand array is **not** an observer.
4. Rollback writes **RQ**. Zustand copy **untouched** → UI **wrong**.
5. Header read **store.user**; RQ gone → **looks logged in**.
