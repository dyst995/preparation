# EasyPay-like target structure (whiteboard)

## What you need to know

[Legacy modernization](../21.%20legacy-modernization/notes.md) is **how you walk**. This unit is the **destination tree** you can **draw in 60 seconds** for a mid-size **fintech** RN app (EasyPay-shaped).

Preserve this map:

```text
src/
  app/
    providers/
    navigation/
    bootstrap/
  shared/
    ui/
    lib/http/
    lib/secure-storage/
    lib/money/
    hooks/
  features/
    auth/
    onboarding/
    wallet/
    qr-payments/
    transfers/
    loans/
    notifications/
    profile/
  native/                 # thin wrappers around native modules used app-wide
```

If you can only recite names, you fail the whiteboard. You must **place** a new file in **one** of these boxes and **say why**. Inner `screens/hooks/api/model` and the **Q-bank** (from-scratch 8-bullet talk) are **already taught** or **next** — this unit is **the four top-level boxes + these feature names**.

---

## Four boxes, not forty folders

Draw **four** columns (or nested boxes), then **fill**:

| Box | Owns | Does not own |
| --- | --- | --- |
| **`app/`** | Process composition: **providers**, **root navigation**, **bootstrap** | Wallet screens, fee math |
| **`shared/`** | **Genuine** cross-feature: **ui** kit, **http**, **secure-storage**, **money**, rare **hooks** | IBAN input, QR scan UI |
| **`features/`** | **Business capabilities** (product nouns) | A second `utils/` |
| **`native/`** | **App-wide** thin JS wrappers (biometrics helper used by auth **and** payments, etc.) | Feature-only scanner that **only** QR needs — that can live in `features/qr-payments/native/` |

**Arrows (import direction):** `app` → feature **public** navigators; `features` → `shared`; `features`/`app` → `native/` wrappers; **`shared` ↛ features**; features **↛** each other’s **internals**.

While you draw, you can **narrate** in one breath: shell + capability folders + tokens/primitives + auth-gated nav + (later) Query/session store + secure storage + native boundary + flavors. **Don’t** stop drawing to lecture React Query — [03-state-management.md](../03-state-management.md) owns that.

---

## `app/` — three names, one job

Curriculum lists **`providers/`**, **`navigation/`**, **`bootstrap/`**. That **is** the [shell](../16.%20app-shell/notes.md): QueryClient/theme/SafeArea, `NavigationContainer` + Auth vs App **gate**, ordered startup (crashlytics → hydrate → …).

**Whiteboard:** write those three subfolders. If they ask “where is Login?” → **`features/auth`**, composed **from** `app/navigation`.

---

## `shared/` — named libs, not `utils.ts`

Fintech **repeats** three **non-UI** problems. Putting them in **named** modules is how `shared/` **doesn’t** become a junk drawer:

| Path | Why it is shared |
| --- | --- |
| **`ui/`** | Tokens + primitives ([design system](../18.%20design-system/notes.md)) — Button, not `TransferAmountInput` |
| **`lib/http/`** | One client: base URL from [config](../20.%20flavors-config/notes.md), auth header, timeouts — **not** a god mapper |
| **`lib/secure-storage/`** | Tokens/session **at rest** — used by **auth** (and maybe biometrics unlock) |
| **`lib/money/`** | **Minor units**, formatters used by **wallet + transfers + loans** — not copy-paste `/ 100` |
| **`hooks/`** | Only hooks that are **truly** cross-feature (`useAppState`, `useOnline`). `useTransferQuote` stays in **transfers** |

**`money` in shared vs `model/fees` in payments:** **currency arithmetic/format** that’s **app-wide** vs **product fee policy** that is **payments-only**. If only QR uses a helper, it is **not** `lib/money`.

---

## `features/` — EasyPay capabilities

These names are **product slices**, not technical types. You should **list them from memory**:

| Feature | Why it’s its own slice |
| --- | --- |
| **auth** | Session, login, hydrate — **AuthStack** |
| **onboarding** | KYC / first-run — often a **stack** that must not pollute wallet |
| **wallet** | Balance, accounts, home money surface |
| **qr-payments** | Camera/QR **flow** + pay — different from **bank transfers** |
| **transfers** | P2P / IBAN rails — **TransferAmountInput** lives here |
| **loans** | Separate **domain** and compliance |
| **notifications** | Inbox / prefs — not a `utils/push.ts` dump |
| **profile** | Settings, devices — not `app/screens` |

**QR vs transfers:** both “send money,” **different** entry, native, and risk. Merging them is how you get a **god payments** folder. **Wallet vs transfers:** **display/hold** vs **move**.

Each folder still has **inner layering** + `index.ts` ([15](../15.%20feature-layering/notes.md)). You **don’t** draw every `model/` on the 60s board unless asked.

---

## `src/native/` vs feature `native/`

**`src/native/`:** wrappers used in **more than one** capability (or the **app shell**): e.g. a **biometric** module both **auth** and a **payments confirm** might call, or a **shared** device id helper.

**Feature `native/`:** Zebra-style / **QR camera** that **only** that slice needs.

Thin wrappers: **no fee math** in Kotlin **and** no `NativeModules` inside `lib/money`.

---

## 60-second whiteboard script

1. **Four boxes:** `app` | `shared` | `features` | `native`
2. **`app`:** providers, navigation, bootstrap
3. **`shared`:** ui, http, secure-storage, money
4. **`features`:** list the **eight** names (group if rushed: **auth/onboarding**, **money movement** wallet/qr/transfers/loans, **notifications/profile**)
5. **Arrows:** features → shared; app → feature navigators; **no** shared → features
6. **Stop.** If time: “Login is auth, not app; Button is shared/ui; IBAN field is transfers.”

Going over 60s by drawing **every** inner file is a **fail** — they asked for **shape**.

---

## Common mistakes and misconceptions

- **Drawing `screens/` + `components/`** and calling it EasyPay.
- **`app/wallet/`** because “tabs are in the shell.”
- **`shared/lib/utils.ts`** with 40 functions — you **named** http/money/storage **on purpose**.
- **One `features/payments/`** for QR + transfers + loans.
- **`native/` as a junk drawer** of every SDK (including dead ones).
- **Reciting the tree with no arrows** (imports).
- Treating this as the **modernization playbook** — EasyPay **started here**; Wizer **strangled toward** something like it.

---

## Connections to other concepts

`type vs feature (shape) → this tree (fintech names) → inner DAG / shell / flags already studied`

- **[Type vs feature](../14.%20type-vs-feature/notes.md):** this **is** feature-based **applied**.
- **[App shell](../16.%20app-shell/notes.md):** `app/{providers,navigation,bootstrap}`.
- **[Nav](../17.%20nav-architecture/notes.md):** `app/navigation` **gates**; stacks **live** in features.
- **[Design system](../18.%20design-system/notes.md):** `shared/ui`.
- **[Data/domain](../19.%20data-domain/notes.md):** `lib/money` + per-feature **mappers**.
- **[Flavors](../20.%20flavors-config/notes.md):** `http` reads **`getConfig()`**, not a hardcoded prod host in wallet.
- **[Playbook](../21.%20legacy-modernization/notes.md):** **target** of a strangler; EasyPay **skipped** the patient.

---

## Interview perspective

**Q: Draw EasyPay / a fintech RN app.** 60s **tree** + **one** placement question (“where does TransferAmountInput go?”).

Spoken while drawing:

> App shell — providers, root nav, bootstrap. Shared is only real primitives: UI kit, HTTP client, secure storage, money helpers. Features are capabilities: auth, onboarding, wallet, QR payments, transfers, loans, notifications, profile. App-wide native wrappers at src/native; feature-specific native stays in the feature. Imports go features → shared, never the other way.

If they immediately ask from-scratch: that’s the **next** Q-bank (Query, flavors). Point at **secure-storage** and **http** on the board so you don’t look like you **forgot** tokens and env.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
