# Params vs global / fetched state — Answers

## Core recall

1. **IDs**; **flow flags** for this journey; **small serializable** handoff.
2. **Full API models** (stale); **secrets**; data that **changes** while open (**fetch by ID**).
3. **Identifiers and flow context as params; fetch with React Query on the screen. Avoids stale param objects; keeps deep links simple.**
4. Values **frozen at navigate**; **not** subscribed to the cache.
5. The **transfer document** via RQ (`transferKeys.detail(transferId)`).
6. **Journey context** (how they entered) — **not** server truth.
7. URLs / notifications **carry ids**, not a **fresh** JSON model (and **mustn’t** carry secrets).
8. **Secure storage** / session — **not** the route.
9. **Params** = this **stack entry**. **Zustand id** = **app-wide** selection (still **not** the account **object**).
10. **No.** RQ updates; **params don’t**.

## Explain why

1. The object is a **copy from that moment**. RQ/list **refetch** doesn’t **mutate** the route.
2. Authority is the **server**. The open screen must **see** invalidation/refetch, not a **dead** snapshot.
3. Params show up in **links, logs, persisted nav state, Intents**.
4. The OS only has **type + id**. No DTO → crash or **empty** screen.
5. `fromQr` **won’t** change on the server. **Status** **will**.
6. Nav state / linking **JSON**. Functions/Maps **drop** or **break**.
7. Types check **shape**, not **freshness** or **PII**.
8. FX/limits **move**. A param amount is a **hint**; **API** is **authority**.
9. Global **survives** pop → **wrong** banner on the **next** flow.
10. **Pointer vs document** — **two kinds**, one owner each (param vs RQ).

## Compare and contrast

1. **Journey pointer** vs **server cache** (refetchable).
2. **This screen’s** args vs **cross-screen client** choice.
3. **UX path** vs **ledger/status**.
4. **Tiny JSON** vs **stale blob**.
5. **Chrome hint** vs **lying money**.
6. **How to type** vs **what to store**.
7. Same **don’t copy `user`**.
8. **Why id** vs **how** `linking` **maps** the path.

## Predict the output

1. **Old amount** (param DTO).
2. **New** data after refetch (query **observers**).
3. **Crash / missing amount** — no `transfer` object.
4. **Token leak**.
5. Still **pending/completed** from **open time** — **wrong**.
6. **Stale/optimistic fiction** — third copy **didn’t** roll back.

## Debugging

1. Pass **`transferId`**; **`useQuery`**. Delete the DTO param.
2. **`userId` + `useProfileQuery`**. No `user:` object.
3. **Stale available** — header must **read RQ** (or Zustand **id** + query), not a **param amount**.
4. **Zustand/global**. Put `fromQr` on **that** navigate’s params only.
5. Notification **only has id**. Type **`{ transferId: string }`**; **fetch**.
6. **PII/secret in params** + persist. **Don’t**; last-4 from **server** after fetch if needed.

## Application

1. Do / don’t / spoken paragraph.
2. `const { transferId } = route.params;` `useQuery({ queryKey: […, transferId], queryFn })`.
3. id / fromQr / titleHint → params (hint). DTO / token → **no**. `selectedAccountId` → **Zustand** (or thread if **this** flow only).
4. **…ids, flags, tiny JSON; must not models, secrets, live money/status.**
5. `{ accountId, transferId? }` (+ optional flags). **Re-validate** amount via API.
6. **`/transfers/:id` is enough** to open Details.

## Interview questions

1. **Spoken:** IDs and flow context as **params**; **React Query** on the screen for the **document**.  
   **Follow-up:** List DTO **goes stale**; **two sources**.

2. **Spoken:** Links are **ids**. Fat objects **can’t** be in the URL honestly.

3. **Spoken:** **RQ** (refetch/invalidate). **Params stay**. So **don’t** put the changing fields **only** in params.

4. **Spoken:** **Route params** for **this** journey. Not a leftover **global**.

5. **Spoken:** **No** as **authority**. Optional **hint**, still **fetch** balances. Money **lies**.

## Connections

1. `queryKey` **includes** `route.params.id`.
2. Don’t copy **documents** into **params** the way you don’t copy into **Zustand**.
3. `{ transferId: string; fromQr?: boolean }`, not `{ transfer: Transfer }`.
4. Vault / session. Params are **visible** to the **OS**.
5. Path **patterns** → **those** param names.
