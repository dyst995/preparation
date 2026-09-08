# Nested navigation architecture — Answers

## Core recall

1. Container → RootStack → Bootstrap, AuthStack (Login/Register/Forgot), AppTabs (Home/Wallet/Payments/Profile **stacks**), optional ModalStack (Receipt, Help).
2. Tabs own sections; each tab a stack; cross-tab **tab then screen**; no giant flat stack.
3. Cross-tab without targeting the **nested** navigator → **`action not handled`** / **wrong back**.
4. **Tabs:** sections. **Stack:** hierarchy **inside** that section.
5. Overlay **not trapped** in one tab’s history; dismiss returns to **current** tab.
6. A name **an ancestor navigator declares** (often the **tab**), not a foreign **leaf**.
7. `navigation.navigate('WalletStack', { screen: 'TxDetails', params: { id } })`.
8. **No** navigator in the parent chain handled the **first** route name.
9. **Siblings** under Root — App is **not** inside Auth.
10. **Tabs own sections; each tab a stack; don’t flatten; cross-tab tab-then-screen; Receipt on root modal stack.**

## Explain why

1. Back stays **in the section**; tab history **independent**. Root-pushed details **steal** back from **every** tab.
2. Back **crosses** sections; you **lose** per-tab stacks; **names collide**.
3. The **tab navigator** knows **WalletStack**, not `TxDetails`. Nested `screen` runs **after** you hit that tab.
4. HomeStack **doesn’t declare** it; Tabs don’t either **as a direct child**. First key is the leaf → **not handled**.
5. Action **bubbles**; Tabs **do** declare `WalletStack`.
6. Any section can open it; **one** registration; back **dismisses**, doesn’t **pop Wallet** wrongly.
7. Logged-out **flow**, not a **logged-in section**. A Login tab is **redirect soup**.
8. Bubbling **hits the nearest** `TxDetails` — **HomeStack**. Back **pops Home**, tab bar still **Home**.
9. Tab back is **`backBehavior`**, not stack **pop**. You **switched section**, didn’t **push**.
10. The diagram is **where names live**. **Mount/swap** Auth vs App is **§3**.

## Compare and contrast

1. **Which section** vs **how deep in that section**.
2. **Target a navigator then a child** vs **hope a leaf is global**.
3. **Root overlay** vs **part of the payment stack** (back through Confirm/Amount).
4. **IA with jobs** vs **one history tape**.
5. **Ancestors only** vs **app-wide name registry** (there isn’t one).
6. **Primitives** vs **the production map + dispatch**.
7. **This:** layout. **17 / §3:** **conditional** Auth vs App, no Login under Home.
8. **Leave a tab** vs **pop a screen** on the **current** stack.

## Predict the output

1. **`action not handled`** (unless some ancestor **also** registered Confirm).
2. **Wallet tab + TxDetails**. Back → **Wallet home** (pop).
3. **HomeStack’s** TxDetails. Back → **Home**. Tab may **never** switch to Wallet.
4. **`action not handled`** (first name `Receipt` unknown to Payments/Tabs).
5. **Amount**, then **Home** (or Login) — **cross-section** back. Tabs **didn’t exist**.
6. **Pop TxDetails** first (stack). After you’re on Wallet **home**, Android back may **return to previous tab** (`history`), not pop **HomeStack**. Different **layers**.

## Debugging

1. `navigate('AppTabs', { screen: 'PaymentsStack', params: { screen: 'TransferDetails', params: { id } } })` (or start at `PaymentsStack` if that’s in the parent chain).
2. **Same route name** on HomeStack; action **never left** Home. **Rename** or always nested-navigate to **WalletStack**.
3. App was **pushed on Auth** (or Login still **under** App on Root). Auth/App must be **siblings** + **swap**, not push.
4. **No tab history**, back **through** unrelated screens, **hidden** tab bar **lies**.
5. Tabs don’t have a screen **Confirm**. **Not handled** (or wrong screen). Use `PaymentsStack` then `Confirm`.
6. Register Help on **ModalStack** (or nested-navigate **ProfileStack → Help**). Don’t expect HomeStack to know Help.

## Application

1. Tree + four rules + gotcha + spoken paragraph.
2. `navigate('AppTabs', { screen: 'PaymentsStack', params: { screen: 'Confirm', params: { transferId } } })`.
3. Login: **AuthStack**. Wallet home: **tab stack root**. TxDetails/Amount: **tab stacks**. Receipt: **ModalStack**. Bootstrap: **Root slot**.
4. **Navigate to the tab (stack) name, then `screen` + params. Never assume leaf names are global.**
5. KYC: **feature stack** (Profile or dedicated). Receipt PDF: **ModalStack**.
6. **Login must not sit under Home in the back stack.**

## Interview questions

1. **Spoken:** Draw Container → Root (Bootstrap, AuthStack, AppTabs, optional ModalStack). Tabs: Home/Wallet/Payments/Profile **each a stack**.  
   **Follow-up:** Flat stack **destroys** section back and tab history.

2. **Spoken:** `navigate('WalletStack', { screen: 'TxDetails', params: { id } })`.  
   **Follow-up:** **`action not handled`** or you open a **duplicate** on the **current** stack — **wrong back**.

3. **Spoken:** **Root ModalStack** so any tab can present them; dismiss **doesn’t** rewrite a tab’s flow.

4. **Spoken:** No ancestor **declared** the **first** route name in the action.

5. **Spoken:** Tabs = **top-level sections**. Stacks = **hierarchy** inside a section.

## Connections

1. Dispatch is **not global**; **nearest then bubble**. Nested payload **names the child** of the navigator you **hit**.
2. Payments **Amount→Confirm** is **PaymentsStack** under **AppTabs** — same as 17.
3. Linking `screens` **indent** the same way or URLs **don’t** resolve.
4. **Hydration gate**, **conditional trees**, **no navigate('Home') on login**.
5. Nested params still **ids**, not a **copied tx object**.
