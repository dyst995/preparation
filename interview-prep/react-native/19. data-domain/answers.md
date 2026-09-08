# Data and domain boundaries — Answers

## Core recall

1. **DTO:** backend JSON shape. **Domain/UI model:** app-owned names/types (minor units, enums) screens and math use.
2. **`api/` returns typed DTO**; **`model/mappers.ts`** converts to domain/UI model; **screens never** ad-hoc-rename wire fields everywhere.
3. **`model/mappers.ts`** (or equivalent at the **api/model** boundary), called from **hooks** (or api wrappers that still keep DTO types explicit).
4. **Rename / interpret wire fields** (`amt_cents`, `st`) in JSX or per-screen helpers.
5. **Balances**, **statuses**, **payment states**.
6. **Math/status/eligibility:** `model/`. **HTTP + DTO types:** `api/`.
7. One file that **fetches, maps, formats, computes, toasts, navigates**.
8. **In:** DTO → domain. **Out:** domain/draft → request DTO.
9. **No** — that makes a **god client** that knows every product type. Shared HTTP stays generic; **feature api** types DTOs.
10. **Integer minor units** (then format at the display edge).

## Explain why

1. Wire names/codes/optional fields **optimize for the server**, not product meaning; they **churn**.
2. You must find **every** copy. One screen **misses** the rename → **wrong amount** in production.
3. One mapping = one **status/amount** interpretation. `renderItem` mapping **forks** silently.
4. Then you **unit-test** without RN/network; OS doesn’t fork **fees**.
5. Binary floats **don’t represent** many decimals; money **adds** error. Use integers + rounding rules.
6. You **can’t add** fees/limits safely on strings; rounding lives in the **wrong** layer.
7. You can **type** `amt_cents` and still leak **wire language** everywhere. Domain is **different names and invariants**.
8. Codes **vary by endpoint**. A **single** enum + mapper is the state machine; JSX `=== 'PND'` **duplicates** and **misses** aliases.
9. A field rename touches **HTTP, UI, and math** in one blob; tests need the **whole** runtime.
10. Fail in **parse/map** (log, error UI) instead of drawing **NaN**. Boundary is where **shape** is guaranteed.

## Compare and contrast

1. **Dto:** `amt_cents`, `st: string`. **Payment:** `amountMinor`, `status: 'pending' | …`.
2. **api:** DTO. **mapper:** convert. **hook:** fetch + map, expose domain. **screen:** `Payment` props only.
3. **computeFee:** **number in, number out** (policy). **formatMinor:** **string** for humans (locale).
4. God file **mixes** layers. Split: transport | pure+map | orchestration.
5. Feature mapper **knows one** slice. Interceptor mapping **couples** the client to **all** products.
6. Domain: `canCancel(status)`, UI color from **enum**. `dto.st` in Button **is** the leak.
7. Layering: **folders + arrows**. This unit: **what types** flow across `api` → `model`.
8. Networking: **how** you call (auth, retry). This: **what** you **call the payload**.

## Predict the output

1. Screens that still use `amt_cents` **break or NaN**; mapped screens **work** if the mapper was updated. **Uneven** balances — the ad-hoc problem.
2. **Rounding/representation bugs** (0.19 * x). Use **minor units** + **integer** `bps` math + `Math.round`.
3. **Wire status `st` leaked** into UI. Domain should already be `'pending'` (or a label helper on the enum).
4. **God interceptor** / conflicting shapes. Transfers’ DTO **doesn’t fit** `Payment`; hacks or `any`.
5. **God api.** Tests need toasts/RN; fee tests **hit** network. Split layers.
6. **Unit mismatch:** mapper converted to **major** units; `computeFee` still treats values as **minor** (or the reverse) → **100×** fee/balance errors.

## Debugging

1. **Two interpretations of `st`** (ad-hoc strings vs mapper). One **statusFromWire**, both screens use **domain enum**.
2. **Params are a second DTO.** Pass **id**, fetch+map; or pass **already mapped** domain (still not `amt_cents` as the product).
3. **model imported fetch** — not pure; can’t test fees in Node honestly. Mapper types only; **hooks/api** call HTTP.
4. **Lift** a **shared** status enum **if** it’s the same language; else **per-feature** DTO + mapper. Don’t silently **diverge** unions.
5. **DTO parse** at boundary (schema). Missing/renamed field should **error the query**, not `Text`.
6. **Format in api** — you’ve thrown away **minor units**. Return DTO → map to `{ amountMinor }` → **format in UI/helper**.

## Application

1. DTO `{ amt_cents, st }`; Payment `{ amountMinor, status }`; map `st` via `statusFromWire`.
2. `Math.round((amountMinor * bps) / 10000)`.
3. `queryFn: getPaymentDto` → `paymentFromDto` → `<ConfirmView payment={payment} />`.
4. Form/domain: `amountMinor`, `payeeId`. Wire body: whatever the API names (`amt_cents`, `payee_id`).
5. **Screens must not read/rename DTO fields** (use domain after mapper).
6. **api:** get/post + DTO. **model:** mappers, fees, status. **hooks:** useQuery, toast, nav.

## Interview questions

1. **Spoken:** api returns typed DTOs; mappers to domain; screens only see domain. A rename **updates DTO + mapper**, not twenty JSX sites.  
   **Follow-up:** Miss a screen → **wrong balance** in one flow only — that’s why one mapper.

2. **Spoken:** Integer **minor units** in domain; **pure** calculate/round; **format** at the edge. No float money; no `/ 100` in three screens.

3. **Spoken:** DTO = wire. Domain = product types. Mappers at **`model/mappers.ts`**, used by hooks. Not in screens, not in a global interceptor for all features.

4. **Spoken:** HTTP/DTO in `api/`; map+math in `model/`; toasts/queries in **hooks**. God service mixes them so every backend tweak is a UI change.

5. **Spoken:** Map wire codes to a **small enum**; **state machine** in model (`canCancel`). UI switches on **enum**, not raw `PND`.

## Connections

1. Layering **named** the folders. This unit **forbids DTO in screens** and **requires** mappers + pure money.
2. Money/status are **domain**; OS is **ui/native**. Same purity rule.
3. `queryFn` can return **DTO**; hook **maps** (curriculum). Or a thin api wrapper maps — but **types** at the boundary stay explicit. Don’t skip mapping because “React Query cached it.”
4. `formatMinor` may live next to tokens/i18n; it **consumes** `amountMinor`. It does not **become** the ledger.
5. You **don’t** let another system’s **shape** become yours — whether that’s **wallet internals** or **backend JSON**. Mapper = **public contract** with the wire.
