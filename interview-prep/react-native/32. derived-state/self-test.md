# Derived state and duplication traps — Self-test

## Core recall

1. Recite the three anti-patterns.
2. Recite the three “Better” bullets.
3. Recite the taxonomy **golden rule**.
4. What is **derived** state in one sentence?
5. What belongs in Zustand for a wallet list screen besides **not** the rows?
6. Where does **canonical user profile** live?
7. What is `selectedUserId` / `selectedAccountId` — server document or client choice?
8. Name four places `user` accidentally gets copied.
9. After a transfer, which copy updates automatically if you **didn’t** sync Zustand?
10. Recite the spoken 30–60s answer for this unit.

## Explain why

1. Why does copying RQ into Zustand “for convenience” drift after **invalidate**?
2. Why does the same copy break **optimistic rollback**?
3. Why does storing `filteredTxs` drift even if the **full** list is only in RQ?
4. Why is a `useEffect` → `setTxs(data)` still a **second owner**?
5. Why can logout still show a **user/name** if profile was copied into Zustand?
6. Why is `route.params.user` (object) a second source?
7. Why is JWT `name` a bad **profile** cache?
8. Why is deriving `accounts.find(id)` OK but storing `selectedAccount: Account` risky?
9. Why is missing `useMemo` **not** the same bug as `setState(filtered)`?
10. Why persist-of-txs is **both** a persist mistake and **this** trap?

## Compare and contrast

1. Canonical vs derived.
2. `selectedAccountId` vs `balances` / `accounts[]`.
3. Zustand `statusFilter` vs Zustand `filteredTxs`.
4. RQ `select` vs a second Zustand array.
5. Auth `userId` vs RQ `profile`.
6. `queryClient.getQueryData` at a call site vs `store.txs` kept in sync.
7. This unit vs [taxonomy derived row](../23.%20state-taxonomy/notes.md).
8. This unit vs [optimistic UI](../31.%20optimistic-ui/notes.md) (one cache vs two lists).

## Predict the output

1. RQ txs invalidated after transfer. Screen reads `useWalletStore(s => s.transactions)` last synced in `useEffect` on another screen that **unmounted**. What does the user see?

2. `visible` is `useState` updated in an effect from `txs` + `filter`. You change `filter`; effect **omits `filter` from deps**. Screen?

3. Optimistic prepend in **RQ only**. List UI maps **Zustand txs**. Pending row?

4. Logout: `queryClient.clear()`; Zustand still `{ user: { name: 'Nika' } }`. Header?

5. Two screens: one `useProfileQuery`, one `authStore.user`. PATCH name succeeds; only RQ invalidated. Names?

6. `select: (d) => d.filter(pending)` on the query. You invalidate `walletKeys.transactions(id)`. Does the pending view update? Why?

## Debugging

1. Home balance ≠ wallet header after send. Wallet header reads Zustand. Diagnose.

2. Search box stored as `filteredList` in Zustand; pull-to-refresh updates RQ; search results **old**. Fix?

3. Review: `navigate('Profile', { user: profile })` and a `useProfileQuery` on that screen. What do you require?

4. `useEffect` copies txs into Zustand **and** persist middleware saves them. After logout, next launch shows **old txs** before login. Why?

5. `selectedAccount` is a full object in Zustand. RQ accounts refetch; selected object still has **old IBAN**. Symptom class?

6. Filter chip is **local** `useState` but someone **also** wrote `store.visibleTxs`. Two filters disagree. What’s the fix?

## Application

1. Recite anti-patterns, Better bullets, golden rule, spoken answer.

2. Sketch the tiny drill: RQ list + Zustand **filter flag** + `useMemo` visible.

3. Classify: `selectedAccountId`; `accounts`; `statusFilter`; `pendingTxs[]` stored; `profile`; `userId`.

4. PR rule: “Zustand may hold … never …”

5. Rewrite `setTxs(data)` into derived reads (no store rows).

6. Split `user`: what goes session / RQ / Zustand.

## Interview questions

1. How would you store a **selected account ID** vs **account balances**?  
   **Follow-up:** Filtered transactions?

2. Why not copy React Query into Zustand for convenience?

3. Where should `user` live?  
   **Follow-up:** Auth store?

4. How do you keep a FlatList in sync after mutations without a second array in a store?

5. What’s the biggest state bug you see in RN apps? (Tie to this unit.)

## Connections

1. How does this **operationalize** the [taxonomy](../23.%20state-taxonomy/notes.md) golden rule?
2. How do [Zustand selectors](../25.%20zustand/notes.md) differ from **storing** a derived list?
3. How does [RQ invalidation](../27.%20react-query/notes.md) “just work” only if you **didn’t** copy?
4. Why [optimistic rollback](../31.%20optimistic-ui/notes.md) fails if the UI reads a Zustand copy?
5. How does [logout](../29.%20auth-session/notes.md) + a copied `user` produce a ghost header?
