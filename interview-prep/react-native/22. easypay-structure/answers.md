# EasyPay-like target structure — Answers

## Core recall

1. **`app/`**, **`shared/`**, **`features/`**, **`native/`**.
2. **`providers/`**, **`navigation/`**, **`bootstrap/`**.
3. **`ui/`**, **`lib/http/`**, **`lib/secure-storage/`**, **`lib/money/`**, **`hooks/`**.
4. **auth, onboarding, wallet, qr-payments, transfers, loans, notifications, profile**.
5. **Thin wrappers** around native modules used **app-wide**.
6. **Draw it on a whiteboard**.
7. **Login:** `features/auth`. **Root gate/container:** `app/navigation`.
8. **Button:** `shared/ui`. **TransferAmountInput:** `features/transfers/ui`.
9. **http:** client + env URL. **money:** minor units / shared format. **secure-storage:** tokens at rest.
10. **App-wide** → `src/native/`. **One feature only** → that feature’s `native/`.

## Explain why

1. They asked **shape and ownership**, not a file dump. Inner layers are a **follow-up**.
2. **Different** entry (camera vs IBAN), native, and risk. One folder becomes a **god payments**.
3. **Wallet** = hold/display. **Transfers** = move. Different teams and blast radius.
4. KYC/first-run is a **flow** with its own stack/completion; stuffing it in auth **bloats** session code.
5. **money** = **shared representation**. **Fee schedule** = **product** in the slice that owns it.
6. `useWallet` is **wallet**. `shared/hooks` would be the new **junk drawer**.
7. Shell **composes**; business UI in **features** or you recreate type-based soup.
8. **Named** modules have **owners**. `utils.ts` has **none**.
9. Inbox/prefs/deep-link routing is a **capability**. A **transport** helper can be shared; the **product** is a feature.
10. Green-field — **choose** seams day one so you **don’t** need a patient.

## Compare and contrast

1. **Capabilities** vs **file kinds**. EasyPay is the former.
2. **app/navigation:** container + **hydrated/auth** switch. **auth:** Login stack. **transfers:** nested **flow** stack.
3. **Generic** kit vs **domain** composite.
4. **Shared wrapper** vs **QR-only** module.
5. **Storage primitive** vs **session rules / hydrate API**. Auth **uses** the lib.
6. **Destination** vs **weekly slices** toward it.
7. **http:** transport. **feature api:** DTO + calls; **mappers** in feature **model**.
8. **Draw** the four boxes + names. **Say** Query, small store, flavors **in words** — Q-bank, don’t clutter the tree.

## Predict the output

1. **Business screen in the shell.** Move to `features/wallet`.
2. **Junk-drawer `shared/`** — IBAN/QR/APR belong in **features**. Split or move back.
3. **Cohesion/ownership** — three domains, one blast radius.
4. **`shared` imported a feature`** — DAG inversion.
5. **Wrapper:** `src/native/` (or shared native). **Pay CTA/UI:** `features/transfers` (or payments confirm).
6. **The four-box architecture** — they still don’t know **where a capability lives**.

## Debugging

1. **That’s type-based.** Redraw: **app / shared / features (list) / native**.
2. **God home** — split: wallet, qr-payments, profile; home **composes** public widgets if needed.
3. **shared → feature**. Lift **rates** only if truly shared; else keep in loans; money lib stays **generic**.
4. **Missing `lib/http` and `lib/secure-storage`** (and typed config). Duplicate clients/keys = token bugs.
5. **Stabilize / delete dead native** ([playbook](../21.%20legacy-modernization/notes.md) Step 3). Tree: **thin**, used wrappers only.
6. **No public API discipline.** Folders without **index.ts** rules.

## Application

1. Match the curriculum tree (four boxes + listed children).
2. **ConfirmTransfer:** `features/transfers`. **http+config:** `shared/lib/http` + `app` config. **formatMinor:** `lib/money`. **Login:** `features/auth`. **Biometric wrapper:** `src/native/`. **EmptyState:** `shared/ui` if generic.
3. **features → shared**; **app → feature public APIs**; **not** shared → features; **not** internals.
4. **`features/qr-payments`** (UI/flow); camera module in **that** `native/` unless already app-wide.
5. **Identity:** auth + onboarding. **Money:** wallet, qr-payments, transfers, loans. **Account:** notifications, profile.
6. **…a capability folder (or shared/native if it truly is)** — not `app/` screens, not `utils.ts`.

## Interview questions

1. **Spoken:** Draw app (providers, nav, bootstrap), shared (ui, http, secure-storage, money), eight features, `native/` app-wide. Arrows features→shared.  
   **Follow-ups:** Login → **auth**. TransferAmountInput → **transfers/ui**.

2. **Spoken:** Same tree. Shell + capabilities + kit. Auth-gated nav in `app/navigation`. Tokens in **secure-storage**. Native isolated. (Query + flavors: **one clause**.)

3. **Spoken:** QR vs bank vs loans are **different** product slices; one `payments/` is a **god feature**.

4. **Spoken:** ui + http + secure-storage + money (+ rare hooks). **Out:** domain composites, one-off screens, feature flags of **one** slice.

5. **Spoken:** Used by **multiple** features or the shell → `src/native/`. **One** slice → feature `native/`. Wrappers stay **thin**.

## Connections

1. Top-level key is **capability**; `app`/`shared`/`native` are the **shell and real shares**.
2. **providers / navigation / bootstrap** **are** those three names.
3. **`lib/money`:** minor units/format. **DTOs** stay in **feature `api/`**; mappers in **feature `model/`**.
4. **`getConfig()`** in shell; **http** uses `apiBaseUrl`. No `flavors/` folder required on the whiteboard.
5. **Introduce `features/auth`**, freeze soup, slice **wallet** next, until the board **looks like this**.
