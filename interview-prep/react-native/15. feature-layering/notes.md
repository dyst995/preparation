# Layering inside a feature

## What you need to know

[Feature-based folders](../14.%20type-vs-feature/notes.md) put **payments** in one tree. That is **not** enough. If `features/payments/` is a 4k-line soup — screens fetching HTTP, fee math in JSX, `NativeModules` in a validator — you still have a **god feature**. Interviewers ask **what can import what inside the slice**.

**Layering** splits the feature by **concern**, then **dependency direction** makes that split real: a folder that **must not** know about another folder **does not import it**.

```text
features/payments/
  ui/           # presentational components
  screens/      # route-level composition
  hooks/        # view-model-ish hooks
  model/        # types, validators, pure domain helpers
  api/          # REST/React Query endpoints
  native/       # feature-specific native wrappers (if needed)
  index.ts      # export only what other features may use
```

**Import direction** (arrows = “imports / depends on”):

```text
screens → hooks → api/model
screens → ui          # ui is presentational; screens/hooks use it
features → shared     # shared must not import features
features ↛ other features’ internals
```

Cross-feature talk, in order:

1. Import the other feature’s **public** `index.ts` only
2. Lift **shared contracts** into `shared/`
3. **Navigation params** (or rare app-level events) — **don’t** start with a global event bus

This unit is **inner layers + arrows + those three options**. **App shell**, **auth vs app stacks**, **design-system extraction**, and **DTO vs domain in depth** are later sections of [02-architecture.md](../02-architecture.md).

---

## Why layers exist inside an already-cohesive feature

A feature is a **capability boundary**. Layers are **test and change boundaries** inside it.

| Layer | What it is | Why it exists |
| --- | --- | --- |
| **`screens/`** | Route-level composition: wire navigator params, hooks, and UI | One place that knows “this is a screen.” Swap layout without rewriting fee rules. |
| **`ui/`** | Presentational: props in, RN views out | Reuse a row on two screens; snapshot-test without a navigator or API. |
| **`hooks/`** | View-model-ish: hold query/mutation, map to view state, call model | Screens stay thin; fetching isn’t copied into three screens. |
| **`model/`** | Types, validators, **pure** domain (fees, eligibility, status) | Test without rendering; **no** `Platform.OS`, no `fetch`, no native. |
| **`api/`** | HTTP / React Query functions, DTO types from the wire | Network is a **boundary**. Screens should not sprinkle `fetch` and rename fields ad hoc. |
| **`native/`** | Thin wrappers around this feature’s native APIs | Biometrics, scanner, SDK — not `NativeModules` inside `calculateFee`. |
| **`index.ts`** | Public exports | Other features/`app` never reach `model/fees.ts` unless you **chose** to export it. |

Feature-based without this: you **moved** the junk drawer **into** `features/payments/`.

---

## What each folder may do (and must not)

### `screens/` — composition, not business rules

A screen **composes**. It reads route params, calls hooks, passes props into `ui/`. It should not contain fee formulas, raw `axios` calls, or 200 lines of layout that belong in `ui/`.

```tsx
// screens/ConfirmPaymentScreen.tsx
export function ConfirmPaymentScreen() {
  const { amount } = useRoute().params;
  const { fee, submit, isPending } = useConfirmPayment(amount);
  return (
    <ConfirmPaymentView amount={amount} fee={fee} onConfirm={submit} loading={isPending} />
  );
}
```

### `ui/` — presentational

No React Query, no navigation object, no domain formulas. If it needs a fee, it **receives** `fee: string`. That keeps `ui` importable from screens **without** pulling the data layer.

**`ui` does not import `screens/`.** A presentational row must not know it lives on `ConfirmPaymentScreen`. **`ui` typically does not import feature `hooks/`** — if it does, it stopped being presentational.

### `hooks/` — view-model

Hooks **orchestrate**: call `api`, run `model` functions, expose `{ data, error, isPending, onSubmit }`. They are the right place for “when the mutation succeeds, go back” **if** you inject navigation — or the screen can call `navigation.goBack()` from the hook’s result. Don’t put **pure** fee math in the hook if it can live in `model/` (harder to test, easier to duplicate).

### `model/` — pure domain

```ts
// model/fees.ts — no Platform, no fetch, no NativeModules
export function computeFee(amountMinor: number, scheme: FeeScheme): number {
  return Math.round(amountMinor * scheme.rateBps) / 10000;
}
```

You can unit-test this in Node. If `computeFee` imports `Platform` or `api`, the layer **lied**.

DTO → domain mapping belongs **at this boundary** (often `model/mappers.ts`): `api/` returns the wire shape; **screens do not** rename `amt_cents` in three files. Full DTO vs UI-model treatment is [§7](../02-architecture.md) — here you only need: **mapping is not JSX**.

### `api/` — wire, not screens

Query keys, `fetch`/`apiClient`, typed responses. A “god” `paymentsService.ts` that also formats money and shows toasts is **layer collapse**. Toasts and formatting are hooks/ui/model.

### `native/` — optional edge

Only if **this** feature needs a native API. App-wide modules can live under `shared` or a thin `src/native/` later. Feature `native/` is **wrappers**, not business rules that happen to call Swift.

---

## Dependency direction is the rule that makes layers real

Folders are documentation. **Imports** are the architecture.

```text
screens → hooks → api/model
screens → ui
features → shared
```

Read it as a **DAG**:

- **Lower** layers (`model`, `api`, `native` wrappers) must not import **screens** or **ui**.
- **`model`** should not import **`api`** (domain does not know HTTP). If a mapper needs a DTO type, the DTO type can live next to `api/` and the mapper imports **types**, or you share a types file — still no `fetch` in `model/`.
- **`shared`** must not import **`features`**. That inversion recreates a junk drawer that **depends on** product slices.
- Features do not import **other features’ internals** (`../../wallet/model/helpers`).

**Why arrows point this way:** UI and routes change often; domain rules and wire contracts should stay **testable and stable**. If `model` imported a screen, you could not test fees without a navigator. If `shared` imported `features/payments`, every “primitive” secretly dragged payments.

**Cycles** (`hooks` → `screens` → `hooks`, or payments `index` → wallet internals → payments) show up as Metro/runtime circular-init bugs and “I can’t move this file.” `madge` / lint boundaries catch them; the **design** is still “don’t create the cycle.”

```ts
// Allowed
import { computeFee } from '../model/fees';
import { useConfirmPayment } from '../hooks/useConfirmPayment';
import { Button } from '@shared/ui/Button';
import { WalletBalance } from '@features/wallet'; // public API

// Forbidden (direction / public API)
import { ConfirmPaymentScreen } from '../screens/ConfirmPaymentScreen'; // from model or ui
import { computeFee } from '../../wallet/model/fees'; // internals
import { usePayments } from '@features/payments/hooks/useConfirmPayment'; // skipped index
```

---

## Cross-feature communication (three options, in order)

Features **will** collaborate (wallet opens payments). The failure mode is a **mesh of internals**.

**1. Public `index.ts` only**

```ts
// features/payments/index.ts
export { PaymentsNavigator } from './screens/PaymentsNavigator';
export { formatPaymentStatus } from './model/status';
```

Wallet does `import { formatPaymentStatus } from '@features/payments'`. Payments can rename `model/status.ts`. If **every** helper gets exported, `index.ts` is a lie — you have no internals.

**2. Lift shared contracts into `shared/`**

If **wallet and payments** both need the same `Money` type or `formatMinor`, that type/helper is not “payments.” Put it in `shared/lib/money` (or similar). **Do not** leave it in payments and deep-import it; **do not** duplicate it.

**3. Navigation params / careful app events**

Flow state that is **this navigation** (“amount on Confirm”) belongs in **route params**, not a global store “for architecture.” App-level events are for rare, true cross-cutting signals — **not** a default event bus that replaces imports. An event bus is **implicit coupling**: no type-safe graph, hard to debug, easy to fan-out bugs.

State libraries (React Query, Zustand) **plug into hooks/api**; they are not a fourth communication style that excuses deep imports.

---

## How it appears when you predict a change

| Change | Should live in | Smell if it also edits |
| --- | --- | --- |
| Fee formula | `model/` | `ui/` JSX, `api/` URL |
| Endpoint / DTO field | `api/` (+ mapper) | Every screen renaming JSON |
| Button padding on confirm | `ui/` | `model/fees.ts` |
| New native scanner | `native/` + a hook | `model/` |
| Wallet showing payment status | payments **`index.ts`** export, or `shared/` | `payments/model/fees.ts` from wallet |

---

## Common mistakes and misconceptions

- **“We’re feature-based, so layers don’t matter.”** God feature. Same crash as type-based soup, smaller radius.
- **`ui/` that fetches.** It’s a screen in disguise; you can’t reuse it.
- **`model/` that uses `Platform.OS` or `NativeModules`.** Domain is no longer portable or honestly testable.
- **Screens that `fetch` and compute fees.** Hooks/model exist so you don’t copy that into the next screen.
- **Exporting the whole folder from `index.ts`.** Public API with no interior.
- **Circular features** via internals, then “we’ll add an event bus.” That’s hiding the cycle, not fixing direction.
- **`shared/` importing a feature** to “reuse a screen.” Invert: lift a primitive, or import the feature’s **public** navigator.
- Answering with **Redux** when they asked **dependency direction**.

---

## Connections to other concepts

`feature folder (cohesion) → inner layers (this) → import DAG → public API / shared / params`

- **[Type vs feature](../14.%20type-vs-feature/notes.md):** outer map. This unit is **roles nested inside** the capability — not a return to top-level `hooks/`.
- **[Why architecture](../13.%20why-architecture/notes.md):** UI / domain / native **at folder level**; blast radius **inside** the feature too.
- **[Platform-specific](../8.%20platform-specific/notes.md):** OS branches in **ui/native**, never `model/`.
- **[§4 App shell](../02-architecture.md):** `app/` composes providers and **imports feature public navigators**; it does not own `ConfirmPaymentScreen`.
- **[§6 Shared UI](../02-architecture.md):** generic Button vs feature `ui/` composite — extraction **threshold**, not this DAG.
- **[§7 Data/domain](../02-architecture.md):** DTO vs mapper vs screen renaming — **deepens** `api/` vs `model/`.
- **Turbo Modules / native:** live behind **`native/`** (or shared native), consumed by hooks — not sprinkled in `model/`.

---

## Interview perspective

Draw **one feature** on the whiteboard: seven entries, then the **arrows**. Say what **must not** import what. Then the **three** cross-feature options, with event bus as a **last** resort.

Spoken (30–60s):

> Feature-based only groups the capability. Inside payments I still split screens, presentational UI, view-model hooks, pure model, api, and native wrappers. Screens depend on hooks and UI; hooks depend on api and model; model stays pure. Other features import our index, not our internals. If two features need the same contract, it goes to shared. Flow state goes in navigation params. I don’t use a global event bus as the architecture.

If they ask “how do features communicate?”: those three bullets, **in order**. If they ask “where does fee math live?”: `model/`, unit-tested, no Platform.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
