# Nested navigation architecture

## What you need to know

[Building blocks](../33.%20nav-building-blocks/notes.md) said **each navigator has one job**. This unit is the **production tree**, the **nesting rules**, and the **cross-tab** dispatch: **`action not handled`** and **weird back**.

**Typical shape (preserve):**

```text
NavigationContainer
  RootStack
    Bootstrap
    AuthStack
      Login
      Register
      ForgotPassword
    AppTabs
      HomeStack
      WalletStack
      PaymentsStack
      ProfileStack
    ModalStack (optional)
      Receipt
      Help
```

**Rules (preserve):**

- Tabs own **top-level sections**
- Each tab often has its **own stack** for hierarchy
- **Cross-tab** jumps need care (**tab first**, then screen)
- Don’t put every screen in one **giant flat stack** if the product has **clear sections**

**Gotcha (preserve):** navigating to a screen **in another tab** without targeting the **right nested navigator** → **`action not handled`** / **unexpected back**.

**Auth how-you-switch** (hydrate, unmount Login) is the **next** section. This tree is **where names live**. [Nav architecture](../17.%20nav-architecture/notes.md) already argued **Auth and App as siblings**, not Login **under** Home.

---

## How to read the tree

Every **indent** is a **navigator’s child list**. A name is **only** routable by the navigator that **declares** it (or via a **nested** payload that **starts** with a name that navigator **does** declare).

| Slot | Responsibility |
| --- | --- |
| **RootStack** | **Chrome of the app**: bootstrap vs auth vs app vs **overlays** |
| **Bootstrap** | Splash **slot** (often not a “page” you push onto Wallet) |
| **AuthStack** | Logged-out **flow** (Login → Register). **Not** a tab. |
| **AppTabs** | **Sections** of the logged-in product |
| **`*Stack` under a tab** | **Hierarchy** inside that section (Home → TxDetails; Amount → Confirm) |
| **ModalStack** | **Overlays** that must not belong to **one** tab’s history (Receipt, Help) |

**Siblings under Root** means Auth is **not** a screen **inside** AppTabs. If you **push** App onto Auth, hardware back **returns to Login** — that’s the **flat/sibling** bug, expanded in **§3**.

**ModalStack optional:** Receipt from **any** tab without stuffing Receipt into **four** stacks. Dismiss → **same tab** you came from. Amount → Confirm stays on **PaymentsStack** (**card**), not this overlay list.

---

## Rules of nesting (why each one)

**Tabs own sections.** Home / Wallet / Payments / Profile are **peer products**. Switching Wallet → Home is **not** `goBack()`. Tab state (**each stack’s history**) **survives** when you leave the tab (screens often **stay mounted**).

**Each tab has a stack.** Hierarchy (**Tx details**, transfer **steps**) is **push/pop** **inside** the section. Back on Confirm = **Amount**, still **on Payments**, tab bar still **Payments**.

**Not a giant flat stack.** A flat list `{ Login, Home, TxDetails, Amount, Confirm, Receipt }` makes **back** walk **across sections**, **kills** per-tab history, and makes **linking** a **collision** of names.

**Cross-tab: tab first, then screen.** You cannot `navigate('TxDetails')` from **HomeStack** if `TxDetails` is registered only on **WalletStack**. The **first** key in the action must be a name **some ancestor** understands — usually the **tab screen** (`WalletStack`), then nested `screen`.

---

## How `navigate` actually finds a screen

Dispatch starts at the **current** navigator and **bubbles to parents** until one **handles** the **top-level** route name.

```ts
// Current: Home (inside HomeStack). WalletStack registers TxDetails.

// Not handled (HomeStack and Tabs do not declare 'TxDetails')
navigation.navigate('TxDetails', { id });

// Tab first, then screen — Tabs declare 'WalletStack'
navigation.navigate('WalletStack', {
  screen: 'TxDetails',
  params: { id },
});
```

**Nested payload:** `{ screen, params }` is **for the navigator you just landed on**. Deeper:

```ts
// From somewhere that only sees Root / AppTabs
navigation.navigate('AppTabs', {
  screen: 'PaymentsStack',
  params: {
    screen: 'Confirm',
    params: { transferId },
  },
});
```

**Why “tab first”:** `PaymentsStack` is a **tab route**. `Confirm` is **not**. Aim at **`PaymentsStack`**, then **`Confirm`**.

**`action not handled`:** no navigator in the **parent chain** declared that **first** name. Typical: leaf name from **another** tab, or a **root modal** name dispatched on a **stack that doesn’t include it**.

---

## Unexpected back

Even when the screen **opens**, **history** might be wrong:

| What you did | Back does |
| --- | --- |
| Nested navigate **WalletStack → TxDetails** | Pop **TxDetails** → Wallet **home** (good) |
| Pushed **TxDetails onto HomeStack** because you **duplicated** the screen name on both stacks | Back → **Home**, but you **think** you’re in Wallet |
| Opened **Receipt on Root** as a **push** instead of **modal** | Back might **uncover Auth** or **Bootstrap** if those are **under** it in RootStack |
| Switched tab only (`navigate('WalletStack')`) then Android back | Depends on tabs **`backBehavior`** (previous tab vs **exit**) — not the same as **pop** inside a stack |

**Fix:** **one** registration per **leaf** screen (unless you **intentionally** share a component on **two** routes with **two** names). **Modals** on **Root**. **Flows** on the **tab stack** that owns them.

```ts
// CommonActions — same idea, useful when you must set nested state
navigation.dispatch(
  CommonActions.navigate({
    name: 'WalletStack',
    params: { screen: 'TxDetails', params: { id } },
  }),
);
```

---

## Bootstrap / Auth / App on the same diagram

The diagram lists **Bootstrap**, **AuthStack**, **AppTabs** as **RootStack screens**. That is **information architecture**.

**Do not** keep Login **under** Home in **history**. How you **mount** Auth vs App (conditional tree vs `navigate('Home')`) is **[§3](../04-navigation.md)** and [unit 17](../17.%20nav-architecture/notes.md). **This** unit: if a screen is **logged-in hierarchy**, it lives under **AppTabs → some stack**, not on **AuthStack**.

---

## Common mistakes and misconceptions

- **`navigate('Confirm')` from Home** because Confirm is “in the app.”
- **Duplicate screen names** on two stacks so bubbling **hits the wrong** one.
- **Giant flat stack** “simpler.”
- **Receipt inside WalletStack only** — Help/Receipt from Home **can’t** find it (or you **copy** the screen four times).
- **AuthStack as a tab.**
- Thinking **bubble** means **global** names — only **ancestors** see the action.
- **§3** recitation (hydrate) when they asked **how tabs and stacks nest**.

---

## Connections to other concepts

`Root (chrome) → tabs (sections) → stacks (hierarchy) → nested navigate (tab, then screen)`

- **[Building blocks](../33.%20nav-building-blocks/notes.md):** **what** tabs/stacks **are**. This unit: **the map** + **dispatch**.
- **[Nav architecture](../17.%20nav-architecture/notes.md):** Auth **sibling** of App; payment **nested stack**. This unit: **cross-tab** and **ModalStack** slot.
- **[Shell](../16.%20app-shell/notes.md):** Bootstrap **slot** vs **providers**.
- Next: **auth flow** — **swap** Auth/App without **pushing** Home onto Login.
- Later: **linking** config **mirrors this tree**; **reset** after payment (§8).

---

## Interview perspective

Whiteboard the **tree** from memory. Then the **rules**. Then the **gotcha** with a **nested** `navigate` snippet.

Spoken:

> Tabs own top-level sections; each tab has a stack for hierarchy. I don’t flatten the app into one stack. Cross-tab, I navigate to the tab first, then the nested screen — otherwise you get action not handled or back into the wrong section. Receipts live on a root modal stack so they aren’t trapped in one tab.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
