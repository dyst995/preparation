# Type-based vs feature-based architecture — Answers

## Core recall

1. **Grouping by technical role** (what kind of file). Typical: `components/`, `screens/`, `hooks/`, `services/`, `utils/`, `store/`.
2. **Grouping by business capability** — payments code lives under `features/payments/`, not all screens in one pile.
3. **Easy to start**; **familiar** to beginners / tutorial RN.
4. Related code **scattered**; one feature change **touches many folders**; hard to **delete/refactor** a feature safely; junk-drawer **`utils/`** and giant **`components/`**.
5. **`app/`:** shell (providers, root nav, config). **`shared/`:** truly cross-feature primitives. **`features/`:** each capability’s own screens/UI/hooks/API/domain.
6. The feature’s **public API** — what other features/`app` may import; internals stay hidden unless exported.
7. **High cohesion**; **squad ownership**; **lazy-load/isolate**; **localized refactors**; **`index.ts` hides internals**.
8. Needs **discipline about shared code**; **over-segmentation** (tiny noisy folders); needs **clear cross-feature import rules**.
9. **Yes** — types of files are **nested inside** the capability. The app is feature-based because the **top-level key is capability**, not because hooks folders vanished.
10. **`shared/`:** generic, reused by multiple features (Button, tokens, `http`). **Feature `ui/`:** domain-specific composites (`TransferAmountInput`).

## Explain why

1. It matches **how you learn** (add a screen, then a hook). One person, few screens, no ownership fights — file-type discovery is enough.
2. A capability is **several roles**. Type-based puts each role in a **different top-level folder**, so the slice is physically split.
3. Helpers and components are **global**; you cannot know what still depends on `utils/formatMoney.ts`. Leftovers remain and break later.
4. There is **no capability home**, so “used twice” → dump in `utils/` / `components/`. Nobody owns the dump, so it grows.
5. Things that **change together** sit together → a payments PR stays in **one tree** instead of five.
6. Importers depend on a **stable surface**. You can move `model/fees.ts` internally without breaking the rest of the app **if** they didn’t deep-import.
7. A feature folder is a **module** (navigator + public API). `src/screens/Payment*.tsx` is not a unit you can defer or test as a package.
8. Accidental overlap ≠ a **shared primitive**. Payments-only helpers in `shared/` recreate `utils/` and hide the real owner.
9. Tiny folders add **navigation noise**, pointless `index.ts` files, and **fake** capabilities. Reviewers can’t see real product slices.
10. Folders don’t stop `import '../../other/internals'`. Without rules you get a **hidden graph** — feature-based **shape** with type-based **coupling**.

## Compare and contrast

1. Type: **file kind**. Feature: **business capability**.
2. **Cohesion:** payments artifacts together. **Coupling:** wallet still *uses* payments, but only through a **narrow public API**, not deep files.
3. **Button-like generic** → `shared/ui`. **Knows transfers/IBAN/limits** → `features/transfers/ui`.
4. **`app/`:** composition/bootstrap only. **Payment screens** stay in the feature. Navigators in `app/` **compose** feature navigators; they don’t host business JSX dumps.
5. Deep import **couples to internals** (renames break you). Public import **obeys the contract**; payments can refactor behind `index.ts`.
6. EasyPay: **choose** the tree on day one. Legacy: **cut** `features/` into soup **while shipping** — not a weekend rename.
7. Mid-size / 2+ engineers / stable slices → feature-based. MVP / unknown boundaries → light type-based (or few coarse features) until slices stabilize.
8. This unit: **top-level grouping**. Next: **dependency direction inside** a feature (`screens → hooks → api/model`). Don’t mix the answers.

## Predict the output

1. **Likely all of them** (screen + hook + service + util + shared component). Problem: **scattered capability** → large blast radius, merge fights, unclear leftovers.
2. Almost all in **`features/payments/`**. Auth screens in the same PR means **no boundary** (or you “fixed” auth by accident) — coupling/smell.
3. **Fake shared** — it’s payments code. **Move it into `features/payments`** (e.g. `model/` or `lib/`).
4. **Public API / no internals** rule. Next refactor of `fees.ts` **breaks transfers** even though payments thought the file was private.
5. **No** — tiny prototype, one owner, pivoting product. Red flag is defending that tree **for a production multi-squad app**, not the weekend MVP.
6. **Over-segmentation** — widgets are not capabilities.

## Debugging

1. **Type-based / no cohesion.** First move: **one vertical slice** (wallet) into `features/wallet/` as you touch it; stop adding new wallet code to the piles. Not a freeze rewrite.
2. **Type-based soup** — auth has no home; onboarding is a grep.
3. Export what they need from **`features/wallet/index.ts`** (or lift a **true** shared contract to `shared/` if several features need the same primitive). Don’t deep-import.
4. **`shared/` became `utils/`.** Categorize: move single-feature code **back into features** as you touch it; keep well-named modules (`shared/lib/money`, `shared/ui`). Add a rule against a catch-all `shared/utils.ts`. Incremental, not one PR for 200 files.
5. **Business screen leaked into the shell.** Move `PaymentConfirm` into `features/payments/screens/`; `app/` only **wires** the navigator.
6. They **renamed folders** without **public APIs** or **shared rules**. Shape without the discipline — decay continues.

## Application

1. Type-based: `components/ screens/ hooks/ services/ utils/ store/`. Feature-based: `app/`, `shared/{ui,lib,hooks,types}/`, `features/{auth,wallet,…}/` with `index.ts` on a feature. (Match the curriculum trees.)
2. Prefer feature-based for **production**: each feature owns screens, UI, hooks, API, domain; **shared only if genuinely reused**; modernization = **capability boundaries** (wallet, auth, feed) instead of screens/components soup → maintainability and **lower regression risk**.
3. Example:

```ts
export { PaymentsNavigator } from './screens/PaymentsNavigator';
export { formatPaymentStatus } from './model/status';
// do not export FeeTable / internal DTOs
```

4. **`TransferAmountInput`:** `features/transfers/ui`. **`Button`:** `shared/ui`.
5. **Don’t** big-bang rewrite / freeze. **Do** strangle **wallet** (or the hottest slice) into `features/wallet/`, public `index.ts`, no new code in legacy piles for that slice. **Done for one slice:** wallet PRs mostly stay in that folder; others import only the public API.
6. **Features must not import other features’ internals** — only `index.ts` (or shared contracts).

## Interview questions

1. **Spoken:** High cohesion — a capability lives in one tree. Easier squad ownership, safer deletes/refactors, smaller blast radius, `index.ts` to hide internals. Legacy pain: one payments tweak touched `screens/`, `hooks/`, `utils/`, `components/`; nobody owned `components/`.  
   **Follow-ups:** Tradeoff = **shared discipline**, risk of tiny folders, need import rules. Not “folders are prettier.”

2. **Spoken:** `app/` shell, `features/` by capability (auth, wallet, payments, …), `shared/` only real primitives/tokens. Features own their screens/hooks/api/domain.  
   **Follow-up:** Generic Button → `shared/ui`; domain field → feature UI.

3. **Spoken:** Import the other feature’s **public** `index.ts`; lift true shared contracts into `shared/`; pass **navigation params** for flow state. Don’t deep-import and don’t start with a global event bus.

4. **Spoken:** Tiny app / early MVP where **capabilities aren’t known yet** — forcing a feature per experiment reshuffles weekly. Light structure until slices stabilize; then soup becomes the more expensive choice.

5. **Spoken:** Don’t rewrite `shared/` in one PR. Split **single-feature** dumps back into features as you touch them; keep named primitives (`lib/http`, `ui/tokens`). Lint/review so new code isn’t appended to `shared/utils.ts`. Same incremental idea as strangling screens soup.

6. **Spoken:** When the folder no longer has **one responsibility**, or two teams fight inside it, or `index.ts` exports **two different capabilities** — that’s the split seam.

## Connections

1. **Scale:** squad ↔ folder. **Ship:** payments PR stays put. **Modernize:** move one `features/x` at a time. **Layers:** roles **inside** the feature (next). **Onboard/review:** find payments in one tree, feature-sized diffs.
2. A crash “fix” that still edits global `utils/` / `components/` **re-tangles** the app; the next feature reintroduces the bug class. Localized folders keep the fix **in the slice**.
3. Feature-based is the **outer** map. Inside `features/payments/`, screens compose hooks, hooks talk to api/model — **direction**, not a second top-level `hooks/` pile.
4. **`Platform.OS` stays in UI/native**, not domain `model/` and not a global `utils/platform` that fee logic imports. Feature-based doesn’t license platform soup inside `model/`.
5. **This unit:** the **target shape** (capabilities, not type piles). **Strangler:** the **migration tactic** (one vertical slice per week, stay shippable). Don’t answer a tree question with only Crashlytics, and don’t answer a migration question with only a pretty tree.
