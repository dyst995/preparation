# Optimistic UI design — Self-test

## Core recall

1. Recite the six send-money steps.
2. Recite the three risks.
3. Recite the spoken interview nuance (UX tool / server / idempotent).
4. What is optimistic UI in one sentence?
5. What is a **pending** row supposed to mean vs a **completed** row?
6. What does “deduct available **carefully**” warn against (two traps)?
7. What must happen on **success** to balances and transactions?
8. What must happen on **failure** (two parts)?
9. Why is a locked submit button **not** enough?
10. When do you mint a **new** idempotency key vs **reuse** the same one?

## Explain why

1. Why is optimistic UI **not** a source of truth?
2. Why show a **pending** row instead of “Sent ✓” immediately on a transfer?
3. Why can patching **both** the balance query **and** a pending tx **double-count**?
4. Why invalidate **on settle**, not only on success?
5. Why must payment APIs be **idempotent** even with a disabled button?
6. Why is a **timeout** more dangerous than a clean **400**?
7. Why is full optimism fine for **like** but risky for **wire**?
8. Why `cancelQueries` in `onMutate` does **not** replace idempotency?
9. Why shouldn’t you persist the optimistic pending transfer?
10. Why an **actionable** error matters more here than a generic toast?

## Compare and contrast

1. Optimistic UI vs pessimistic UI.
2. Pending row vs completed / “Sent” state.
3. Button lock vs server idempotency.
4. Optimistic cache patch vs [Zustand persist](../30.%20persistence/notes.md).
5. `setQueryData` in `onMutate` vs `invalidateQueries` on settle.
6. Same idempotency key on retry vs new key on a new confirm.
7. This unit’s product rules vs [RQ mechanics](../27.%20react-query/notes.md) (`onMutate` / rollback).
8. 202 Accepted vs 200 settled — what should the UI claim?

## Predict the output

1. User double-taps Confirm. Button **not** locked. API **not** idempotent. How many transfers?

2. Optimistic deduct **and** pending tx; header is `available − sum(pending)`. What does the header show?

3. `onMutate` prepends pending. In-flight GET of the **old** list completes **after**. No `cancelQueries`. List?

4. Mutation **500**. No `onError` rollback. Invalidate also missing. UI?

5. POST **times out**. UI shows error, **unlocks**, user confirms again with a **new** UUID. Server had processed the first. Result?

6. Mutation **201**. You skip invalidate because the optimistic row “looks right.” Later pull-to-refresh?

## Debugging

1. Users report **two charges** from one confirm on slow networks. Button disables on `isPending` but retries mint a **new** key. Diagnose.

2. After failed transfer, balance stays **low** and a ghost pending remains. What was omitted?

3. Review: `onSuccess` toast “Money sent” fired from `onMutate`. What’s wrong for fintech?

4. Header available **jumps down twice** then snaps up on invalidate. Likely cause?

5. Transfer succeeds; list still missing the tx until kill-app. `invalidateQueries({ queryKey: ['txs'] })` vs factory `['wallet','tx', id]`. Diagnose.

6. `mutate` called from Confirm **and** from a `useEffect` that retries on `isError` with a **new** payload object and **new** key. What happens?

## Application

1. Recite the six steps, three risks, and spoken nuance.

2. Sketch `onConfirm`: ignore if `isPending`; hold `idempotencyKey` in a ref; `mutate`.

3. Classify: like a post; send wire; save theme; reorder a grocery list. Optimistic **settlement**, **pending-only**, or **pessimistic**?

4. Write a one-line PR rule for money mutations (lock + key + settle).

5. List **wipe/rollback** vs **keep** after a **failed** send (cache vs vault vs theme — one line each).

6. Timeout UX: what must the screen **not** do?

## Interview questions

1. Walk me through send-money optimistic UI.  
   **Follow-up:** What does “carefully” mean on the balance?

2. Optimistic UI is just UX, right? So we can skip idempotency?  
   **Follow-up:** Timeout?

3. How do you avoid double spend in the UI **and** on the server?

4. When would you **not** optimistically update a balance?

5. After success/failure, what happens to the cache?

## Connections

1. How does this **use** [RQ](../27.%20react-query/notes.md) without replacing it?
2. Why is this **not** [persistence](../30.%20persistence/notes.md)?
3. How does [taxonomy](../23.%20state-taxonomy/notes.md) tell you **not** to put pending txs in Zustand?
4. How does a **401** mid-mutation interact with [auth-session](../29.%20auth-session/notes.md) and the **same** idempotency key?
5. Next is **derived-state traps** — how would copying the optimistic list into Zustand make rollback worse?
