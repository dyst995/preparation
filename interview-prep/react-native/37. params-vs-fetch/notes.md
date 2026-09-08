# Params vs global / fetched state

## What you need to know

[Type-safe navigation](../36.%20type-safe-navigation/notes.md) typed **`route.params`**. This unit is **what is allowed in those fields**. [Taxonomy](../23.%20state-taxonomy/notes.md) already split **id vs document**. Here it becomes a **route rule**.

**Use route params for (preserve):**

- IDs (`transferId`, `accountId`)
- **Flow flags** for **this journey** (`fromQr: true`)
- **Small, serializable** handoff data

**Do not put in params (preserve):**

- Huge objects / **full API models** (stale risk)
- **Sensitive secrets**
- Data that **can change** while the screen is open (**prefer fetch by ID**)

Preserve:

> I pass identifiers and flow context as params, then fetch authoritative data on the screen with React Query. That avoids stale param objects and keeps deep links simple.

**Deep-link prefixes / security of URL values** are [§6](../04-navigation.md). This unit: **ids in the URL**, not **JSON wallets**.

---

## What a param is (and is not)

**Route params** are a **frozen snapshot** attached to **this screen in the back stack**. They do **not** subscribe to React Query. If the list screen passes `{ transfer: dto }` and a webhook **updates** the transfer, **Details still shows the old dto** until you **navigate again**.

**IDs** are **pointers**. The screen **owns the fetch**:

```ts
function TransferDetails({ route }: Props) {
  const { transferId, fromQr } = route.params;
  const { data } = useQuery({
    queryKey: transferKeys.detail(transferId),
    queryFn: () => api.getTransfer(transferId),
  });
  // fromQr: UX only (banner). data: authority.
}
```

**Global client state** (`selectedAccountId` in Zustand) is **not** “this journey.” It **survives** leaving the screen. A param **dies** when the screen **pops**. If **Wallet home and Transfer** must share “which account,” that’s **Zustand** (or a **parent** param you **thread**). Don’t copy the **account object** into **either**.

**Serializable:** params must survive **JSON** (state persistence, linking). **Functions, class instances, `Map`s** don’t belong. Prefer **string | number | boolean | small plain objects**.

---

## Why IDs + fetch (staleness)

| Put in params | What goes wrong |
| --- | --- |
| Full **tx / user / balance** DTO | **Stale** vs RQ; **two sources** ([derived-state](../32.%20derived-state/notes.md)) |
| **Balance** “so the header is instant” | User **sends money** on another tab; this screen **lies** |
| **Access token** / PAN | **Logs**, **deep links**, **screenshot** of nav state, **Intent** extras |
| Live **status** (`'pending'`) as the **only** truth | Status **changes on the server**; param **doesn’t** |

**While the screen is open:** refetch / invalidation **updates RQ**; **params stay**. That’s why **changing** fields **must not** live only in params.

**Placeholder:** you **may** pass a **title** for instant chrome **if** you still **fetch**. The **amount on Confirm** should still **come from** a **quote** query or **server preview**, not a **trusted** param the URL can **tamper**.

---

## Flow flags vs server truth

**`fromQr: true`** is **how they entered** this flow. The server didn’t invent it. It **belongs** in params (or a **tiny** machine in the stack). It is **not** a substitute for `transfer.status`.

**Handoff:** Amount screen → Confirm with `{ accountId, amountMinor, idempotencyKey }` can be **small** **if** Confirm **still** re-validates (limits, FX) via **API**. If you pass **only** `amountMinor` and **never** re-quote, a **stale** rate is a **product** bug. **Id + fetch** is the **safe default**; extra fields are **hints**.

**Don’t** put `fromQr` in Zustand **global** unless **many** screens need it **after** the flow. Journey context **rides the stack**.

---

## Deep links stay simple

`myapp://transfers/123` maps to `{ transferId: '123' }`. A link **cannot** honestly carry a **fresh** `Transfer` JSON (and **mustn’t** carry secrets). If Details **requires** a full object in params, **cold start from a notification** **breaks** — you have **no** object, only an **id**.

That’s the spoken **“keeps deep links simple.”** Next section is **how** linking is configured. **This** section is **why** the **param shape** is **`id`**.

---

## Common mistakes and misconceptions

- **`navigate('Details', { item })`** from a list “to skip a spinner.”
- **Typed** `User` in ParamList → “TS said it’s fine.”
- **Token in params** so the next screen can `fetch` without the API client.
- **Zustand `currentTransfer`** **and** params **and** RQ — **three** copies.
- Flow flag in a **global** store leftover after the flow **pops**.
- Assuming params **update** when RQ **invalidates**.

---

## Connections to other concepts

`param = pointer + journey flag → screen fetches document (RQ) → no second object`

- **[Type-safe nav](../36.%20type-safe-navigation/notes.md):** ParamList **`{ id: string }`**, not `{ tx: Transfer }`.
- **[Derived-state](../32.%20derived-state/notes.md):** `route.params.user` was **trap 3**.
- **[React Query](../27.%20react-query/notes.md):** **key includes the id** from params.
- **[Auth](../35.%20auth-flow-patterns/notes.md):** tokens **vault**, **never** params.
- Next: **linking** — those **ids** become **path segments**.

---

## Interview perspective

They want the **do / don’t lists** and the **spoken** paragraph. Follow-up: **stale** DTO; **deep link** only has an **id**; **Confirm amount**.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
