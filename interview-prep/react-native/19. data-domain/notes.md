# Data and domain boundaries

## What you need to know

[Feature layering](../15.%20feature-layering/notes.md) already says **`api/`** is the wire and **`model/`** is pure domain. This unit is **what crosses that line**: **DTOs vs the models the UI actually uses**, **where mapping lives**, **why money math stays pure**, and why one **god** `paymentsService.ts` is not an architecture.

**DTO (data transfer object):** the **JSON shape** the backend sends/accepts (`amt_cents`, `st: "PND"`, nested `user.profile.kyc_flg`). It is **not** your product language. It **changes** when the API versions.

**Domain / UI model:** names and types the **app** owns (`amountMinor`, `PaymentStatus.Pending`, `isEligible`). Screens and `computeFee` speak **this**. Formatting for display (`"12.50 GEL"`) is a **pure helper** on the domain, not a third copy of `amt_cents / 100` in JSX.

**Example rule (preserve):**

- `api/` returns a **typed DTO**
- `model/mappers.ts` converts to **domain / UI model**
- **Screens never** do ad-hoc field renaming everywhere

This is **critical in fintech**: **balances**, **statuses**, **payment states**. A missed mapper is a **wrong amount** or a **wrong state machine**, not a cosmetic rename.

This unit is **boundary mapping**. HTTP client, interceptors, and refresh races are [05-networking.md](../05-networking.md). Don’t recite Axios if you can’t explain **why ConfirmScreen must not read `dto.amt_cents`**.

---

## Why the wire is not the app

Backends optimize for **storage and compatibility**: snake_case, codes, optional fields, **string amounts**, **floats**, **inconsistent enums** across endpoints. The UI needs **one** meaning of “pending payment” and **integer minor units**.

If screens bind to DTOs:

- An API rename (`amt_cents` → `amount_minor`) **breaks every screen**
- Wallet and payments **disagree** on status (`"PND"` vs `"pending"`)
- You **cannot unit-test** “is this payable?” without a JSON fixture that looks like production

The **mapper is the anti-corruption layer**: one place that **admits** the wire is messy.

```ts
// api/types.ts — DTO (wire)
export type PaymentDto = {
  amt_cents: number;
  st: string; // 'PND' | 'OK' | 'FAIL' | ...
};

// model/types.ts — domain
export type PaymentStatus = 'pending' | 'completed' | 'failed';
export type Payment = { amountMinor: number; status: PaymentStatus };

// model/mappers.ts
export function paymentFromDto(dto: PaymentDto): Payment {
  return {
    amountMinor: dto.amt_cents,
    status: statusFromWire(dto.st),
  };
}
```

```ts
// api/getPayment.ts — returns DTO, does not format money
export async function getPaymentDto(id: string): Promise<PaymentDto> {
  return http.get(`/payments/${id}`);
}
```

```ts
// hooks/usePayment.ts
const { data: dto } = useQuery({ queryKey: ['payment', id], queryFn: () => getPaymentDto(id) });
const payment = dto ? paymentFromDto(dto) : undefined;
```

Screens receive **`Payment`**, never `PaymentDto`.

---

## Mapping lives at the boundary — not in JSX

**Ad-hoc renaming** is the failure mode:

```tsx
// Three screens, three slightly different interpretations
<Text>{(route.params.amt_cents / 100).toFixed(2)}</Text>
<Text>{dto.amount / 100}</Text>
<Text>{item.amtCents}</Text>
```

A backend that starts sending **minor units as strings**, or a **currency exponent** that isn’t 2, will **silently** show the wrong balance in **one** of those three.

**Adapters / mappers:**

- **Inbound:** DTO → domain (reads, list items, webhooks if you parse them)
- **Outbound:** domain → request DTO (create payment body)
- **Lists:** `items.map(paymentFromDto)` in **one** function, not in `renderItem`

**Zod (or similar) at the boundary** is optional but senior-friendly: parse DTO **before** mapping so a missing `amt_cents` **fails loudly** in `api/`/`mappers`, not as `NaN` in a Text node.

**Do not** map **feature** shapes inside a **global** axios interceptor. That recreates a **god** client that knows every product type. Shared HTTP returns **unknown JSON** or a **generic** envelope; **feature `api/`** types the DTO.

---

## Money and calculations stay pure (and tested)

**Domain math** (`computeFee`, `canSubmit`, `remainingLimit`) takes **domain numbers**, returns **domain numbers**. No `fetch`, no `Platform`, no `format` that needs i18n in the same function as the **rule** (split **formatMinor** vs **computeFee** if locale is involved).

**Fintech default:** store and compute in **integer minor units** (`1250` = 12.50 in a 2-decimal currency). **IEEE floats** (`0.1 + 0.2`) are an interview trap for **money**.

```ts
// model/fees.ts — unit-test in Node
export function computeFee(amountMinor: number, bps: number): number {
  return Math.round((amountMinor * bps) / 10000);
}
```

Statuses are a **state machine** in `model/` (`canCancel(status)`), not `if (dto.st === 'PND' || dto.st === 'pending')` in two screens.

---

## God API files

A **god service** is `api/payments.ts` (or `services/PaymentService.ts`) that:

- Calls HTTP
- Maps *and* formats *and* computes fees
- Shows toasts
- Owns React Query keys **and** navigation

That file cannot be tested without RN, and a DTO change **touches** UI side effects.

**Split:** `api/` = transport + DTO types. `model/` = map + math + status. `hooks/` = query + toast/nav **from results**. Same DAG as layering: **model does not import api fetch**; it **accepts DTOs** in mappers (types only) or you keep DTO types next to `api/` and mappers import **types**.

---

## How a backend change should feel

| Change | Touches | Smell if it also edits |
| --- | --- | --- |
| JSON field rename | **DTO type + mapper** | Every screen |
| New payment state | **statusFromWire + model state machine** | Random `=== 'X'` in UI |
| Fee formula | **`model/fees.ts` tests** | `getPayment.ts` |
| Timeout / header | **shared http** | `mappers.ts` |

---

## Common mistakes and misconceptions

- **“TypeScript DTO *is* the domain.”** Same fields, still **wire names** and **wire enums** leaking.
- **Mapping in the screen “just this once.”** The third screen **will** copy it wrong.
- **`parseFloat` amounts** from JSON strings in JSX.
- **God `*Service`** that is the whole backend of the feature.
- Mapping in a **global** interceptor for every endpoint.
- Putting **formatted strings** in the domain as the **only** amount (you lose the ability to **add** fees safely — keep **minor units**, format at the edge).
- Answering with **React Query cache keys** when they asked **DTO vs model**.

---

## Connections to other concepts

`api (DTO) → mapper (boundary) → domain (pure) → hooks/screens (display)`

- **[Feature layering](../15.%20feature-layering/notes.md):** this unit **fills** `api/` vs `model/` with **mapping discipline**.
- **[05-networking.md](../05-networking.md):** client, 401, pagination — **after** you know **what type** the feature `api/` returns.
- **[Platform soup](../8.%20platform-specific/notes.md):** `model/` still has **no** `Platform.OS`.
- **[Design system](../18.%20design-system/notes.md):** formatters/tokens are **display**; they must not **replace** minor-unit domain.
- **[State](../03-state-management.md):** React Query holds **server** data; still **map** before UI. Don’t store raw DTOs in global store **as** the product model if you can avoid it.

---

## Interview perspective

Draw **wire → mapper → domain → screen**. Say **one** mapper, **integer money**, **status enum**, **no god service**. Fintech example: **balance** or **payment state**.

Spoken (30–60s):

> The API’s JSON is a DTO — field names and codes the backend owns. The app has a domain model: minor units, a real status enum. api/ returns the DTO; mappers convert once; screens never rename amt_cents in three places. Fee and eligibility stay pure functions I can test without rendering. I don’t dump mapping, toasts, and HTTP into one service file — that’s how a backend rename becomes a UI bug in production.

If they ask lists: **map in one function**, `renderItem` already gets domain. If they ask floats: **minor units**, `Math.round`, don’t add dollars as `number` floats.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
