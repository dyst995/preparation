# Persistence — Self-test

## Core recall

1. Recite the persist-OK vs do-not-plain table (three + three).
2. Recite the spoken interview answer.
3. What **must** use Keychain/Keystore?
4. Name three Zustand persist **caveats**.
5. What is **`partialize`** for?
6. What are **`version` + `migrate`** for?
7. Which rehydrate must **block** navigation: theme persist or **token** vault?
8. Should RQ **balances** be persisted to AsyncStorage?
9. After logout, should **theme** persist usually survive?
10. Plain storage examples vs secure storage names (iOS/Android).

## Explain why

1. Why is AsyncStorage/MMKV **not** a vault?
2. Why tokens in Zustand persist leak even if “the store is auth”?
3. Why rehydrate is a **nav** bug when you drive stacks off **default** state?
4. Why **session** hydrate and **theme** persist should be **separate** waits?
5. Why persist **financial RQ payloads** is a PII issue?
6. Why **version** persisted JSON?
7. Why migrate **failure** should not crash the app?
8. Why `AsyncStorage.clear()` on logout is a blunt instrument?
9. Why “MMKV is encrypted” is not automatic (unless you **configured** it)?
10. Why a **wrong theme flash** is acceptable vs **wrong stack**?

## Compare and contrast

1. Theme persist vs token vault.
2. Zustand persist vs `secure-storage` module.
3. `hasHydrated` (persist) vs `hydrated` (session).
4. Persist `selectedAccountId` vs persist **txs**.
5. Language persist vs PAN persist.
6. This unit vs [auth logout](../29.%20auth-session/notes.md) (what you **wipe**).
7. This unit vs [`.env`](../20.%20flavors-config/notes.md).
8. Persist vs [RQ memory cache](../27.%20react-query/notes.md).

## Predict the output

1. Persist blob includes `accessToken`. Backup extracted. Harm class?

2. Auth store persist rehydrates **after** AppStack mounted with `isAuthenticated: false`. User **is** logged in. What flash?

3. Store shape adds `theme`; old disk has `{ dark: true }` only, **no** migrate. Runtime?

4. Logout `queryClient.clear()` + tokens; persist **still** has `accessToken`. Next launch?

5. `partialize` omitted; wallet UI store includes **txs** copied from RQ. Disk?

6. Bootstrap `await`s theme persist with **no timeout**; token hydrate already done. Symptom?

## Debugging

1. Login flash though Keychain has tokens; Zustand persist `isAuthenticated` defaulted false and **won the race**. Diagnose.

2. After app update, **white screen** in `JSON.parse` of persist. Fix pattern?

3. Review: `persist` entire `useAuthStore`. What do you require?

4. User logs out; **language** resets to EN. Cause?

5. MMKV holds **card PAN** “offline checkout.” What’s wrong?

6. `migrate` returns `undefined`; persist **corrupts**. What should migrate do on unknown version?

## Application

1. Recite the table and spoken answer.

2. Sketch persist config: `name`, `version`, `partialize` (theme + flag only).

3. Classify: theme; refresh token; language; CVV; `hasSeenTip`; balance JSON.

4. Write a one-line bootstrap rule: “Nav waits on … not …”

5. PR rule: “Zustand persist must …”

6. Logout: list **wipe** vs **keep**.

## Interview questions

1. What do you persist, and where?  
   **Follow-up:** Zustand persist?

2. How do you avoid navigation racing rehydration?

3. How do you version persisted state?

4. Keychain vs AsyncStorage vs MMKV — one sentence each.

5. After logout, what stays on disk?

## Connections

1. How does this **extend** [auth-session](../29.%20auth-session/notes.md) without replacing the checklist?
2. How does [shell splash](../16.%20app-shell/notes.md) use **two** hydrates?
3. How does [Zustand](../25.%20zustand/notes.md) `persist` **middleware** show up here?
4. Why [flavors](../20.%20flavors-config/notes.md) still don’t store tokens?
5. Next is **optimistic UI** — why that’s **not** persistence?
