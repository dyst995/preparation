# Optimistic UI design — Answers

## Core recall

1. Confirm → disable submit / pending row → **carefully** deduct available → send mutation → success: **invalidate** balances + txs → failure: **rollback** + actionable error.
2. Over-optimistic on **irreversible** money; **double spend UI** if button unlocked; **server idempotency** still required.
3. **Optimistic UI is a UX tool, not a source of truth. The server remains authoritative, and payment APIs should be idempotent.**
4. Update the **client** as if the mutation **started/succeeded**, then **reconcile** with the network.
5. **Pending:** tap **accepted**, settlement **unknown**. **Completed / Sent:** money **moved** (only after the API says so).
6. **Don’t treat available as settled truth**; **don’t double-count** if header already subtracts pending.
7. **Invalidate** balances **and** transactions (usually `walletKeys.all`).
8. **Rollback** the snapshot; **actionable** error (and typically still **invalidate** on settle).
9. Timeouts, process death, second device, retry — **UI lock doesn’t reach the server**.
10. **Reuse** on retry of the **same** confirm; **new** key only for a **new** user confirm.

## Explain why

1. The cache is a **guess**. Ledger / payment API is **authority**. Invalidate/rollback exist because the guess can be **wrong**.
2. “Sent ✓” tells an **irreversible** story. A pending row matches **in-flight / accepted**, not **settled**.
3. Two independent minuses of the **same** amount. Header shows **2×** until invalidate snaps it back — or worse, **stays** wrong.
4. Error path may have **rolled back** or **partially** patched. Settle **refetches truth** so you don’t keep fiction.
5. The lock is **this process, this screen**. The server sees **HTTP**. Duplicate POSTs need **dedupe**.
6. Client **doesn’t know** if the server booked. Treating timeout as **failure** + **new** send **doubles**.
7. Like is **reversible and cheap**. A wire **moves money**; a wrong optimistic **settled** state is a **support incident**.
8. `cancelQueries` stops **GET** responses from **clobbering** the optimistic list. It does **not** stop **two POSTs**.
9. Persist would **write a lie to disk** and show it **next launch** after a crash — [persistence](../30.%20persistence/notes.md) already forbids raw financial payloads.
10. “Something went wrong” invites **retry with a new key**. “Insufficient funds” / “already processed” tell the user **what to do**.

## Compare and contrast

1. **Optimistic:** paint first, network later. **Pessimistic:** wait for 2xx, then paint. Money often **pending-optimistic**, not **settlement-optimistic**.
2. Pending = **intent**. Completed = **ledger**. Curriculum wants the first **before** the request returns.
3. Lock = **don’t fire twice from this UI**. Idempotency = **server treats duplicate HTTP as one**.
4. Persist = **across launches**, prefs/vault. Optimistic = **in-memory cache during a mutation**.
5. `setQueryData` = **immediate guess**. Invalidate = **throw away guess, fetch authority**.
6. Same key = **same logical transfer**. New key = **second transfer**.
7. RQ = **snapshot / rollback / settle code**. This unit = **pending vs settled, lock, keys, timeout**.
8. **202** = **accepted / async**. UI should stay **pending** (or “processing”), not **settled**. **200** with booked result can show **completed**.

## Predict the output

1. **Two transfers** (two POSTs, two bookings).
2. Amount subtracted **twice** — header **too low** until (hopefully) invalidate.
3. Old GET **overwrites** the optimistic prepend — pending **vanishes** (or list **rewinds**).
4. **Stuck** pending / **wrong** balance. User thinks money moved or is **frozen**.
5. **Two** bookings (first succeeded, second is a **new** key). Classic double send.
6. Optimistic row may **lack** server id/fees/status. Refresh **without** matching invalidate key → **stale** until something else refetches — or it **looks** fine until **fees/status** differ. You **skipped** reconciling with authority.

## Debugging

1. **Retry minted a new idempotency key** after timeout. Server had the first. Fix: **same key** on retry; don’t treat timeout as a **new** confirm.
2. Missing **`onError` rollback** (and maybe **onSettled** invalidate). Restore snapshot **and** refetch.
3. `onMutate` is **before** the server. Toast **settlement** only after **success** (or known accepted-async state — still not “settled” if the API is async).
4. **Double deduction**: balance patch **plus** pending in a derived header. Patch **one** place.
5. **Wrong invalidate key** — typo / not the factory. Queries never refetch.
6. Effect treats **error** as “try a **new** transfer.” **Second** key → **second** payment. Retry must reuse **keyRef**.

## Application

1. Six steps + three risks + spoken nuance (UX tool / server / idempotent APIs).
2. `if (isPending) return;` `keyRef.current ??= uuid();` `mutate({ ...payload, idempotencyKey: keyRef.current })`.
3. Like / grocery reorder: full optimistic OK. Wire: **pending + lock**, **not** settled. Theme: **not** a mutation of server money (client persist — different unit).
4. **Lock the button, one idempotency key per confirm, rollback on error, invalidate wallet on settle.**
5. **Cache:** rollback + invalidate. **Vault:** unchanged (not a logout). **Theme:** unchanged.
6. **Must not** unlock and invite a **new-key** confirm as if the first **failed**. Stay pending / checking; **same** key if you retry POST.

## Interview questions

1. **Spoken:** User confirms. I disable submit and show a **pending** row. I may adjust available **carefully** — I don’t double-count and I don’t treat it as **settled**. I send the mutation. On success I **invalidate** balances and txs. On failure I **rollback** and show an **actionable** error.  
   **Follow-up:** Carefully = **pending ≠ completed**; don’t subtract twice; don’t celebrate wires before the API.

2. **Spoken:** No. Optimistic UI is **UX**, not a ledger. **Payment APIs should be idempotent.**  
   **Follow-up:** Timeout ≠ failure. Retry **same** key; don’t unlock into a **second** send.

3. **Spoken:** **Disable** while `isPending`. Generate **one** idempotency key **per confirm**, reuse on retry. Server **dedupes**. Lock without keys is **not** enough.

4. **Spoken:** Irreversible money, AML/limit failure likely, or the header **already** derives from pending. Then **pending-only** or **pessimistic** on the **available** figure.

5. **Spoken:** Success: **invalidate** (server list/balance replace the guess). Failure: **rollback** snapshot, still **invalidate** on settle, **actionable** error.

## Connections

1. RQ supplies **cancel, snapshot, setQueryData, rollback, invalidate**. This unit decides **pending vs settled**, **lock**, **keys**, **timeout**.
2. Persist is **disk across launches**. Optimistic fiction is **this request**. Don’t write it to AsyncStorage.
3. Txs/balances are **server state**. A Zustand copy **drifts** from the cache you roll back — two sources.
4. 401 → session handling ([auth-session](../29.%20auth-session/notes.md)). If you **retry the transfer** after re-auth, **keep the same idempotency key** so you don’t **double pay**.
5. Zustand list **wouldn’t** roll back with `setQueryData`. You’d patch **two** places, invalidate **one**, **ghost** pending forever.
