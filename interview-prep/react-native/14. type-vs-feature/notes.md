# Type-based vs feature-based architecture

## What you need to know

[Why architecture matters](../13.%20why-architecture/notes.md) is the **risk**: blast radius, ownership, incremental migrate. This unit is the **shape** that encodes those decisions: **type-based** folders vs **feature-based** folders.

**Type-based** groups files by **technical role**: all screens together, all hooks together, all services together. Easy to start. Production pain: one **capability** (payments) is scattered across five top-level folders, so a change has a large blast radius and a feature is hard to delete.

**Feature-based** groups files by **business capability**: `features/payments/` owns that capability’s screens, UI, hooks, API, and domain. `app/` is the shell. `shared/` is only **genuinely** reused primitives. Each feature’s `index.ts` is its **public API**.

This unit is **which tree and why**. **Layering inside a feature**, dependency arrows, and the app-shell checklist are the **next** sections of [02-architecture.md](../02-architecture.md). Don’t dump a 40-folder fintech tree if you cannot contrast **type vs feature** and defend `shared/` discipline.

Curriculum this unit completes:

- Type-based tree: what it is, why it appears in early apps, the four cons
- Feature-based tree: `app/` / `shared/` / `features/` / public `index.ts`
- Cohesion, ownership, isolation, localized refactors
- `shared/` discipline, over-segmentation, cross-feature import rules (why they exist)
- When type-based is still reasonable; when to migrate
- The spoken production-apps answer (legacy soup → capability boundaries)

---

## Type-based: group by technical role

```text
src/
  components/
  screens/
  hooks/
  services/
  utils/
  store/
```

**What it is:** a file’s home is **what kind of file it is**, not **which product slice it belongs to**. `WalletScreen.tsx` lives next to `LoginScreen.tsx`. `useWallet.ts` lives next to `useLogin.ts`. Payments helpers live in `utils/` next to date formatters.

**Why it exists:** it matches how people **learn** RN (“I added a screen, then a hook, then a service”). One developer, few screens, no squads — the tree is **discoverable by file type**. Familiar to web tutorials that also use `components/` + `pages/`.

**Pros (keep these — they are real):**

- **Easy to start** — no debate about capability names while the product is still pivoting
- **Familiar** — reviewers from tutorial RN know where a “screen” goes

**Cons (this is what seniors defend against):**

| Con | Mechanism |
| --- | --- |
| Related code is **scattered** | A payments change is a scavenger hunt: `screens/` + `hooks/` + `services/` + `utils/` + maybe `store/` |
| Changes **touch many folders** | PR file-change spread explodes; merge conflicts concentrate in `components/` and `utils/` |
| Hard to **delete or refactor** a feature | You never know what `utils/formatMoney.ts` still serves; leftovers rot |
| Junk-drawer **`utils/`** and giant **`components/`** | Anything two screens touch gets dumped globally; nobody owns the dump |

That last row is how type-based **decays**. The tree did not start evil. It **encourages** global dumping because there is no **capability home**.

```text
# What a “small payments tweak” looks like in type-based
src/screens/PaymentConfirm.tsx
src/hooks/usePayment.ts
src/services/paymentApi.ts
src/utils/formatMoney.ts      // also used by wallet? unknown
src/components/AmountField.tsx  // also used by transfers? unknown
```

You cannot point at **one folder** and say “payments lives here.” That is the opposite of [blast radius](../13.%20why-architecture/notes.md).

---

## Feature-based: group by business capability

```text
src/
  app/                    # app shell: providers, navigation root, config
  shared/                 # truly cross-feature primitives
    ui/
    lib/
    hooks/
    types/
  features/
    auth/
      api/
      model/
      ui/
      screens/
      hooks/
      index.ts             # public API of the feature
    wallet/
    payments/
    transfers/
    profile/
```

**What it is:** a file’s home is **which capability it belongs to**. Technical roles still exist — **inside** the feature (`screens/`, `hooks/`, `api/`). You did not delete types of files; you **nested** them under a product slice.

Three top-level ideas (details of shell and inner layers come later):

| Bucket | Owns | Does not own |
| --- | --- | --- |
| **`app/`** | Composition: providers, root navigator, bootstrap | Business screens (“PaymentConfirm in `app/`”) |
| **`shared/`** | Primitives reused by **multiple** features (tokens, `http` client, `money` helpers if truly shared) | Payments-only helpers, “might be reused someday” |
| **`features/<capability>/`** | That capability’s UI, screens, hooks, API, domain | Other features’ internals |

**`index.ts`:** the **only** surface other code should import from that feature. Internals (`screens/PaymentConfirm.tsx`, `model/fee.ts`) stay private unless you **choose** to export them.

```ts
// features/payments/index.ts — public API
export { PaymentsNavigator } from './screens/PaymentsNavigator';
export { formatPaymentStatus } from './model/status';
// not exported: internal FeeTable, ConfirmSkeleton, raw DTOs
```

```ts
// Allowed: other feature or app shell
import { PaymentsNavigator } from '@features/payments';

// Smell: deep import — you coupled to internals that can move tomorrow
import { computeFee } from '../../features/payments/model/fees';
```

**Pros:**

- **High cohesion:** everything for payments lives together — find it, review it, test it
- **Easier ownership:** a squad can own `features/wallet/` the way they own the product slice
- **Easier to lazy-load or isolate:** a capability is a **module** you can defer or (later) package; type-based has no such unit
- **Refactors are localized:** rename an internal hook without a repo-wide grep of `hooks/`
- **Public `index.ts` hides internals:** you can reorganize the feature without breaking importers that respected the API

**Cons (discipline, not a reason to stay in soup):**

- **`shared/` needs rules** or it becomes the new `utils/`
- **Over-segmentation:** a two-file “feature” per widget creates noise; capabilities should be **product slices**, not every component
- **Cross-feature imports** need rules or you rebuild a tangled graph with extra folders

Those import rules (public API only, lift contracts to `shared/`, don’t cycle) are **why** the next section exists. Here you only need: **without rules, feature-based decays into type-based with extra nesting**.

---

## Cohesion is the load-bearing idea

**Cohesion:** things that **change together** live together.

Payments screen, payments hook, payments API, and fee rules **change together**. Login screen and payments screen **do not**. Type-based groups the latter pair because both are “screens.” Feature-based groups the former set because they are **one capability**.

**Coupling** is the other axis: features will still **use** each other (wallet opens payments). The senior move is **narrow, explicit** coupling (public API, navigation params), not hidden deep imports.

```text
type-based:  low cohesion (capability split) + accidental high coupling (everyone imports utils/)
feature-based: high cohesion per capability + coupling only through public surfaces (if you keep the rules)
```

That is why feature-based **implements** the five interview tests: a payments PR stays in `features/payments/` (+ maybe `shared/` if you truly extracted something). Delete payments: delete the folder after checking `index.ts` importers.

---

## When type-based is still reasonable

Feature-based is what you **defend for production** mid-size apps and growing teams. It is not a religion for a weekend prototype.

| Signal | Lean |
| --- | --- |
| New app, team size 2+ | **Feature-based from day one** (EasyPay) |
| Existing type-based, **few screens**, stable, one owner | Structural migration may **cost more than it saves** |
| Existing type-based, high churn, merge fights in `components/` / `screens/` | **Strangle** into features (Wizer / MyCreditInfo) — not a freeze rewrite |
| Multiple squads | Feature-based is close to **mandatory** so ownership maps to folders |
| Single developer, **MVP**, boundaries still pivoting | Light type-based (or a **few** coarse features) until the product’s real slices stabilize |

“What’s a case where feature-based is the wrong call?” is a real follow-up. Answer: **unknown boundaries** + tiny app. Forcing `features/foo` for every experiment **reshuffles every week**. Defer until capabilities are stable — then the cost of soup starts to dominate.

---

## How it appears in real code (imports, not just trees)

A screen that needs a fee should not reach through another feature’s internals. A button that is **generic** belongs in `shared/ui`. A **TransferAmountInput** that knows IBAN and limits stays in `features/transfers/ui`.

```tsx
// features/transfers/screens/SendScreen.tsx
import { TransferAmountInput } from '../ui/TransferAmountInput';
import { useCreateTransfer } from '../hooks/useCreateTransfer';
import { Button } from '@shared/ui/Button'; // genuine primitive

// Wrong: “it’s a component so it goes in src/components”
// Wrong: importing wallet’s private mapper because it “already formats money”
```

**Lazy-load / isolate:** because `features/payments` is a module, you *can* load that navigator later or test `model/` without mounting `app/`. Type-based `screens/Payment*.tsx` is not a loadable unit.

---

## Common mistakes and misconceptions

- **“Feature-based means no `hooks/` folders.”** Roles still exist **inside** the feature.
- **“Everything reused twice goes in `shared/`.”** That’s how `shared/` becomes `utils/`. If only payments uses it, it stays in payments. Extract when a **second capability** truly needs the same primitive.
- **“`app/` is for leftover screens.”** Shell only. Business screens leak into the junk drawer you just escaped.
- **Tiny noisy features.** `features/settings-row/` for one component is over-segmentation. A feature is a **capability** (profile, settings **area**), not a widget.
- **Deep imports** (`../../wallet/model/helpers`) while claiming you have a public API. The `index.ts` only works if **importers obey it** (lint later; discipline now).
- **Reciting the tree and stopping.** They already know folders exist. Defend **cohesion, ownership, delete-ability, public API**.
- **Redux/Zustand as the structure answer.** State can live *inside* features; it does not replace the tree.

---

## Connections to other concepts

`why (risk) → type vs feature (this tree) → inner layers + import direction (next)`

- **[Why architecture](../13.%20why-architecture/notes.md):** this tree is how you **localize** change and map squads to folders.
- **[02-architecture.md](../02-architecture.md) §3:** `screens → hooks → api/model` **inside** a feature; public vs internal imports spelled out.
- **[§4 App shell](../02-architecture.md):** what actually belongs in `app/` (providers, boot, root nav).
- **[§6 Shared UI](../02-architecture.md):** when a primitive graduates to `shared/ui` vs staying in feature UI (TransferAmountInput).
- **[§9 Strangler](../02-architecture.md):** you **move one vertical slice** into `features/` at a time — you do not rename `screens/` in one weekend.
- **[Platform soup](../8.%20platform-specific/notes.md):** OS branches belong in feature **UI/native**, not a global `utils/platform.ts` that domain imports.
- **State/navigation chapters:** they **plug into** `app/` and features; they are not a substitute for this split.

---

## Interview perspective

You should be able to **draw both trees from memory**, list type-based cons without hedging, and say the production answer below **out loud**. Then take one follow-up: `shared/` rules, or when feature-based is wrong, or how you migrated soup.

Preserve this spoken answer:

> I prefer feature-based architecture for production apps. Each feature owns its screens, UI pieces, hooks, API calls, and domain logic. Shared code is only what is genuinely reused. This is how I modernized legacy apps: instead of a giant screens/components soup, we moved boundaries around business capabilities — wallet, auth, feed, etc. — which improved maintainability and reduced regression risk.

If they only ask “why not `screens/` + `components/`?”: cohesion, ownership, safer deletes/refactors, smaller blast radius. Give a **legacy pain** (grep five folders for one flow; nobody dares touch `components/Button`).

If they ask “how do features talk?”: public `index.ts`, lift true shares to `shared/`, navigation params for flow — **not** a deep-import mesh. Full options are the next section; don’t invent a global event bus as your first answer.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
