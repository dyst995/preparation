# RTK Query vs React Query — Self-test

## Core recall

1. Recite the five table dimensions (RQ vs RTKQ).
2. Recite the spoken answer sketch.
3. What **job** do both solve?
4. RQ **best with** vs RTKQ **best with**.
5. Your CV mapping: EasyPay vs Wizer.
6. RQ cache host vs RTKQ cache host.
7. RQ **keys** vs RTKQ **tags** (invalidation).
8. What must you **not** do for the **same** resource?

## Explain why

1. Why is “which is better?” the wrong interview question?
2. Why does RQ pair with Zustand without Redux?
3. Why is RTKQ natural when Redux is already the backbone?
4. Why is RTKQ’s learning curve “Redux + RQ concepts”?
5. Why would adding RTKQ to EasyPay be fashion?
6. Why would rewriting Wizer to RQ in week one be a playbook fail?
7. Why can **two** caches for balances drift?
8. Why doesn’t RTKQ replace **createSlice** for a KYC **wizard**?

## Compare and contrast

1. QueryClient vs API reducer in the Redux store.
2. `walletKeys.all` invalidate vs `invalidatesTags: ['Wallet']`.
3. RQ boilerplate vs `createApi` endpoints.
4. EasyPay stack vs Wizer stack.
5. RTKQ vs **hand-written** `createAsyncThunk` GETs into slices.
6. This unit vs [RQ deep dive](../27.%20react-query/notes.md) (fit vs cache knobs).
7. RTKQ vs [RTK client slices](../26.%20redux-toolkit/notes.md).
8. “Excellent cache tools” in both columns — what still differs?

## Predict the output

1. EasyPay uses RQ. A PR adds RTKQ `getBalances` **and** keeps `useQuery` for balances. What happens after a transfer invalidates only one of them?

2. Wizer is RTKQ. New hire adds React Query for “modern” txs **only**. Symptom?

3. Team picks RTKQ because “we might need Redux later” on a green-field with no client machine. What did they buy?

4. Mutation in RTKQ sets `invalidatesTags: ['Wallet']` but the list query **doesn’t** `providesTags: ['Wallet']`. Invalidation?

## Debugging

1. Interview: you only praise RQ and dismiss RTKQ. Wizer is on the CV. What’s missing?

2. Store has **thunk** `fetchTxs` **and** `useGetTxsQuery`. Diagnose.

3. Review: `configureStore` added **only** so someone can `createApi`. App was Zustand + RQ. What do you say?

4. `transformResponse` skipped; screens use `amt_cents`. Is that an RQ vs RTKQ issue?

## Application

1. Recite the table from memory.

2. Recite the sketch.

3. One sentence: EasyPay choice. One sentence: Wizer choice.

4. Draw a 4-line decision: “If Redux exists… / If not…”

5. PR rule: “One resource must not …”

6. Map: invalidate all wallet server state — RQ vs RTKQ **names** of the mechanism.

## Interview questions

1. React Query vs RTK Query?  
   **Follow-up:** Which did you use where?

2. Would you migrate Wizer to React Query?

3. Would you add Redux to use RTK Query?

4. How does invalidation differ (keys vs tags)?

## Connections

1. How does this **not** replace [staleTime](../27.%20react-query/notes.md)?
2. How does [complexity not fashion](../26.%20redux-toolkit/notes.md) apply here?
3. How does the [golden rule](../23.%20state-taxonomy/notes.md) apply to dual caches?
4. How does [legacy playbook](../21.%20legacy-modernization/notes.md) apply to cache choice?
5. Next section is **auth/session** — why that’s **not** an RTKQ vs RQ decision?
