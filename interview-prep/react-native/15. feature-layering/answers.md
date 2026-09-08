# Layering inside a feature — Answers

## Core recall

1. The folder can still be a **god feature**: fetch, fees, JSX, and native in one file. You need **concerns + import direction**.
2. **`ui/`** presentational; **`screens/`** route composition; **`hooks/`** view-model; **`model/`** pure domain; **`api/`** REST/React Query; **`native/`** feature native wrappers; **`index.ts`** public API.
3. **Props in, views out.** No fetch, no navigator, no fee formulas.
4. Orchestrate **api + model**, expose view state (`data`, `isPending`, `onSubmit`) so screens stay thin.
5. **`model/`:** types, validators, pure helpers. **`api/`:** HTTP / query functions, wire DTOs. **`native/`:** JS wrappers around that feature’s native APIs.
6. **`screens → hooks → api/model`**; **screens → ui**; **features → shared**; **not** other features’ internals.
7. **`features`** (or any feature internals). Shared is **below** features.
8. **Internals** — only the other feature’s **public** `index.ts` (or shared contracts / params).
9. (1) Public **`index.ts`**. (2) Lift contracts to **`shared/`**. (3) **Nav params** / rare app events — **not** a default event bus.
10. Export **chosen** screens/navigators and a **narrow** set of helpers. Hide internal fee tables, skeletons, raw DTOs unless you deliberately publish them.

## Explain why

1. **Screens** know routes/params and wiring. **`ui/`** is reusable layout without route or data-layer coupling. Mixing them makes every “row” a screen.
2. Then you can **unit-test** rules in Node and keep product logic **OS-agnostic**. Platform/network are **other** layers.
3. So fetching and mapping aren’t **copied** into each screen, and screens don’t talk to `axios` directly.
4. The component is no longer presentational — it **pulls** data, so you can’t drop it on another screen without pulling that query, and you couple UI to React Query.
5. That **inverts** the DAG: a “primitive” would drag a product slice; `shared/` becomes a hidden feature graph.
6. There are **no internals**. Refactors of `model/fees.ts` break every importer; blast radius returns.
7. **Implicit, untyped coupling**; hard to debug; easy fan-out. Prefer explicit imports and route params. Bus is a last resort for rare cross-cutting signals.
8. Domain would **depend on HTTP**. You couldn’t test fees without a client; swapping REST vs mock gets messy. Types from `api` in a mapper are a narrower exception than importing `fetch`.
9. The **wire boundary** leaked into UI. Rename a JSON field → three screens break. Mappers/`model` should own that once.
10. Each side **depends on the other’s guts**. Moving a file breaks the cycle at runtime/bundle time. Public API or a **lifted** shared contract breaks the cycle.

## Compare and contrast

1. **Outer:** capability cohesion (payments vs auth). **Inner:** UI vs domain vs wire vs native **inside** payments, enforced by arrows.
2. **Screens:** route + compose. **`ui/`:** dumb views. **Hooks:** data/orchestration for those views.
3. **`api/`:** wire. **`model/`:** product meaning (fees, status). Mapping sits **at the boundary** (often `model/mappers`); screens don’t ad-hoc rename. §7 goes deeper on DTO vs UI model.
4. **`native/`:** wrapper + hook. **`model/`:** pure. Native in `computeFee` makes domain untestable and OS-coupled.
5. Public import **respects the contract**. Deep import **couples to files** payments considered private.
6. **True share** → `shared/lib/money`. **Duplicate** → drift. **Deep-import** → fake share, hidden graph.
7. **Params:** flow-scoped, typed, dies with the stack. **Global store for amount:** leftover state, “go back” bugs, fake architecture.
8. Inner `hooks/` **belong to the capability**. Top-level `src/hooks/` is **type-based** scatter.

## Predict the output

1. **`model/` must stay pure.** Tests now need RN/Platform; iOS vs Android can fork **business** results.
2. **`ui/` fetching.** Query belongs in **`hooks/`**; the view receives `fee` / `isPending` as props.
3. Wallet **breaks** (or silently uses a stale path). Skipped **option 1** (export from payments `index`) or **option 2** if the fee helper is truly shared.
4. **`shared` imported a feature** — `features → shared` reversed. Lift a dumb `Button` CTA or import a **public** payments component from the **feature**, not from `shared/ui`.
5. **Should be option 2** if `Money` is a **shared contract**. Option 1 makes payments the **owner of money** for the whole app — wallet coupled to payments forever.
6. Skipped **navigation params**. Cost: global leftover amount, harder deep links, confirm flow not localized.

## Debugging

1. **Layer collapse** (god screen). Layout → `ui/`; fetch → `api/` + hook; fees → `model/`; native → `native/` + hook; screen composes.
2. **`model` imported hooks** — domain depends on React/view-model. Move types the other way; hooks import model.
3. **UI (toasts) and model (format)** leaked into api. Api returns data; hook/ui handles toast; `model` or `shared/lib/money` formats.
4. **Option 1 or 2:** export a narrow API or lift the shared type. **Stop** internals hopping. Don’t add a bus to hide the cycle.
5. **Narrow public API** — they published the entire interior.
6. **UI must not import screens.** Put the type in `model/` or a `ui` props type file; screen stays the composer.

## Application

1. Tree as curriculum; arrows: screens → hooks → api/model; screens → ui; features → shared; no internals.
2. Screen calls `useConfirmPayment`, passes props to `ConfirmPaymentView` — no `computeFee` inline.
3.

```ts
export { PaymentsNavigator } from './screens/PaymentsNavigator';
export { formatPaymentStatus } from './model/status';
```

4. Option 1: `import { formatPaymentStatus } from '@features/payments'` if it’s **payments language**. If it’s generic money/status used app-wide, **option 2** `shared/`.
5. **No imports of other features’ internals; `model/` must not import ui/screens/hooks/fetch.**
6. **IBAN validation:** `features/transfers/model`. **`TextField`:** `shared/ui`. **`TransferAmountInput`:** `features/transfers/ui` composing both.

## Interview questions

1. **Spoken:** Inside payments I still split presentational UI, screens, view-model hooks, pure model, api, native wrappers, and a narrow `index.ts`. Screens depend on hooks and UI; hooks on api/model; model stays pure.  
   **Follow-ups:** Draw those arrows. Fee math → `model/`, unit-tested, no Platform.

2. **Spoken:** Public `index.ts` first; if several features own the same contract, lift to `shared/`; flow state in **nav params**.  
   **Follow-up:** An event bus is implicit coupling — last resort, not the architecture.

3. **Spoken:** Rules in **model**; SDKs behind **native/** consumed by hooks; **ui/** only props and views.

4. **Spoken:** Review the DAG, keep `index.ts` narrow, don’t let screens fetch or `model` import RN. Lint/boundaries later; **direction** is the habit. God-feature PRs fail review like type-based soup.

5. **Spoken:** Folders are documentation; **imports** are the architecture. A payments folder that imports wallet internals and puts fetch in JSX is still tangled — just nested.

## Connections

1. Type-vs-feature **where the capability lives**. This unit **how the capability is internally a DAG**, not a second top-level `hooks/`.
2. **Scale:** people own a layer inside the slice. **Ship:** fee PRs don’t restyle screens. **Layers:** this *is* UI/domain/native. **Review:** you see a `model/` diff vs an 800-line screen. **Modernize:** you can strangle **model** first, then screens.
3. `Platform` in `model/` is **platform soup** and a **DAG violation** (domain → host).
4. Shell imports **public navigators / providers wiring**, not `ConfirmPaymentScreen` as `app/`’s child file. Business screens stay in the feature.
5. §7 **names** DTO vs domain vs ad-hoc renaming. The folders (`api/` vs `model/`) already exist here; §7 is the **mapping discipline**, not a new tree.
