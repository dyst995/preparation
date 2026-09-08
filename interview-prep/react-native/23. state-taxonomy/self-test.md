# The state taxonomy — Self-test

## Core recall

1. Recite the seven kinds of state from the table.
2. For each kind, give **one** curriculum example and the **preferred home**.
3. Recite the interview golden rule.
4. Where do **balances** live vs **selectedAccountId**?
5. Where does **modal open** live vs **current route**?
6. Session/auth: what two pieces is the “home”?
7. What is **derived** state supposed to do instead of duplicating?
8. When is Redux listed as the home for global client state?
9. What is the **first** question to ask before “Zustand or Redux?”
10. What is **not** a second copy: `transferId` in params vs the transfer **resource** in RQ?

## Explain why

1. Why does a taxonomy beat “we use Redux for everything”?
2. Why is putting the same data in two places the **biggest** state bug?
3. Why doesn’t **server** state belong in a generic client store?
4. Why is **selected account** not server state (usually)?
5. Why must tokens **at rest** not rely on the React Query cache alone?
6. Why is **navigation state** a bad Zustand mirror?
7. Why is a **filtered list** in `useState` a drift risk if the full list is in RQ?
8. Why is a two-field modal **not** a form-library requirement?
9. Why can **profile from API** and **user id for the auth gate** be **different** kinds?
10. Why can theme be global client **and** still be Context later without contradicting this table?

## Compare and contrast

1. Local UI vs global client.
2. Server state vs global client.
3. Session vs server `user` profile.
4. Form state vs navigation params.
5. Derived vs a stored snapshot.
6. `transferId` param vs `useQuery(['transfer', id])`.
7. This unit vs [nav architecture](../17.%20nav-architecture/notes.md) (session flags vs storing routes).
8. This unit vs later RQ/`staleTime` (classify vs cache knobs).

## Predict the output

1. Transfer succeeds. RQ invalidates balances. Zustand still has `balance` from 10 minutes ago. What does Home show if it reads Zustand, and why?

2. You `navigate('Confirm', { user: fullProfile })` and also hydrate profile via RQ. Server updates KYC. Confirm still shows old params. Which two kinds collided?

3.

```ts
const [txs, setTxs] = useState([]);
useEffect(() => { setTxs(query.data.filter(isDebit)); }, [query.data]);
```

User toggles a filter in the UI by `setTxs` again. Then RQ refetches. What can go wrong?

4. `useAuthStore.token` is set on login but refresh writes **only** to secure storage. Next API call uses the store. What happens?

5. `currentRoute` in Zustand updated in a `useEffect` on each screen. User opens a **deep link**. What drifts?

6. A 12-step KYC wizard stores every field in the **root Redux** store. What’s the taxonomy smell (even if Redux is “allowed” for complex client)?

## Debugging

1. “Offline wallet is wrong after a transfer.” Lists are in Zustand **and** RQ. Diagnose.

2. After login, **Login flash** is gone, but **profile name** is empty until pull-to-refresh. Session vs server mix-up?

3. Review: `walletStore = { selectedId, balances, txs, isModalOpen }`. Split by taxonomy.

4. Confirm screen reads `route.params.amount` as the **ledger** and never fetches. Param vs server?

5. `isAuthenticated` in Context, Zustand, **and** a boolean in RQ `me` query, updated at different times. Symptom?

6. Filter chips are `useState` (good) but you **also** `dispatch(setFilteredTxs)` to Redux. Fix?

## Application

1. Recite the table from memory (kind / example / home).

2. Recite the golden rule.

3. Classify: modal; balance; selectedAccountId; access token; KYC wizard fields; `route.params.transferId`; `txs.filter(...)`.

4. Sketch EasyPay: where RQ, Zustand UI store, auth+secure storage, `useState`, React Navigation each sit (one line each).

5. Write a one-line PR rule: “Do not …”

6. Given an interviewer saying “put the user in Redux.” Ask **two** clarifying questions using the taxonomy.

## Interview questions

1. How do you decide where state lives in an RN app?  
   **Follow-ups:** Golden rule? Where do balances go?

2. Why not put API data in Redux/Zustand?

3. Where should auth/session live vs profile from the API?

4. Redux vs Zustand — using **only** the taxonomy (not a full RTK lecture).

5. What’s an example of derived state done wrong?

## Connections

1. How does this **prevent** using Redux as a substitute for [architecture](../14.%20type-vs-feature/notes.md)?
2. How does [secure storage + hydrate](../16.%20app-shell/notes.md) map to the **session** row?
3. How do [route params vs fetch](../17.%20nav-architecture/notes.md) match **nav** vs **server**?
4. How should [DTO → domain](../19.%20data-domain/notes.md) sit **inside** the server-state home (not a second Zustand)?
5. What will **React Query** and **Zustand** sections **implement** that this unit only **names**?
