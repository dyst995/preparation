# React Navigation building blocks

## What you need to know

This is the **toolkit**: which navigator **is** what, how they **nest**, where **`NavigationContainer`** sits, and the **hooks/options** you actually touch. [Nav architecture](../17.%20nav-architecture/notes.md) already answered **Auth vs App trees**. **Nested production shape** and **cross-tab** targeting are the **next** section of [04-navigation.md](../04-navigation.md). **Deep-link security / `adb`** and **focus-driven refetch** are later still.

**Learn:**

- Native Stack vs JS Stack
- Bottom Tabs
- Drawer (if used)
- Nested navigators
- `NavigationContainer` + linking config
- `useNavigation`, `useRoute`, `useFocusEffect`
- Screen options, headers, **presentation** (modal / card)

**Native vs JS (preserve):**

- **Native Stack:** platform native navigation primitives; generally better transitions / performance / feel.
- **JS Stack:** more flexible in some edge cases; **native stack is the usual default today**.

Preserve:

> I default to native stack for platform-feel and performance, nest tab navigators for primary sections, and push feature stacks for flows like transfers or KYC. Nesting is deliberate — each navigator has a clear responsibility.

---

## What a navigator is

A **navigator** is a **component that owns navigation state**: which **child screens** exist and which is **active** (a **stack** of names, a **selected tab**, a **drawer** open/closed).

Screens are **not** a global router. `navigate('Confirm')` is handled by **some** navigator in the tree. If that navigator **doesn’t know** `Confirm`, the action is **not handled** (full gotcha next section). **Mental model:** dispatch goes **inward** to a navigator that **declares** that route.

**Why nest:** one navigator **cannot** honestly mean both “which **section** of the bank” (tabs) and “which **step** of a transfer” (stack). Mixing those in **one** flat stack is how **back** leaves the tab bar or **jumps** sections.

---

## Native Stack vs JS Stack

Both are **stack** navigators: push / pop, header, back gesture. The difference is **who draws the transition**.

| | **Native Stack** (`@react-navigation/native-stack`) | **JS Stack** (`@react-navigation/stack`) |
| --- | --- | --- |
| **What** | Wraps **UINavigationController** / Android native stack (**react-native-screens**) | Transitions **driven in JS** (Animated) |
| **Why default** | Platform **interactive pop**, cheaper, **feels native** | Custom interpolators / some header tricks native stack **doesn’t** expose |
| **Interview** | **Default** for app and feature flows | “I need a **weird** transition” — not “JS is more React” |

**Not:** Native Stack vs **Bottom Tabs**. Tabs are a **different** navigator **type**. Native vs JS is **which stack implementation**.

**Practical:** EasyPay-shaped apps: **native-stack** for Auth, for each tab’s stack, for KYC/transfer. Reach for JS stack only with a **specific** missing API.

---

## Bottom Tabs and Drawer

**Bottom Tabs:** primary **sections** that **stay** in the product: Home, Wallet, Payments, Profile. Switching tabs is **not** a push. Screens in **inactive** tabs often **stay mounted** — that is why **`useEffect` ≠ focus** (see hooks).

**Drawer:** another **section switcher** (hamburger, tablets, settings-heavy). Same idea as tabs: **sibling** destinations, **not** a flow. Many fintech apps **skip** it and use **tabs + stacks**. If you use both, **one** is the section switcher — don’t **double** chrome.

**Don’t** put Amount → Confirm as **two tabs**. That’s a **stack**.

---

## Nested navigators (deliberate responsibility)

**Nesting:** a **screen** of navigator A **renders** navigator B.

```text
NavigationContainer
  NativeStack (root: only “which chrome”)
    AppTabs          ← Bottom Tabs: sections
      HomeStack      ← Native Stack: Home → TxDetails
      WalletStack
      PaymentsStack  ← Native Stack: Amount → Confirm → Status  (transfer / KYC)
      ProfileStack
```

| Navigator | Responsibility |
| --- | --- |
| **Tabs** | **Where** in the product (section) |
| **Feature stack** | **How deep** in a **flow** (transfer, KYC) |
| **Root stack** (later) | Auth vs App, **modals** overlaying the app — **architecture** unit |

**Spoken answer is this table.** Tabs for **primary sections**; **push feature stacks** for **transfers or KYC**; each navigator **one job**.

A screen in `PaymentsStack` calling `navigation.navigate('Confirm')` talks to **PaymentsStack**. It does **not** magically find a `Confirm` on **HomeStack**. **How** to jump tabs is the **next** section.

---

## `NavigationContainer` and linking config

**One** `NavigationContainer` at the **app** root (inside providers: QueryClient, session — [shell](../16.%20app-shell/notes.md)). It:

- Holds the **navigation state** (or hydrates it)
- Provides context for **`useNavigation` / `useRoute`**
- Accepts **`linking`**: prefixes + a **path → screen** map that **mirrors the tree**

```tsx
<NavigationContainer
  linking={{
    prefixes: ['myapp://', 'https://app.example.com'],
    config: {
      screens: {
        AppTabs: {
          screens: {
            PaymentsStack: {
              screens: { TransferDetails: 'transfers/:id' },
            },
          },
        },
      },
    },
  }}
>
  <RootNavigator />
</NavigationContainer>
```

**Why the config looks nested:** URLs map onto **nested navigators**, not a flat screen list. **Prefixes, auth wait, don’t trust params, `adb`** — [04-navigation §6](../04-navigation.md). Here: **container owns linking**; **shape follows the tree**.

**`onReady` / `ref`:** needed when **code outside** the tree navigates (notifications). Don’t scatter `navigate` before the container is **ready**. Details later.

---

## Hooks: `useNavigation`, `useRoute`, `useFocusEffect`

**`useNavigation()`:** the **navigation prop** for the **nearest** navigator. `navigate`, `goBack`, `setOptions`. Typing is a **later** section — without types it’s easy to `navigate('Tyop')`.

**`useRoute()`:** **this screen’s** `name` + **`params`**. Params are **this journey’s** ids/flags ([params vs fetch](../04-navigation.md) later). Don’t treat `route.params.user` as canonical profile ([derived-state](../32.%20derived-state/notes.md)).

**`useFocusEffect`:** like `useEffect`, but the callback runs when the screen **gains focus**, and cleanup when it **blurs** (or unmounts). Import from `@react-navigation/native`.

**Why it exists:** in **tabs**, the Wallet screen **stays mounted** when you switch to Home. `useEffect([])` ran **once**. Pull-to-refresh / refetch-on-visit / analytics **on focus** need **`useFocusEffect`**. Full refetch patterns are [§9](../04-navigation.md). **Building block:** **focus ≠ mount**.

```ts
useFocusEffect(
  useCallback(() => {
    // focused
    return () => {
      // blurred
    };
  }, []),
);
```

Wrap the inner function in **`useCallback`** so you don’t **re-subscribe** every render.

---

## Screen options, headers, presentation

**Screen options:** per-screen or `screenOptions` on the navigator: `title`, `headerShown`, `headerBackVisible`, `gestureEnabled`, `animation`.

**Headers:** native stack **native** header is cheapest. Custom `header` components cost **JS** layout — [performance](../04-navigation.md) later: jank is often **the screen**, not the navigator.

**Presentation** (native stack): **how** the screen is **shown**, not a new navigator type.

| Mode | Meaning |
| --- | --- |
| **`card`** (default) | **Push** — deeper in a flow |
| **`modal`** / **`transparentModal`** | **Overlay** — receipt, help, picker |

Same distinction as [modal vs push](../17.%20nav-architecture/notes.md): Confirm is **card**; receipt often **modal**. Presentation is an **option** on a **stack screen**, not a reason to put **Login** over **Home**.

---

## Common mistakes and misconceptions

- **JS stack** because “React Navigation is JS.” **Native stack** is still RN; it **hosts native** controllers.
- **One giant stack** of every screen + tabs **inside** a random screen with **no** clear job.
- **Two** `NavigationContainer`s (breaks linking and `navigate` from the wrong tree).
- **`useEffect` for “every time I see this tab.”**
- **`useFocusEffect` without `useCallback`** — subscribe/unsubscribe storm.
- **`useNavigation`** assumed to see **all** route names in the app.
- Modal **presentation** confused with **Auth vs App**.
- Linking config **flat** while the tree is **nested** — links don’t resolve.

---

## Connections to other concepts

`Container (one) → nested navigators (each one job) → native stack default → tabs for sections / stacks for flows → hooks read the nearest navigator`

- **[Nav architecture](../17.%20nav-architecture/notes.md):** **which tree** (Auth/App). This unit: **which primitive** inside App.
- **[App shell](../16.%20app-shell/notes.md):** providers **around** the container; splash **before** you care which stack.
- **[State taxonomy](../23.%20state-taxonomy/notes.md):** **navigation state** owned by React Navigation — **don’t** mirror `currentRoute` in Zustand.
- Next: **nested architecture** (tabs own sections, cross-tab navigate). Then **auth flow** (you already have the **tree** idea).

---

## Interview perspective

They want **native default**, **tabs vs feature stacks**, **nesting is deliberate**. Follow-ups: JS stack **when**; **`useFocusEffect`** vs `useEffect`; **what `NavigationContainer` is for**.

Don’t start with **param lists** or **`adb`**. Those are later questions.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
