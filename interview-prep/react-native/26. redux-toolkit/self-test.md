# Redux Toolkit — Self-test

## Core recall

1. Recite the spoken “I choose based on complexity, not fashion” answer.
2. List the four **when Redux still makes sense** bullets.
3. List the three **when Redux is unnecessary** bullets.
4. What does **single store + slices** mean in RTK?
5. What does **Immer** let you write in a slice reducer?
6. Name two middleware kinds from the curriculum (logging, listeners).
7. What is **time-travel** for in this unit?
8. What is the **common overuse**?
9. Wizer-style ownership: what do you **not** do in week one?
10. EasyPay-shaped app: default stack for server vs light client?

## Explain why

1. Why is RTK better than 2016 Redux boilerplate for the same model?
2. Why must reducers stay **pure** even with Immer?
3. Why can a **single** store help **cross-feature** client coordination?
4. Why is time-travel a weak argument for **CRUD lists**?
5. Why is stuffing **API lists** into Redux the golden-rule bug?
6. Why keep Redux on a **legacy** app instead of a fashion rewrite?
7. Why are **entity adapters** not a reason to cache **transactions** from the API?
8. Why is “seniors use Redux” a bad heuristic?
9. Why listeners/thunks instead of `fetch` in `nextStep`?
10. Why can Zustand + RQ replace Redux on **small/medium** RN apps?

## Compare and contrast

1. RTK `createSlice` vs Zustand `create` (ceremony vs one tree).
2. `useSelector` vs Zustand selector vs Context.
3. Listener middleware vs RQ `invalidateQueries`.
4. Redux DevTools time-travel vs RQ Devtools.
5. Inheriting Wizer RTK vs green-field EasyPay.
6. RTK (client store) vs RTK Query (preview only — different job).
7. Immer “mutate” vs actually mutating `state` **outside** Immer.
8. Complex **client** KYC machine vs **server** balance.

## Predict the output

1. Slice holds `balances` from `createAsyncThunk`. Transfer succeeds; RQ isn’t used. What’s the drift risk vs a second cache?

2. EasyPay PR adds Redux **only** for `isFilterOpen`. What should you say?

3. You `state.step += 1` in an RTK reducer. Is that an illegal mutation? Why?

4. You `await api.get()` **inside** `nextStep` reducer. What’s wrong?

5. `useSelector(s => s)` in a wallet row. `onboarding.step` changes. Does the row re-render?

6. New lead wants to delete Redux on Wizer in the first sprint. Playbook smell?

## Debugging

1. Every GET is `createAsyncThunk` into slices; no React Query. Diagnose.

2. Modal `open` in `uiSlice` used by **one** screen. Taxonomy?

3. Cross-slice bug: loans and onboarding **desync**. You have two Zustand stores. Would RTK have helped? When?

4. Immer: reducer **mutates** and **returns** a new object. Odd bugs. What’s the footgun?

5. Time-travel **doesn’t** reproduce a **balance** bug. Where does that state actually live?

6. Team “standardized on Redux” but 90% of the store is **server** clones. First strangler move?

## Application

1. Recite when-yes / when-no lists and the spoken answer.

2. Sketch `configureStore` with `onboarding` + `walletUi` slices (names only).

3. Write a 8-line `createSlice` `nextStep` using Immer-style `state.step += 1`.

4. Classify: KYC wizard coordination; `selectedAccountId`; balances; QueryClient; Wizer existing store.

5. One-line PR: “Redux slices must not …”

6. One sentence you’d use if they ask “why no Redux on EasyPay?”

## Interview questions

1. Redux vs Zustand vs React Query — complexity, not fashion.  
   **Follow-up:** When **would** you add RTK?

2. What does RTK actually add (slices, Immer, store)?

3. You inherit a Redux-heavy RN app (Wizer). What do you do?

4. Why not put server data in Redux?

5. What are listeners/middleware **for** if HTTP isn’t the reducer?

## Connections

1. How does this **not** replace the [taxonomy](../23.%20state-taxonomy/notes.md)?
2. How is selector discipline the **same** as [Zustand](../25.%20zustand/notes.md)?
3. How does [legacy strangler](../21.%20legacy-modernization/notes.md) apply to **server-out-of-Redux**?
4. What will **§6 RTK Query** add that you must **not** dump into this answer?
5. How does [Context](../24.%20context-api/notes.md) still sit **next to** `Provider store={store}`?
