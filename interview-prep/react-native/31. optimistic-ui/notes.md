# Optimistic UI design

## What you need to know

[React Query](../27.%20react-query/notes.md) taught **how** to patch the cache (`onMutate` → snapshot → rollback → invalidate on settle). This unit is **when** to be optimistic, **how far**, and **what still belongs on the server** — especially **send money**.

**Curriculum sequence (preserve):**

1. User confirms transfer
2. Disable submit / show pending row
3. Optimistically deduct available balance in cache (**carefully**)
4. Send mutation
5. Success: invalidate balances + transactions
6. Failure: rollback + show **actionable** error

**Risks (preserve):**

- Over-optimistic updates on **irreversible** financial actions
- **Double spend UI** if the button is not locked
- **Server-side idempotency** still required

Preserve:

> Optimistic UI is a UX tool, not a source of truth. The server remains authoritative, and payment APIs should be idempotent.

**Derived-state traps** (copying RQ into Zustand) are next. This unit is **mutation UX**, not duplication.

---

## What it is (and is not)

**Optimistic UI:** update the **client cache / screen** as if the mutation **already succeeded** (or at least **started**), **then** wait for the network. The user is not staring at a spinner on a blank wallet.

**Pessimistic UI:** keep the old screen until the server answers. Safer for **irreversible** money; slower-feeling.

**It is not:**

- A **second ledger**. Cache fiction dies on invalidate/rollback.
- **Persistence.** [Persist](../30.%20persistence/notes.md) is **across launches**. Optimistic is **this session’s cache** during a request.
- **Proof the money moved.** Only the **payment API** is.

**Why it exists:** perceived latency. Radios are slow; wallets feel **dead** if every tap waits 800ms. Interviewers still want you to **refuse** “instant Sent ✓” on a **wire**.

---

## Pending row ≠ completed transfer

The curriculum says **pending row**, not **success toast**. That is the **careful** half of step 3.

| UI | What the user infers | When it is OK |
| --- | --- | --- |
| **Pending** row (`status: 'pending'`) | “We **accepted** the tap; bank/ledger **not** confirmed” | Almost always, **after** confirm |
| **Completed** row + **deducted available** as **final** | “The money **left**” | Only if product accepts a **visible lie** until rollback |
| **Success** screen / haptic / “Sent” | **Irreversible** story | **After** 2xx (or known **async** “accepted” from **your** API) |

**Mental model:** optimism on **intent** (button lock + pending) is cheap. Optimism on **settlement** (available balance as **truth**) is where fintech **over-promises**.

**“Carefully” on available balance:**

- **Available** ≠ **ledger**. A pending outbound is often a **hold**, not a booked debit. If the list **and** the header **both** subtract the amount, you **double-count**.
- Don’t deduct if the screen already **derives** remaining from `balance − pending`. Patch **one** place (usually **insert pending tx**), then **invalidate** for truth.
- Don’t optimistic-complete a payment that can still fail **AML / insufficient / limit**. Show pending; **don’t** celebrate.

```ts
// Safer: pending in the list. Header still from server until invalidate.
onMutate: async (draft) => {
  await queryClient.cancelQueries({ queryKey: walletKeys.transactions(id) });
  const previous = queryClient.getQueryData(walletKeys.transactions(id));
  queryClient.setQueryData(walletKeys.transactions(id), (old) => [
    { ...draft, status: 'pending', clientId: draft.idempotencyKey },
    ...(old ?? []),
  ]);
  return { previous };
};
```

Patching **balances** in the same `onMutate` is the **aggressive** path. If you do it: **snapshot both keys**, rollback **both**, still **invalidate `walletKeys.all`** on settle so the **server** wins.

---

## Button lock vs idempotency (two different bugs)

**Double spend UI:** user double-taps Confirm → **two** `mutate()` calls → two POSTs → two transfers **if the API is not idempotent**.

**Lock** (`disabled={isPending}`, ignore second press, maybe a **local** `inFlight` flag) stops **the obvious** double tap. It does **not** survive:

- **Timeout then retry** (client never saw 201; server **did**)
- **Process death** mid-flight
- **Two devices**
- **Pull-to-refresh** while the first POST is in flight (less common, still messy)

So: **UI lock is necessary and insufficient.** The **payment API** needs an **idempotency key** (header or body) the server **dedupes**. Client generates it **once per user confirm**, **retries with the same key**, never **mint a new key** on “retry this request.”

```ts
const keyRef = useRef<string | null>(null);

function onConfirm(payload: TransferInput) {
  if (isPending) return; // lock
  keyRef.current ??= crypto.randomUUID();
  mutate({ ...payload, idempotencyKey: keyRef.current });
}
```

On **true** new confirm (user came back and sent **again**), mint a **new** key. Same screen, **same tap**, **same key**.

**RQ `onMutate` cancel** is about **in-flight GETs overwriting** the optimistic list — not about **two POSTs**. Don’t confuse **cancelQueries** with **idempotency**.

---

## Success, failure, and who is right

**Success:** invalidate **balances + transactions** (factory prefix `walletKeys.all`). The optimistic row was a **placeholder**. Server list/balance **replace** it. Don’t **leave** the fake pending forever because “invalidate is slow.”

**Failure:** rollback the **snapshot**, then still **invalidate** (curriculum + RQ **onSettled**) so you don’t display a **half-patched** wallet. Show an **actionable** error: insufficient funds, limit, beneficiary, **already processed** (idempotent replay — **not** a failure to the ledger, maybe **success** to the UI).

**Timeout:** worst case. UI must **not** assume failure (don’t **re-enable** and let them **send again** with a **new** key). Prefer: stay pending, **poll / refetch**, or “we’re checking” — **same** idempotency key if you retry the POST.

**Server remains authoritative** means: after settle, **cache == last GET**, not “whatever we invented in `onMutate`.”

---

## When not to be optimistic (over-optimistic)

Cheap, **reversible** actions (like, save draft, reorder a **non-money** list): full optimistic patch is fine.

**Irreversible financial:** wire, bill pay, crypto send, card pay. Prefer:

1. Confirm sheet (already in the curriculum)
2. **Lock** + **pending**
3. **No** “Sent ✓” until the API says so
4. Optional: **don’t** move **available** until invalidate

If the API is **async** (“accepted, we’ll settle later”), the **honest** optimistic state is **pending**, not **completed**. Treating **202 Accepted** as **settled** is over-optimistic.

---

## How it appears in RQ (link, don’t re-learn)

The mechanics live in [React Query](../27.%20react-query/notes.md):

`cancelQueries` → `getQueryData` snapshot → `setQueryData` → `onError` restore → `onSettled` invalidate.

This unit adds **product** on top: **pending vs completed**, **one** deduction path, **button lock**, **idempotency key**, **actionable** errors, **timeout ≠ fail**.

Don’t copy the tx list into Zustand “so optimistic is easier.” Patch **the cache** that **screens already read**.

---

## Common mistakes and misconceptions

- **Optimistic cache = source of truth.** It’s a **guess** until invalidate.
- **Pending row** vs **completed** — celebrating **settlement** too early.
- **Deducting available and** inserting a pending tx that the header **also** subtracts → **double debit UI**.
- **Button lock** treated as **idempotency**.
- **New UUID on retry** after timeout → **double send**.
- **`onSuccess` only** — no rollback, stuck pending / wrong balance.
- **Timeout → show error and unlock** → user confirms **again**.
- Optimistic **likes** pattern copied onto **transfers**.
- This is **persistence** (it is not).

---

## Connections to other concepts

`confirm → lock + pending → (careful cache) → mutate → settle (invalidate / rollback) → server wins`

- **[React Query](../27.%20react-query/notes.md):** **how** snapshot/rollback/settle. This unit: **how far** on money.
- **[Persistence](../30.%20persistence/notes.md):** disk **across launches**. Don’t persist the **optimistic** fiction.
- **[State taxonomy](../23.%20state-taxonomy/notes.md):** balances/txs stay **server state**; pending is still **cache**, not a Zustand ledger.
- **[Auth session](../29.%20auth-session/notes.md):** 401 mid-transfer — **don’t** invent a second send; **session** reset + **same** idempotency story if you retry.
- **Networking / APIs:** **Idempotency-Key** is an **HTTP** contract; the client **must** hold the key.

---

## Interview perspective

They want the **six steps**, the **three risks**, and the **nuance** in one breath. Follow-ups: **why carefully**, **lock vs idempotency**, **timeout**.

Spoken answer **is** the unit. Add one sentence: **pending ≠ settled**; **same key on retry**.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
