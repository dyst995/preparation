# Navigation architecture (auth stack vs app stack)

## What you need to know

The [app shell](../16.%20app-shell/notes.md) **when** to mount: hydrate first, then navigation. This unit is **which tree** you mount and **why the back stack is a product of that choice**.

**Pattern:** one root that is a **state machine**, not a single stack you `navigate` through.

```text
RootNavigator
  if !hydrated: Splash/Bootstrap
  if !authenticated: AuthStack
  else: AppStack (tabs/drawer + nested stacks)
```

**Why this matters:**

- Prevents **“go back to Login”** after you already entered the app
- Makes **deep links** easier (wait for hydrate, then the **correct** tree exists)
- Clarifies **who owns session state** (auth feature + secure storage — navigation **reads** it)

Topics this unit completes:

- **Conditional navigators** vs runtime **redirect hacks**
- Where **session** lives
- **Payment** (and similar) flows as **nested stacks**
- **Modal** vs **push**

Navigator APIs (native stack vs JS stack, TS param lists, notification routing, `adb` link tests) live in [04-navigation.md](../04-navigation.md). Don’t recite `useFocusEffect` if you can’t explain **why Login is not under Home in the same stack**.

---

## The three-way root

| Branch | User-visible | History |
| --- | --- | --- |
| **`!hydrated`** | Splash / bootstrap | **Not** Login, **not** Home — you have not **chosen** a stack |
| **`!authenticated`** | `AuthStack` (Login, Register, Forgot) | Auth screens only |
| **authenticated** | `AppStack` | Tabs + nested feature stacks — **Login is not in this tree** |

Login **success** does not `navigation.navigate('Home')`. It **sets session** (`isAuthenticated = true`). React **unmounts** `AuthStack` and **mounts** `AppStack`. There is **no** Login entry underneath Home.

Logout / forced 401: **clear session** (and typically in-memory cache). `AppStack` **unmounts**. You cannot `goBack()` into Wallet. `AuthStack` is a **fresh** tree.

```tsx
function RootNavigator() {
  const { hydrated, isAuthenticated } = useSession(); // from auth feature

  if (!hydrated) return <BootstrapSplash />;
  return isAuthenticated ? <AppStack /> : <AuthStack />;
}
```

`useSession()` is **not** “navigation state.” It is **session state** the root **reads**.

---

## Conditional navigators vs redirect hacks

**Conditional (recommended):** the **navigator tree itself** depends on auth. Switching is a **render** of a different subtree.

**Redirect hack:** always mount a giant stack (`Login` + `Home` + …) and after hydrate `reset` / `navigate('Home')` / `replace`. Or mount Home first and `useEffect` → `navigate('Login')`.

| | Conditional trees | Redirect soup |
| --- | --- | --- |
| Back after login | Login **is gone** (unmounted) | Login often **still under** Home → hardware back / gesture returns to Login |
| Source of truth | Session boolean | A pile of `navigate` calls that can **desync** from session |
| Deep link | Resolve **after** hydrate against **one** tree | Link may fire while Login is still the current route; or land on a screen that then **bounces** |
| Logout | Unmount app tree | Must **manually** `reset` the stack; easy to miss a nested navigator |

```tsx
// Hack — Login remains in history
function LoginScreen() {
  const nav = useNavigation();
  async function onSuccess() {
    await saveSession(tokens);
    nav.navigate('Home'); // Home pushed ON TOP of Login
  }
}
```

Hardware back on Android / swipe-back on iOS then **shows Login** with a valid session — the classic bug.

**401 mid-session:** don’t `navigate('Login')` on top of ConfirmPayment. **Set session to logged out** (and cancel in-flight UI). The root swaps trees. Optional: remember a **return URL** for after re-login (deep-link queue) — still not a Login **push**.

---

## Where session state lives

**Owner:** **`features/auth`** (model + secure storage + `useSession` / provider). Tokens **at rest** in **secure storage**, not AsyncStorage-as-default and not a Zustand store as the **only** copy of the refresh token.

**Navigation:** **consumer**. `RootNavigator` reads `hydrated` and `isAuthenticated`. Feature screens may read `user` for UI; they must **not** each invent a second “am I logged in?” from a random flag.

**Shell:** [calls hydrate at boot](../16.%20app-shell/notes.md). Auth feature **implements** the read/write. Don’t put `LoginScreen.tsx` in `app/` **or** keep session only inside a navigator param.

**Edge:** hydrate **fails** → treat as **logged out**, still leave `hydrated === true` so you don’t splash forever.

---

## Nested stacks: payments (and any multi-step flow)

`AppStack` is usually **tabs** (or drawer) of **sections**. Each tab that has **hierarchy** gets its **own stack**.

A **payment** (transfer, KYC) is a **flow**: Amount → Confirm → (maybe) 3DS → result. That is a **nested stack**, not five sibling tab screens.

```text
AppStack
  AppTabs
    HomeStack
    WalletStack
    PaymentsStack      ← Amount, Confirm, Status
    ProfileStack
  # or a root-level PaymentsStack presented from a tab
```

**Why a nested stack:**

- **Back** means **previous step**, not a random tab
- You can **`reset`** that stack when the flow **completes** without resetting the whole app
- Deep link `.../payments/confirm` maps to **PaymentsStack → Confirm**, not a flat name collision

**Don’t** put every screen in **one** giant stack “to keep it simple” — back behavior and tab state fall apart. Don’t start a payment by `navigate('Confirm')` on the **tab navigator**; target the **nested** stack (the “action not handled” gotcha in [04-navigation](../04-navigation.md)).

---

## Modal vs push

Both are **how a screen is presented**, not a third auth tree.

| | **Push** (card / stack) | **Modal** |
| --- | --- | --- |
| Meaning | **Deeper** in a flow (Confirm after Amount) | **Overlay** (receipt, help, picker, “not the next chapter”) |
| Back | Pop to previous **step** | **Dismiss**; often shouldn’t leave you “inside” the flow’s next page |
| Auth | Irrelevant — still **inside** AuthStack or AppStack | Same — a modal is **not** a way to show Login on top of Home |

Fintech: **PIN / biometric sheet** and **receipt** are often **modal**. **Amount → Confirm** is **push**. Using a modal for Confirm **and** putting Login in a modal over Home is how you reinvent redirect soup.

---

## Deep links (architecture, not the URL handbook)

Because **only one** of Auth/App is mounted:

1. Cold start with `myapp://wallet/...`
2. Stay on **Bootstrap** until **hydrated**
3. If logged out: **AuthStack** (optionally **queue** the URL)
4. If logged in: the **App** tree exists, so linking can resolve **WalletStack**

If Login and Home share one stack, a link can **race** `navigate` while you’re still on Login. Full prefixes, universal links, and security (“don’t trust params”) are [04-navigation.md](../04-navigation.md) §6.

---

## Common mistakes and misconceptions

- **`navigate('Home')` on login / `navigate('Login')` on 401.** Trees should **swap** with session.
- **No `hydrated` branch.** Login flash (shell unit) **and** links that hit the wrong tree.
- **Session only in navigation params.** Kill the app, params are gone; tokens belong in **secure storage**.
- **Login as a modal on AppStack.** Back stack and “is this user authenticated?” diverge.
- **One flat stack** for the whole fintech app.
- **Payment Confirm as a tab.** Tabs are **sections**, not wizard steps.
- Answering with **native stack vs JS stack** when they asked **auth architecture**.

---

## Connections to other concepts

`shell (when) → this unit (which tree) → 04-navigation (APIs, types, links, push)`

- **[App shell](../16.%20app-shell/notes.md):** splash + hydrate **before** this switch runs. Same `hydrated` flag.
- **[Feature layering](../15.%20feature-layering/notes.md):** `AuthStack` / `PaymentsStack` are **public** feature navigators; screens stay in features.
- **[04-navigation.md](../04-navigation.md):** nesting rules, types, params vs fetch, push → screen, reset on logout **in API detail**.
- **[State chapter](../03-state-management.md):** session is **auth state**, not “put the user in Redux **instead of** a tree swap.”
- **[Security](../13-security.md):** secure storage for tokens; deep links don’t grant access by themselves.

---

## Interview perspective

Draw the **three-way** root. Say **state swaps trees**, not `navigate`. One example: **back to Login**. One example: **deep link waits for hydrate**. Payments = **nested stack**. Modal ≠ Login overlay.

Preserve this spoken answer:

> I gate on hydrated auth state. Unauthenticated users get an Auth stack; authenticated users get the App stack. Switching is driven by state, not by manually navigating between login and home. That prevents back-stack leaks and simplifies deep linking.

If they ask “where does session live?”: **auth feature + secure storage**; the root **reads** `hydrated` / `isAuthenticated`. If they ask nested payments: **flow stack** so back is a step; tabs stay sections.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
