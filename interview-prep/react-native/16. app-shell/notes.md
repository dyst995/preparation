# App shell responsibilities

## What you need to know

[Feature folders](../14.%20type-vs-feature/notes.md) and [inner layering](../15.%20feature-layering/notes.md) answer **where a capability lives**. **`app/`** answers **how the process becomes a running app**: providers, the **root** navigator, global error handling, **boot order**, config access, linking.

If you dump `PaymentConfirmScreen` into `app/`, the shell is a junk drawer. If you mount navigation **before** auth hydrate, users see a **Login flash** (or the wrong stack). If crash reporting starts **after** hydrate, boot crashes are **invisible**. Interviewers treat boot order as **crash-rate and TTI** engineering, not “I wrapped providers.”

`app/` (or `src/app`) should own:

- Providers composition (`QueryClientProvider`, store providers, SafeArea, theme)
- Root navigation **container**
- Global error boundaries
- Bootstrap/startup sequencing (fonts, remote config, auth hydrate)
- Environment config **access**
- Global linking config

**Avoid dumping business screens into `app/`.**

Safe boot order (interview gold):

1. Load native minimum / splash stays up
2. Init crash reporting
3. Hydrate auth/session from secure storage
4. Init analytics (after consent if required)
5. Mount navigation with **correct** auth state
6. Defer non-critical init (prefetch, secondary SDKs)

This unit is **shell + sequence**. **Auth stack vs app stack** is the next section. **Flavors and what must not go in env** are a later section. Don’t recite a full navigator tree if you can’t explain **why crashlytics is step 2**.

---

## What the shell is (and is not)

**The shell composes.** It imports **public** feature APIs (navigators, `AuthProvider` from `features/auth`) and **shared** providers (theme, query client). It does not own fee math or wallet screens.

```text
src/app/
  providers/          # QueryClient, theme, SafeArea, error boundary
  bootstrap/          # ordered startup: crash, hydrate, consent
  navigation/         # NavigationContainer + root switch (not feature screens)
  config.ts           # typed access to env (URLs, flags) — not secrets
```

**`app/` vs `features/auth`:** session **rules** and secure-storage reads can live in the **auth feature**. The **shell** **calls** hydrate at the right time and **does not mount** the main tree until that finishes (or fails closed to “logged out”). Auth **screens** stay in `features/auth`.

---

## Providers: composition, not a random wrap

Providers exist so **hooks below** (`useQuery`, `useTheme`, `useSafeAreaInsets`) have a host. The shell **owns the order** because order is **dependency**:

```tsx
<ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <SafeAreaProvider>
        <Bootstrap>
          <RootNavigator />
        </Bootstrap>
      </SafeAreaProvider>
    </ThemeProvider>
  </QueryClientProvider>
</ErrorBoundary>
```

**Why this shape:**

- **Error boundary** near the root: a render throw in a feature should not take down the **native** process uncaught. You still want Crashlytics; the boundary is **UX** (fallback UI) plus a place to **report**.
- **QueryClient / store** wrap anything that fetches or reads global client state.
- **Theme / SafeArea** wrap **navigation** so every screen gets insets and tokens without each feature remounting a provider.
- **Don’t** put `QueryClientProvider` inside a single feature — then other features and the shell can’t share cache.

Feature-specific providers (a payments context used only in that stack) can live **in the feature navigator**, not in `app/`. Global = **used across capabilities**.

---

## Root navigation container vs feature screens

The shell owns **`NavigationContainer`** (and linking config). It **does not** own `ConfirmPaymentScreen`.

```tsx
// app/navigation/RootNavigator.tsx — composition only
export function RootNavigator() {
  const { hydrated, isAuthenticated } = useSession();
  if (!hydrated) return <BootstrapSplash />;
  return isAuthenticated ? <AppStack /> : <AuthStack />;
}
```

`AppStack` / `AuthStack` may live next to the shell **or** be re-exported from features. The **screens inside** them are **feature** screens. Full **why** of this switch (back-to-Login, deep links) is [§5](../02-architecture.md) / [04-navigation.md](../04-navigation.md). Here you only need: **container + gate in the shell; business routes in features.**

**Linking** is global: prefixes, screen mapping at the root. Feature stacks **register** their screens; they don’t each create a second `NavigationContainer`.

---

## Global error boundaries

A **JS** error in a subtree should show a recovery UI, **report** to crashlytics, and not leave a white screen. Native crashes are **not** caught by a React boundary — that’s why **crash reporting is initialized early** on both sides.

Boundary in `app/` = **default** for the tree. A feature can add a **nested** boundary around a risky flow (camera, payment sheet) without replacing the global one.

---

## Environment config access

The shell (or `app/config.ts`) is the **typed door** to `API_URL`, flavor, flag defaults. Features call `getConfig().apiBaseUrl`, they do not scatter `process.env.X` in `model/`.

This is **access**, not the full flavor/secrets playbook ([§8](../02-architecture.md)): still **no** privileged secrets in the JS bundle. Boot should not **block** forever on remote config; use **defaults**, then refresh.

---

## Startup sequence — why this order

Boot is a **state machine**, not “run six `useEffect`s in `App.tsx` in source order” (effects don’t give you this sequence).

| Step | What | Why this position |
| --- | --- | --- |
| **1. Native minimum / splash stays up** | Native splash (or RN splash) until JS is ready to show the **right** tree | User doesn’t see a blank/wrong Login. Hide splash **after** hydrate + first nav decision — not on first JS tick. |
| **2. Crash reporting** | Crashlytics / Sentry native + JS | Anything that **throws during hydrate** must be **reported**. Init after hydrate = **blind boot**. |
| **3. Hydrate auth/session** | Read **secure storage**, restore token/session into memory | Navigation’s input. Failure → **logged out**, still proceed — don’t hang on splash forever. |
| **4. Analytics after consent** | Analytics SDK, first events | Fintech/GDPR: **no** identify/track before consent. Also don’t block TTI on analytics. |
| **5. Mount navigation with correct auth** | `NavigationContainer` + auth vs app stack | If you mount **before** hydrate, you get **Login flash**, then replace — or a deep link into a stack that isn’t allowed. |
| **6. Defer non-critical** | Prefetch, secondary SDKs, fonts-that-can-wait | **TTI / startup** stories. Heavy work on the JS thread here **steals** the first interaction. |

**Fonts / remote config:** if the first screen **must** match brand fonts, load **critical** fonts before hide-splash (ties to [assets](../11.%20assets/notes.md)). Remote config can **start** early but **must not** delay crashlytics; **don’t** block navigation on a slow flag fetch — default flags, then apply.

**What “hydrate” means:** async read of session **before** the navigator commits a stack. A `useEffect` in `HomeScreen` that then `reset`s to Login is a **redirect hack** — that’s the next section’s contrast. The shell’s job is **not to mount the wrong tree**.

```ts
// app/bootstrap/runStartup.ts — ordered, await, explicit
export async function runStartup() {
  initCrashReporting();
  const session = await hydrateSession(); // secure storage → memory
  const consent = await readConsent();
  if (consent) initAnalytics();
  return { session, consent };
}
```

Hide native splash **after** `runStartup` and the first paint of the **gated** navigator.

---

## How this shows up in crash and performance stories

**Crash-rate:** boot is a hotspot (MyCreditInfo-style “we stopped dying on launch”). Uncaught hydrate errors, double-init of native SDKs, and mounting UI that touches native **before** the module is ready all look like **random launch crashes**. Sequence + early Crashlytics is how you **see** and then **fix** them.

**Startup time:** step 6 is the **budget**. Init maps, chat, and prefetch **after** first interactive frame ([06-performance.md](../06-performance.md)). Splash that lasts 4s because you awaited **every** SDK is a shell bug, not a Metro bug.

---

## Common mistakes and misconceptions

- **`app/screens/Wallet.tsx`.** Business UI leaked. Shell composes **navigators**, not product screens.
- **Mount `NavigationContainer` immediately, redirect in `useEffect`.** Flash, extra history entries, “back to Login.” Hydrate **then** mount (or keep a **bootstrap** branch that isn’t the auth stack).
- **Crashlytics after `await hydrate()`.** Boot failures never arrive.
- **Analytics on first tick.** Consent and TTI.
- **One `useEffect` soup** with no order guarantees (Strict Mode double-mount, races).
- **Init everything before hide splash.** Looks “safe,” **kills** startup.
- **Remote config as a hard gate** with no timeout — infinite splash.
- **Second `NavigationContainer` in a feature.** Linking and “back” become undefined.
- Treating **Redux** as the shell. The store is **one provider**; it does not replace bootstrap.

---

## Connections to other concepts

`features (capabilities) → app shell (composition + boot) → next: which stack to mount`

- **[Feature layering](../15.%20feature-layering/notes.md):** shell imports **`index.ts` navigators**, not `features/payments/screens/Confirm`.
- **[§5 Navigation architecture](../02-architecture.md):** why `!hydrated` / `!authenticated` / `AppStack` — this unit only **when** to mount.
- **[§8 Environments](../02-architecture.md):** flavors, secrets, `.env` — this unit is **typed access from the shell**.
- **[Assets / splash](../11.%20assets/notes.md):** splash **stays up** until the shell says hide.
- **[Debugging](../12.%20debugging/notes.md) / Crashlytics:** why step 2 exists.
- **[Security](../13-security.md):** hydrate from **secure** storage; consent before analytics.
- **[Threads](../4.%20threads/notes.md):** deferred init is also **don’t block the JS thread** on launch.

---

## Interview perspective

Recite the **six steps in order** and **one sentence why** for crash reporting, hydrate-before-nav, analytics-after-consent, and defer. Then: **no business screens in `app/`**. Map to a **launch crash** or **startup** story if they ask for production.

Spoken (30–60s):

> `app/` is the shell: providers, the root NavigationContainer, a global error boundary, typed config, linking, and an explicit boot sequence. I keep splash up, init crash reporting first, hydrate session from secure storage, start analytics only after consent, then mount navigation already knowing auth — so there’s no login flash. Prefetch and extra SDKs wait. Payment screens don’t live in `app/`; the shell just composes feature navigators.

If they jump to stacks: “That’s the next decision — **conditional navigators**. The shell’s job is **not mounting until hydrate is done**.”

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
