# Navigation resets and flow completions — Answers

## Core recall

1. **Logout; onboarding done; payment success (no back to Confirm); org/account switch.**
2. **`CommonActions.reset`; replace instead of endless pushes; nested reset.**
3. **Reset to Receipt with params, or replace confirm screens so back is wallet home, not Amount.**
4. **Replaces that navigator’s route list** (`routes` + `index`).
5. **Replace:** swap **current** only. **Reset:** **new** history.
6. **Back returns to Confirm** → **second send** UX.
7. **Reset one flow stack** without wiping **other tabs**.
8. **Tree swap** (App **unmounts**). Not Login **on** Home.
9. So **back** can’t reopen the **previous org’s** screens (and stale **params**).
10. **Reset when history would be wrong. Payment: nested reset/replace so back isn’t Confirm. Logout is session tree swap. Don’t Root-reset every transfer.**

## Explain why

1. Confirm is a **submit** surface. **Back** looks like **retry**.
2. **Amount remains**; curriculum wants **wallet home**, not amount **entry**.
3. **Destroys** other tabs’ stacks — feels like **killing** the session UI.
4. **Welcome stays under** Home → **back** undoes onboarding.
5. Login **mustn’t** sit **under** Wallet. **`reset` to Login** on the **same** tree **often leaves** App **below** or **desyncs** session.
6. **Nav history** + **RQ** still hold **org A**.
7. Receipt **refetches**; DTO **stale**.
8. **`popToTop`** = stack **root**, **no** Receipt. OK if **success toast** on **home**; not if **Receipt is required**.
9. **Illegal/confusing** **back** into **money** steps.
10. **Receipt isn’t a tab.** Tabs **won’t handle** that name → **not handled** / **wrong** chrome.

## Compare and contrast

1. **New history** vs **swap top** vs **append**.
2. **One stack** vs **whole app**.
3. **Unmount App** vs **imperative Login route**.
4. **Home only** vs **Home + Receipt** (back from Receipt = home).
5. **Dismiss** to **current tab** vs **Receipt in** the **flow** stack.
6. Auth = **when trees exist**. This = **history inside App** (and Auth **root**).
7. **Who owns** PaymentsStack — that’s **who you reset**.
8. **Open** Details vs **destroy** Confirm after **success**.

## Predict the output

1. **Confirm.** **Double pay** risk.
2. **Amount.**
3. **Nothing** (or exit that stack) — **only** Receipt; **no** home **under** it unless you **included** WalletHome. If **only** Receipt, back may **leave the stack** / **exit tab** depending on parent. (Interview: **include WalletHome** at index 0 if you want **back → home**.)
4. **Wiped** — TxDetails **gone**.
5. **Wallet/Home** if App **still under** Login — **classic leak**.
6. **Welcome.**

## Debugging

1. **Pushed** Receipt. **Reset/replace** so Confirm **gone**.
2. **Root reset.** **Nested** PaymentsStack only.
3. **Pop/reset Amount** too, or reset to **`[WalletHome, Receipt]`**.
4. **Didn’t reset** that **stack** (and maybe **RQ**).
5. **App** is **gone** if xor works. **Reset Auth** to **Login** so **Register** isn’t **under**.
6. **`action not handled`** / wrong navigator. Reset **PaymentsStack** or **ModalStack**.

## Application

1. Four cases + tools + payment line + spoken paragraph.
2. `reset({ index: 1, routes: [{ name: 'WalletHome' }, { name: 'Receipt', params: { transferId } }] })` dispatched **on / nested into** PaymentsStack.
3. Login success: **session swap**. Pay success: **nested reset**. Onboarding: **reset** to App. 401: **logout swap**. Org: **nested reset + caches**.
4. **…land on Confirm or Amount.**
5. **Logout = unmount App. Payment = nested history rewrite.**
6. **Modal:** dismiss → tab. **Stack reset:** Receipt **in** payments; back → **WalletHome**.

## Interview questions

1. **Spoken:** **Clear session**; **App unmounts**; **fresh Auth** (Login **root**). That’s the **reset**. Not `reset` Login **onto** Home.  
   **Follow-up:** **Nested `reset`** PaymentsStack to **Receipt + home**; **no** back to Confirm.

2. **Spoken:** **Replace** = **one** screen. **Reset** = **new** stack. Payment needs **more than** replace if **Amount** remains.

3. **Spoken:** **Only the flow’s navigator** so **other tabs** survive.

4. **Spoken:** **Reset** so **slides aren’t** under tabs.

5. **Spoken:** **Reset nested stacks** + **clear server cache**. Don’t **back** into the **other** tenant’s Confirm.

## Connections

1. Logout **bullet** in this list is **implemented** as **xor**, not Login **push**.
2. **PaymentsStack** is the **unit** of payment **history**.
3. Confirm **still mounted** in history → **second tap** = **new** mutate.
4. **`transferId`** on Receipt; **fetch**.
5. **Reset** can **remount** or **reuse** depending on **whether** WalletHome **stayed** in the new `routes`. **Focus** ≠ **mount** is **next**.
