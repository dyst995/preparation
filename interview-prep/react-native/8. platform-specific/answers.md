# Platform-specific code — Answers

## Core recall

1. Typically `'ios'` or `'android'` (also `'web'` etc. if that target exists).
2. Picking a **value** per platform (styles, small variants) with an optional **`default`**.
3. **`select`:** small style/value. **Files:** different structure, native APIs, or large divergence.
4. **`.native`:** iOS **and** Android. **`.ios`:** iOS only.
5. When the **capability doesn’t exist in JS**.
6. `Platform.OS` **scattered** — especially in **business logic** — instead of isolated at the edge.
7. **Metro** (bundle-time resolve). Not React picking a component at runtime for that import.
8. **No.** Fees are **domain**. OS doesn’t change the money rules; if UX differs, branch in **UI**.

## Explain why

1. Domain stays **testable** without mocking OS everywhere; one product model, two skins/APIs.
2. You now **fix bugs twice**; the platforms will drift.
3. Nested OS JSX is **unreadable** and **untestable**; two files make each tree linear.
4. Biometrics is a **native API**. `Platform.OS` only **chooses**; it doesn’t **implement** Keychain/BiometricPrompt.
5. Tablets are **size**, not OS. Use dimensions / size classes.
6. Web or a future platform won’t `undefined` if you only listed `ios`/`android`.

## Compare and contrast

1. **`select`:** values. **`if`:** behavior/tree. Same isolation rule.
2. **Files:** Metro includes **one module**. **Runtime:** both branches in **one** file’s bundle (dead code may remain).
3. Shared native vs **one OS**.
4. **Files:** still JS UI. **Module:** native capability.
5. **OS name** vs **OS version / API level**.
6. **UI:** allowed (isolated). **Domain:** smell.

## Predict the output

1. **`Sheet.ios.tsx`**. Android file unused for that import.
2. **`12`** (`default`) — no `ios` key.
3. **Soup** — extract OS-free domain; put Android UX in UI.
4. **`Button.native.tsx`** (native cascade), not `.web`.

## Debugging

1. **Move checks** to `ui/` or a tiny `platform/` adapter; keep `usePayment` pure.
2. **Merge** + `Platform.select` for the shadow.
3. Add **`Camera.android.tsx`** (or a shared `.native` / default `Camera.tsx`).
4. **Don’t import platform-suffixed paths by hand** — import the **bare** `./something` and let Metro choose (or mock `Platform` in tests).

## Application

1. select → small values; OS if → small behavior; files → big/structural; module → no JS API.
2. `...Platform.select({ ios: { shadowOpacity: 0.2 }, android: { elevation: 4 } })`
3. Share APIs / UI **trees** diverge (UIActivityViewController vs Android share intent UX).
4. `Platform` in **`ui/`** (and native/). **`model/`:** no.

## Interview questions

1. **Spoken:** `select` for padding/shadows; `.ios`/`.android` when structure or native usage diverges; no OS checks in business logic.  
   **Follow-ups:** `select` vs `if` is value vs branch. Module when JS can’t. Domain stays platform-free.

2. **Spoken:** Metro resolver: `.ios` / `.android` / `.native` before the generic file.

3. **Spoken:** Platform-free **model** tests; UI tests per file or mock `Platform`; don’t require a device matrix to unit-test fees.

4. **Spoken:** `if (ios)` in an API/pricing module — reject; move to UI or a native wrapper.

5. **Spoken:** `.native` when iOS and Android share JS but web does not; `.ios` when iOS truly differs from Android.

## Connections

1. Resolver **implements** file splits.
2. **UI / native** may know OS; **domain** must not.
3. Shadows/padding = **select** on the same `View`.
4. New Arch changes **how** you write the module, not the **when** (still “JS can’t”).
5. **dev/staging/prod** is **environment**, not iOS vs Android.
