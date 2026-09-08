# Nested navigation architecture — Self-test

## Core recall

1. Recite the production tree from `NavigationContainer` down to one tab stack and ModalStack.
2. Recite the four nesting rules.
3. Recite the common gotcha (symptom + cause).
4. What do **tabs** own vs what does **each tab’s stack** own?
5. Why is **ModalStack** a **sibling** of AppTabs (Receipt / Help)?
6. What must the **first** name in a `navigate` action be, relative to the tree?
7. Write nested `navigate` from Home to Wallet `TxDetails` with `id`.
8. What does **`action not handled`** mean?
9. AuthStack vs AppTabs: **siblings** under Root or Auth **contains** App?
10. Recite the spoken 30–60s nested-architecture answer.

## Explain why

1. Why does each tab need its **own** stack instead of pushing TxDetails onto a **shared** root stack?
2. Why does a **giant flat stack** break **back** and **tab** state?
3. Why “**tab first**, then screen”?
4. Why does `navigate('TxDetails')` from Home fail if TxDetails is only on WalletStack?
5. Why can `navigate('WalletStack')` succeed from Home even though HomeStack doesn’t declare that name?
6. Why put Receipt on **ModalStack**, not only WalletStack?
7. Why is AuthStack **not** a fifth tab?
8. Why can **duplicate** screen names on two stacks cause **unexpected back** even if the screen **opens**?
9. Why might Android **back** after a tab switch **not** pop a stack screen?
10. Why does this tree **not** yet explain **hydrate-then-swap**?

## Compare and contrast

1. AppTabs vs a tab’s `*Stack`.
2. Nested `navigate({ screen, params })` vs a leaf `navigate('Confirm')`.
3. ModalStack vs pushing Receipt onto PaymentsStack.
4. Giant flat stack vs this production shape.
5. Bubble-to-parent vs “global route names.”
6. This unit vs [building blocks](../33.%20nav-building-blocks/notes.md).
7. This unit vs [nav architecture](../17.%20nav-architecture/notes.md) Auth/App **swap**.
8. `backBehavior` on tabs vs **pop** inside a stack.

## Predict the output

1. From Home: `navigation.navigate('Confirm')`. Confirm exists only on PaymentsStack. Result?

2. From Home: `navigation.navigate('WalletStack', { screen: 'TxDetails', params: { id: '1' } })`. Result? Back from TxDetails?

3. TxDetails registered on **both** HomeStack and WalletStack. From Home: `navigate('TxDetails', { id })`. Which stack? Back?

4. User on Payments **Confirm**. `navigate('Receipt')` but Receipt is only under **ModalStack** on Root, and the action **doesn’t** bubble to Root (you dispatched in a way that doesn’t). Typical log?

5. All of Login, Home, Amount, Confirm in **one** stack. After Confirm, hardware back twice. Where?

6. Nested navigate to Wallet **TxDetails** (correct). Then Android back with tabs `backBehavior: 'history'`. Contrast with **pop** on TxDetails.

## Debugging

1. Notification handler `navigation.navigate('TransferDetails', { id })`. Screen lives at `AppTabs → PaymentsStack → TransferDetails`. Log: action not handled. Fix shape?

2. Home and Wallet both list txs; both `navigate('TxDetails')`. Wallet’s details open **without** switching tab. Diagnose.

3. Receipt opened; back shows **Login** though session is valid. How did Root **history** get that way?

4. Review: “simpler to register every screen on RootStack and hide the tab bar.” What product bugs?

5. `navigate('AppTabs', { screen: 'Confirm' })`. Confirm is not a **tab** name. Symptom?

6. Help screen works from Profile, not from Home. Help is a **ProfileStack** screen. Fix?

## Application

1. Recite tree, four rules, gotcha, spoken answer.

2. Sketch nested navigate: AppTabs → PaymentsStack → Confirm with `transferId`.

3. Classify each: Login; Wallet home; TxDetails; Amount; Receipt; Bootstrap.

4. PR rule for cross-tab navigation.

5. Where would you register a **KYC** three-step flow vs a **PDF receipt**?

6. One-line: sibling Auth vs App — what **must not** appear in **history**.

## Interview questions

1. Draw how you’d nest navigators for a wallet app.  
   **Follow-up:** Why not one stack?

2. User is on Home; you need Wallet transaction details. How do you navigate?  
   **Follow-up:** What if you don’t target the nested navigator?

3. Where do modals like Receipt live?

4. What does “action not handled” mean?

5. Tabs vs stacks — who owns what?

## Connections

1. How does this **use** [building blocks](../33.%20nav-building-blocks/notes.md) “nearest navigator”?
2. How does the tree **match** [unit 17](../17.%20nav-architecture/notes.md) payment nested stack?
3. Why [linking](../04-navigation.md) config will **mirror** this indent tree?
4. What does **§3** add that this diagram **doesn’t**?
5. How does [derived-state](../32.%20derived-state/notes.md) still apply to **params** on nested `TxDetails`?
