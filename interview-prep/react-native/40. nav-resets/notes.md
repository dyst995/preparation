# Navigation resets and flow completions

## What you need to know

[Auth flow](../35.%20auth-flow-patterns/notes.md) **unmounts** App on logout so Login is **not** under Home. This unit is the **other** history problem: **push, push, push** until **back** returns to a **dead** step (Amount, onboarding slide, **Org A** Confirm).

**When to reset (preserve):**

- **Logout**
- Finished **onboarding**
- Completed **payment** that shouldn’t back into **Confirm / Amount**
- Switching **organizations / accounts** (multi-tenant)

**Tools (preserve):**

- `CommonActions.reset`
- **Replace** instead of endless **pushes**
- **Nested reset** when needed

**Payment success (preserve):** after success, **reset to `Receipt`** with params, **or replace** confirm screens so **back goes to wallet home**, not **amount entry**.

**`useFocusEffect`** is next. This unit is **history surgery**, not refetch.

---

## What reset means

A stack is a **list of screens**. **`navigate` / `push`** **appends**. **Back** **pops**. After a **completed** flow, those middle screens are **invalid**: Confirm would **look** like they can **pay again**; onboarding **Welcome** would **undo** “done.”

**`CommonActions.reset`:** **replace the whole history** of a navigator with a **new** `routes` array + **`index`**.

```ts
navigation.dispatch(
  CommonActions.reset({
    index: 1,
    routes: [
      { name: 'WalletHome' },
      { name: 'Receipt', params: { transferId } },
    ],
  }),
);
```

**Back from Receipt** → **WalletHome**. **Amount / Confirm are gone.**

**`StackActions.replace`:** swap **only the current** screen. Stack `Amount → Confirm` + `replace('Receipt')` → `Amount → Receipt`. **Back is still Amount** — **not** enough for the curriculum’s **“wallet home, not amount.”** Use **replace** to avoid **double Confirm**; use **reset** (or **pop** Amount **then** replace) when **all** intermediates must **die**.

**Endless pushes:** Success **`navigate('Receipt')`** on top of Confirm → back **Confirm** → **double-submit UX**. That’s the bug **reset** exists for.

---

## Nested reset (don’t nuke the whole app)

[Tabs own sections](../34.%20nested-nav-architecture/notes.md). After a transfer you usually **reset `PaymentsStack`**, **not** `CommonActions.reset` the **Root** (that **wipes** Home/Wallet tab **histories** and feels like a **relaunch**).

**Nested reset:** dispatch a reset **whose `routes` include the tab navigator**, with **state** only on **PaymentsStack**:

```ts
navigation.dispatch(
  CommonActions.reset({
    index: 0,
    routes: [
      {
        name: 'AppTabs',
        state: {
          routes: [
            { name: 'HomeStack' },
            { name: 'WalletStack' },
            {
              name: 'PaymentsStack',
              state: {
                index: 1,
                routes: [
                  { name: 'WalletHome' },
                  { name: 'Receipt', params: { transferId } },
                ],
              },
            },
            { name: 'ProfileStack' },
          ],
          index: 2, // Payments tab
        },
      },
    ],
  }),
);
```

**Interview:** “I **reset the flow stack** (or **replace** intermediates) so **back** is **Wallet home**. I **don’t** reset **Root** unless I’m **leaving the whole app tree**.”

**`popToTop`** on PaymentsStack: back to **stack root** (Wallet home) **without** Receipt. Curriculum **allows Receipt** as the **new** top — **reset** (or **modal** Receipt then dismiss to home).

---

## Logout vs reset vs tree swap

| Event | History goal | Typical tool |
| --- | --- | --- |
| **Logout** | **Cannot** back into Wallet | **Unmount App** ([auth](../35.%20auth-flow-patterns/notes.md)). **Reset Auth** to **Login** (clear Register). Checklist still **“reset navigation”** ([auth-session](../29.%20auth-session/notes.md)) — **xor tree is** that reset for **App**. **Don’t** `reset` to Login **on top of** Home. |
| **Onboarding done** | **Cannot** back to slides | **Reset** Root/App to **tabs** only |
| **Payment success** | **Cannot** back to **Confirm** | **Nested reset** / **replace** intermediates → **Receipt** or **WalletHome** |
| **Org / account switch** | **Cannot** back into **other org’s** flow | **Reset nested stacks** (and **clear RQ**) — like a **soft logout** of **navigation** |

Logout **`CommonActions.reset({ routes: [{ name: 'Login' }] })`** on a **giant** stack is **redirect soup** unless you **have no** xor trees. Prefer **session false** → **fresh Auth**.

---

## Payment success (the example)

**Bad:** Amount → Confirm → **`navigate('Receipt')`**. Back → Confirm (**danger**).

**Better A:** **reset** PaymentsStack to **`[WalletHome, Receipt]`** (or **`[Receipt]`** on [ModalStack](../34.%20nested-nav-architecture/notes.md); dismiss → **same tab**).

**Better B:** **`replace`** Confirm **and** **pop** Amount (or reset **index 0** = WalletHome only, Receipt as **modal**).

**Params:** Receipt gets **`transferId`**, not a **fat DTO** ([params vs fetch](../37.%20params-vs-fetch/notes.md)).

---

## Common mistakes and misconceptions

- **`navigate('Receipt')`** after pay.
- **Root `reset`** after every transfer (**kills** other tabs).
- **`replace` Confirm → Receipt** and claiming **Amount is gone**.
- **Logout = `reset` to Login** **without** unmounting App.
- **Org switch** without **resetting** nested stacks.
- **`reset` vs `replace`** as synonyms.

---

## Connections to other concepts

`completed flow → history is a liability → reset/replace that stack → back is a safe screen`

- **[Auth](../35.%20auth-flow-patterns/notes.md):** logout **tree swap**; this unit **onboarding/payment/org**.
- **[Nested nav](../34.%20nested-nav-architecture/notes.md):** **which** navigator you reset.
- **[Optimistic UI](../31.%20optimistic-ui/notes.md):** **don’t** back to Confirm **to retry** with a **new** key **accidentally**.
- Next: **focus** — Receipt **mounted** vs **focused** after reset.

---

## Interview perspective

They want **when** (four cases), **`reset` vs replace**, **payment back-stack**. Speak **nested**: don’t reset the **world**.

Spoken (30–60s):

> I reset when history would be wrong: logout, onboarding done, payment success, org switch. For a transfer I reset or replace so back isn’t Confirm or Amount — Receipt with transferId, then wallet home. That’s CommonActions.reset, nested on the payments stack, not a root reset that wipes other tabs. Logout is still a session-driven tree swap, not Login pushed on Home.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
