# The state taxonomy — Answers

## Core recall

1. **Local UI, server, global client, session/auth, form, navigation, derived.**
2. Modal/`useState`; balances/RQ; selected account/Zustand; token/auth+secure storage; multi-step form/form lib or reducer; route/React Navigation; filtered list/compute.
3. **The biggest state bug is putting the same data in two places and letting them drift.**
4. **Balances:** RQ. **selectedAccountId:** Zustand (global client) — or params if **this journey only**.
5. **Modal:** `useState`. **Route:** React Navigation.
6. **Dedicated auth store** + **secure storage**.
7. **Compute/select** — don’t store a second copy.
8. When global client is **complex** (coordination) — not as the default for **server** lists.
9. **What kind of state is this?**
10. **Id vs document** — not two copies of the same payload. Param = pointer; RQ = resource.

## Explain why

1. Different kinds have **different** lifetimes, truth, and invalidation. One tool **cannot** own all of them well.
2. Updates **won’t** hit both; UI **lies** (wrong balance, ghost login, stale KYC).
3. Server data needs **cache, dedupe, refetch, invalidate**. A client store **won’t** unless you **rebuild** RQ.
4. The **server** didn’t choose it (unless it’s a **saved preference** resource). It’s **which UI** you’re looking at.
5. Process death **drops** memory cache. Session must **rehydrate** from **secure** storage.
6. Navigation **already** owns history/deep links. A mirror **lags** `reset`/links.
7. You now have **two lists**. Refetch **doesn’t** update the snapshot unless you **sync** — that’s drift.
8. **Local UI** is enough; a form lib is for **large** machines / field arrays / validation.
9. **Gate** needs **session**. **Name/KYC** is **API** and should **refetch**. One blob **never** refetches.
10. Taxonomy says **global client**. **Context** is a **possible home** for **low-frequency** values (next section). Not a third **balance** store.

## Compare and contrast

1. **Local:** one screen, dies on unmount. **Global client:** many screens, client-only truth.
2. **Server:** API is authority. **Global client:** the **app** is authority (selection, theme).
3. **Session:** logged-in **gate** + tokens. **Profile:** fetchable **server** fields.
4. **Form:** draft fields. **Params:** **ids/flags**, not the whole form or secrets.
5. **Derived:** function of sources. **Snapshot:** a **new** source that can **diverge**.
6. **Param:** which id. **Query:** payload, cache, invalidation.
7. Nav unit: **don’t store routes** in a client store; **do** store **session flags** the root **reads**.
8. This unit: **where**. RQ section: **when to refetch / GC**.

## Predict the output

1. **Stale balance** (Zustand). RQ was updated; **second owner** wasn’t. Golden-rule bug.
2. **Nav params** (stale snapshot) vs **server** profile. Confirm should **fetch by id** or **select** from RQ.
3. **RQ refetch overwrites** via `useEffect` **or** fights user `setTxs` — **derived stored as state**. Filter in **render/select**; don’t `setTxs` from both.
4. **401 / old token** — store **drifted** from storage. **One** write path on refresh.
5. **Zustand `currentRoute` stale** vs actual navigator. Deep link **didn’t** run your effect.
6. **Form** (and maybe **server** as they submit) shoved into **global**. Use a **wizard reducer/form lib**; persist **draft** explicitly if needed — not “everything is Redux.”

## Debugging

1. **Two owners** for server lists. **Delete** Zustand copy; RQ (and invalidate on transfer) is the list.
2. **Session** hydrated (gate works) but **profile query** didn’t run / failed. Don’t expect **name** from **token presence**. Fetch **profile** as server state.
3. **selectedId:** Zustand. **balances/txs:** RQ. **isModalOpen:** `useState`.
4. **Params aren’t the ledger** — stale/tampered. **Id** in params; **amount** from **server** (or mapped domain after fetch).
5. **Three session truths** — Login/Home **disagree**. **One** auth store + storage; RQ `me` is **profile**, not a **second** `isAuthenticated`.
6. **Drop Redux filtered copy.** Chips local; **derive** list with `select` / `useMemo`.

## Application

1. Match the curriculum table.
2. Same data in two places → **drift**.
3. Modal → local. Balance → server. selectedAccountId → global client. Token → session+secure. KYC fields → form. transferId → nav. filter → derived.
4. RQ in feature **hooks**. Zustand **UI** store for selection. Auth feature + secure storage. Local `useState` on screens. NavigationContainer **owns** routes.
5. **Do not store a second copy of server/nav/derived data** (or: don’t put RQ lists in Zustand).
6. **Is “user” session or profile?** **Is this server data or client-only?** Then pick RQ vs auth store vs Zustand.

## Interview questions

1. **Spoken:** Classify: local useState, server RQ, global client Zustand (Redux if complex), session auth+secure storage, forms in a lib/reducer, nav in React Navigation, derived computed.  
   **Follow-ups:** Golden rule = **one owner**. **Balances → React Query.**

2. **Spoken:** Server state needs cache, dedupe, invalidation. Redux/Zustand copies **drift** after mutations. RQ already solves that.

3. **Spoken:** **Session:** dedicated store + **secure storage**, hydrate for the **tree**. **Profile:** RQ. Don’t one-blob them.

4. **Spoken:** If it’s **server**, neither — **RQ**. If **client** and **simple**, Zustand. Redux when **client** transitions are **complex and shared**. Taxonomy **first**.

5. **Spoken:** Saving `filteredTxs` in a store while RQ holds **all** txs — refresh/filter **diverge**. **Select/filter** in the subscriber.

## Connections

1. Redux **isn’t** an architecture. **Features** still own folders; state **homes** **plug in** (RQ in hooks, small UI store).
2. Boot **hydrates session** from secure storage into the **auth** home — **not** balances.
3. **Params:** nav kind. **Fetch by id:** server kind. Don’t put full models in params.
4. **queryFn** + **mapper** → cache holds **domain**. Zustand must **not** clone it.
5. RQ section: **keys, staleTime, invalidate**. Zustand: **selectors**. This unit only **assigns the row**.
