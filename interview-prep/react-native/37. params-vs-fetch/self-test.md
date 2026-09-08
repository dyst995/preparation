# Params vs global / fetched state — Self-test

## Core recall

1. Recite what **to** put in route params (three bullets).
2. Recite what **not** to put in params (three bullets).
3. Recite the spoken interview answer.
4. What does it mean that params are a **frozen snapshot**?
5. What should Transfer Details **fetch**, given `transferId`?
6. What is a **flow flag** (`fromQr`) — server truth or journey context?
7. Why do **deep links** want **ids**, not full models?
8. Where do **tokens** live instead of params?
9. Params vs Zustand `selectedAccountId` — which is **this journey** vs **app-wide**?
10. Do params **update** when React Query **invalidates**?

## Explain why

1. Why does passing the **full DTO** from a list go **stale**?
2. Why prefer **fetch by ID** for data that **changes while the screen is open**?
3. Why are **secrets** in params dangerous even if TS-typed?
4. Why does a fat param object **break** notification / cold-start navigation?
5. Why is `fromQr` OK in params but `status: 'completed'` as **sole** truth is not?
6. Why must params be **serializable**?
7. Why isn’t a **typed** `{ user: User }` a green light?
8. Why might Confirm still **re-quote** if you passed `amountMinor`?
9. Why not store `fromQr` in **global** Zustand by default?
10. Why is **id in params + document in RQ** **not** the golden-rule duplication bug?

## Compare and contrast

1. Route params vs React Query cache.
2. Route params vs Zustand global client state.
3. Flow flag vs server field.
4. Small handoff vs full API model.
5. Placeholder title in params vs trusting **balance** in params.
6. This unit vs [type-safe nav](../36.%20type-safe-navigation/notes.md).
7. This unit vs [derived-state](../32.%20derived-state/notes.md) `params.user`.
8. This unit vs [§6 deep links](../04-navigation.md) (shape vs URL handbook).

## Predict the output

1. List passes `{ transfer }`. User pulls to refresh; list updates; Details still open. Amount on Details?

2. `navigate('Details', { transferId })` + `useQuery(detail(id))`. Invalidation after a webhook. Details?

3. Deep link `myapp://transfers/123`. Screen **requires** `route.params.transfer.amount`. Cold start?

4. Confirm params include **accessToken** “for the receipt API.” Log / link leak class?

5. Details reads **only** `route.params.status`. Server marks **failed**. User stays on screen. UI?

6. List → Details with **id**. Zustand **also** copies the tx. RQ rolls back optimistic update. Details still reads Zustand. UI?

## Debugging

1. Receipt shows **old** beneficiary after they edited it on another device. Params hold the **full** transfer. Fix?

2. Review: `navigate('Profile', { user: profile })`. What do you require?

3. Wallet header **param** `availableMinor` from Home. User transfers in Payments tab, pops back. Header?

4. `fromQr` still true on **next** unrelated transfer. Where was it stored?

5. Screen works from list, **crashes** from push notification. Params type **requires** `item: Tx`. Diagnose.

6. PAN last-4 passed as param into a **logged** navigator persist. What’s wrong?

## Application

1. Recite do-list, don’t-list, spoken answer.

2. Sketch Details: params + `useQuery` key including the id.

3. Classify: `transferId`; `fromQr`; `Transfer` DTO; refresh token; `selectedAccountId` (app-wide); `{ titleHint }`.

4. PR rule: “Route params may … must not …”

5. ParamList for Confirm: what **keys** (safe default)?

6. One-line: why this keeps **deep links** simple.

## Interview questions

1. Params vs React Query fetch — what goes where?  
   **Follow-up:** Why not the full object from the list?

2. How do you keep deep links simple?

3. User is on a details screen; the resource **changes** on the server. What updates?

4. Where do you put `fromQr: true`?

5. Would you put a **balance** in params for a snappy header?

## Connections

1. How does this **use** [RQ](../27.%20react-query/notes.md) keys?
2. How is this the **route** form of [derived-state](../32.%20derived-state/notes.md)?
3. How should [ParamLists](../36.%20type-safe-navigation/notes.md) look after this unit?
4. Why [auth](../35.%20auth-flow-patterns/notes.md) tokens never become params?
5. What will [§6](../04-navigation.md) **map** those ids onto?
