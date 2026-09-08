# Navigation resets and flow completions — Self-test

## Core recall

1. Recite the four **when to reset** cases.
2. Recite the three tools/concepts.
3. Recite the **payment success** example (Receipt vs back-to-amount).
4. What does `CommonActions.reset` do to a navigator’s **history**?
5. What does **`replace`** do vs **reset**?
6. Why is **`navigate('Receipt')`** after Confirm **unsafe**?
7. What is a **nested** reset for?
8. Logout: prefer **tree swap** or **reset to Login on Home’s stack**?
9. After org switch, why reset **nested** stacks?
10. Recite the spoken 30–60s reset answer.

## Explain why

1. Why must payment **Confirm** leave the back stack?
2. Why isn’t **`replace('Receipt')`** on Confirm enough if **Amount** is still underneath?
3. Why **not** `reset` **Root** after every transfer?
4. Why onboarding **reset** instead of `navigate('Home')` on top of slides?
5. Why logout **xor unmount** is a stronger “reset” than `reset({ Login })` **on App**?
6. Why org switch is **navigation** reset **and** **cache** clear?
7. Why Receipt params should be **`transferId`**, not the confirm DTO?
8. Why `popToTop` might skip **Receipt** (and when that’s OK)?
9. Why endless **push** of “success” screens is a **product** bug, not just messy?
10. Why **nested** reset must **name** `PaymentsStack` state, not only `{ name: 'Receipt' }` at Root?

## Compare and contrast

1. `reset` vs `replace` vs `navigate`/`push`.
2. Nested reset vs Root reset.
3. Logout tree swap vs `CommonActions.reset` to Login.
4. `popToTop` vs reset to `[WalletHome, Receipt]`.
5. Modal Receipt vs Receipt **on** PaymentsStack after reset.
6. This unit vs [auth flow](../35.%20auth-flow-patterns/notes.md).
7. This unit vs [nested architecture](../34.%20nested-nav-architecture/notes.md).
8. This unit vs [notification routing](../39.%20notification-routing/notes.md) (enter vs **clear**).

## Predict the output

1. Amount → Confirm → `navigate('Receipt')`. User hits back. Screen? Risk?

2. `Amount → Confirm` then `StackActions.replace('Receipt')`. Back from Receipt?

3. `reset({ index: 0, routes: [{ name: 'Receipt', params: { transferId } }] })` **on PaymentsStack**. Back from Receipt?

4. Same reset **on Root** while other tabs had TxDetails open. Those tab stacks?

5. Logout: `reset` to Login **without** unmounting App. Hardware back from Login?

6. Onboarding: `navigate('AppTabs')` **on** Welcome stack. Back?

## Debugging

1. After pay, Android back shows **Confirm**; they can tap Send again. Diagnose.

2. Transfer success **resets Root**; users complain **Home scroll / Wallet filters** died. Diagnose.

3. `replace` Confirm → Receipt; PM still sees **Amount** on back. What extra is needed?

4. Org switch: balances update, **back** still **Org A Confirm**. Diagnose.

5. Logout checklist skipped **nav**; xor trees used. Is App still a problem? What about **Auth** Register under Login?

6. Nested reset `routes: [{ name: 'Receipt' }]` at **AppTabs** level (Receipt not a tab). Symptom?

## Application

1. Recite when-list, tools, payment example, spoken answer.

2. Sketch `CommonActions.reset` to `[WalletHome, Receipt]` on **PaymentsStack**.

3. Classify: login success; pay success; onboarding done; 401; org switch — **swap / nested reset / replace**.

4. PR rule: “After money success, back must not …”

5. One-line: logout vs payment **reset**.

6. Choose Receipt **modal** vs **stack reset** — one sentence each.

## Interview questions

1. How do you reset navigation after logout?  
   **Follow-up:** After a **payment**?

2. `reset` vs `replace`?

3. Why nested reset?

4. User finishes onboarding — what happens to the welcome stack?

5. Multi-tenant org switch — what do you reset?

## Connections

1. How does this **complete** [auth](../35.%20auth-flow-patterns/notes.md) without replacing xor trees?
2. How does [PaymentsStack](../34.%20nested-nav-architecture/notes.md) tell you **what** to reset?
3. How does [optimistic Confirm](../31.%20optimistic-ui/notes.md) get **worse** if Confirm stays in history?
4. Why [params vs fetch](../37.%20params-vs-fetch/notes.md) still applies to Receipt after reset?
5. Next is **focus** — does **reset** **remount** WalletHome?
