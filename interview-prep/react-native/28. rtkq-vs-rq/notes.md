# RTK Query vs React Query

## What you need to know

[React Query](../27.%20react-query/notes.md) is **cached server state**. **RTK Query (RTKQ)** is the **same job** living **inside Redux**. Interviewers are scoring **ecosystem fit**, not “which cache is more senior.”

Preserve the table:

| Dimension | React Query | RTK Query |
| --- | --- | --- |
| Best with | Any store (Zustand/Context/none) | Natural with Redux |
| Boilerplate | Low–medium | Medium, codegen-ish **endpoints** |
| Cache tools | Excellent | Excellent **inside Redux** |
| Learning curve | Query-focused | **Redux + RQ concepts** |
| Your CV | React Query + Zustand | RTK Query on **Wizer** |

Preserve:

> I’ve used both. React Query pairs cleanly with Zustand. RTK Query is a strong choice when Redux is already the app backbone. Functionally both solve server-state caching; ecosystem fit matters.

**Do not** run **both** caches for the **same** balances. **Do not** add Redux to EasyPay **only** to use RTKQ. **Do not** rewrite Wizer to RQ in week one.

This unit is **which wrapper**. `staleTime` mechanics stay in the RQ notes; **auth persistence** is the **next** section.

---

## Same problem, different bus

Both give you: **deduped fetches**, **cache**, **invalidation after mutations**, **hooks** (`useGetXQuery` / `useQuery`).

| | React Query | RTK Query |
| --- | --- | --- |
| **Cache host** | `QueryClient` (Context) | A **Redux slice** (API reducer) |
| **Identity** | **Query keys** / factories | **Endpoints** + **cache tags** |
| **Client UI** | Zustand (or nothing) | **Same Redux store** for **client slices** + API |
| **When it shines** | No Redux / don’t want it | Store **already** exists; **one** DevTools tree |

**Learning curve:** RTKQ is **RQ ideas** (fresh vs cached, invalidate) **plus** `createApi`, `injectEndpoints`, **tagTypes**, `invalidatesTags`. You already paid for [RTK](../26.%20redux-toolkit/notes.md).

```ts
// RQ — key factory
useQuery({ queryKey: walletKeys.balances(), queryFn: fetchBalances });

// RTKQ — endpoint (sketch)
// createApi({ endpoints: (b) => ({ getBalances: b.query({ query: () => '/balances', providesTags: ['Wallet'] }) }) })
// useGetBalancesQuery()
```

**Invalidation:** RQ `invalidateQueries({ queryKey: walletKeys.all })`. RTKQ mutation `invalidatesTags: ['Wallet']` — **same intent**, **tag** instead of **prefix key**.

---

## CV: EasyPay vs Wizer

**EasyPay (green-field):** **no** Redux backbone → **RQ + Zustand**. Adding RTKQ would **force** `configureStore` for **fashion**.

**Wizer (owned legacy):** Redux **already** the backbone → **RTKQ** is the **natural** server cache. [Playbook](../21.%20legacy-modernization/notes.md): **don’t** big-bang the cache. New endpoints can stay **RTKQ**; don’t **also** `useQuery` the **same** URL.

If they ask “which is better?”: **wrong question**. **What’s already in the repo?**

---

## Boilerplate and “codegen-ish”

RQ: **`useQuery` + `queryFn` + keys** — flexible, a bit of **string/key** discipline.

RTKQ: **`createApi`** lists **endpoints** in one place (feels like **OpenAPI** / codegen even when **hand-written**). More **up-front** files; **hooks are generated**. That’s the **medium** boilerplate row.

Neither replaces [DTO mappers](../19.%20data-domain/notes.md). `transformResponse` / `select` still map **wire → domain**.

---

## Common mistakes and misconceptions

- **“RTKQ is Redux for API lists”** as in **hand-written thunks**. RTKQ **is** the cache; **don’t** **also** `createAsyncThunk` the **same** GET.
- **Two caches** (RQ + RTKQ) for **one** resource → **golden-rule** drift.
- **Migrating Wizer to RQ** to match EasyPay on your CV.
- **Installing Redux** on a Zustand app **just** for RTKQ.
- Reciting **staleTime** for 10 minutes when they asked **vs RTKQ**.
- Treating RTKQ as **client** onboarding wizard state — that’s **slices**, not endpoints.

---

## Connections to other concepts

`server state → pick ONE cache: RQ (QueryClient) or RTKQ (Redux) → client UI stays Zustand or slices`

- **[RQ](../27.%20react-query/notes.md):** **how** keys/stale/optimistic work — **same story** in RTKQ with **tags**.
- **[RTK](../26.%20redux-toolkit/notes.md):** **client** slices vs **API slice**; don’t stuff GETs into **hand** reducers.
- **[Zustand](../25.%20zustand/notes.md):** pairs with **RQ**; with RTKQ you **might** still use Zustand, but **usually** you’re **already in Redux**.
- **[Taxonomy](../23.%20state-taxonomy/notes.md):** **both** tools are the **server** row.

---

## Interview perspective

They want the **sketch** + **one CV sentence** each.

If they probe invalidation: **keys vs tags**, **one** cache. If they probe rewrite: **complexity / fashion** from the RTK unit.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
