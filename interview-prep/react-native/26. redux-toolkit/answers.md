# Redux Toolkit — Answers

## Core recall

1. RTK is excellent when **client** transitions are **complex and shared**. Many RN apps: **RQ + Zustand**. **Complexity, not fashion.**
2. Complex cross-feature **client** workflows; team **already** on Redux; **middleware / entity adapters** for **large client** caches; **existing** Redux-heavy app (Wizer / maybe RTKQ).
3. Mostly **CRUD server**; **simple UI**; **Zustand + RQ** enough.
4. **`configureStore`** with **`createSlice`** reducers combined — **one** state tree.
5. **Mutative-looking** updates (`state.x += 1`); Immer produces **immutable** next state.
6. **Logging**; **listeners** (`listenerMiddleware`).
7. **Replay/step** complex **client** action sequences in DevTools.
8. **Stuffing everything** (especially **server** data) into Redux.
9. **Don’t rewrite** the store for fashion.
10. **RQ** server; **Zustand** light client.

## Explain why

1. **Slices + Immer + configureStore** remove action-type soup; same **unidirectional** model.
2. **Async/I/O** in reducers makes time-travel and tests **lies**. Immer is **only** for **state shape**.
3. **One** `dispatch` log; listeners can **orchestrate** slices **atomically**.
4. Lists are **server**; replay **won’t** match the **network**. RQ cache is the tool.
5. **Two owners** (or thunk cache vs reality) → **stale money**.
6. **Cost and risk**; **own** it, peel **server** out incrementally.
7. Adapters **normalize client** entities. **API txs** belong in **RQ/RTKQ**.
8. Tool ≠ seniority. **Misclassified** state is junior.
9. **Side effects** belong in **middleware** (or RQ). Reducers **compute next state**.
10. Those apps **don’t have** a shared client **state machine** worth the ceremony.

## Compare and contrast

1. Zustand: **many small stores**, less ceremony. RTK: **one tree**, **actions**, **middleware** ecosystem.
2. All three: **narrow subscribe**. Context: **no** select. Same **don’t select all** rule.
3. **Listener:** client action → client effect. **Invalidate:** **server** refetch. Don’t mix jobs.
4. **Action log** vs **query cache**. Use the one that **owns** the bug.
5. **Inherit vs don’t introduce.**
6. **RTK** = client store. **RTKQ** = server cache **in** Redux. Don’t conflate in this answer.
7. **Inside** `createSlice` reducers, Immer wraps `state`. **Outside** (in a component) mutating store state is **still a bug**.
8. **Client machine** vs **RQ**.

## Predict the output

1. **Stale / duplicate cache** — thunk store **won’t** auto-sync like RQ invalidation unless you **rebuild** RQ. Drift after transfer.
2. **Unnecessary Redux** — `useState` or Zustand. Complexity not justified.
3. **Legal in RTK slice** — Immer. Not a raw mutate of the **previous** frozen tree.
4. **Side effect in reducer** — not pure; time-travel/async **broken**.
5. **Yes** — selected **entire** tree.
6. **Big-bang rewrite** of architecture. **Strangle** (e.g. new server data → RQ) instead.

## Debugging

1. **Redux as API cache.** Move GETs to **RQ** (or RTKQ if staying in Redux).
2. **Local UI** — `useState`.
3. **Yes, if** those updates must be **one** atomic client transaction **and** you’re already paying for a store. Two Zustand stores **can** work if you **accept** dual dispatch; RTK **helps** when that **hurts**.
4. **Don’t mutate and return** in the same Immer reducer.
5. **Server / RQ** — not in the action log.
6. **Stop new server slices**; **invalidate/query** for new endpoints; strangler **old** thunks.

## Application

1. Lists + spoken paragraph from notes.
2. `reducer: { onboarding, walletUi }`.
3. `nextStep(state) { state.step += 1; }` in `createSlice`.
4. KYC coordination → RTK maybe. selectedAccountId → Zustand (or slice if already RTK). Balances → RQ. QueryClient → Context. Wizer → **keep** RTK, don’t fashion-swap.
5. **…hold server lists / be the default for simple UI.**
6. **No complex shared client machine — RQ + Zustand is enough; Redux would be fashion.**

## Interview questions

1. **Spoken:** RTK when **client** transitions are **complex and shared**. Many RN apps: **RQ + Zustand**. **Complexity, not fashion.**  
   **Follow-up:** Cross-feature **client** wizards, existing team store, entity adapters for **client** caches — **not** for balances.

2. **Spoken:** **`configureStore` + `createSlice`**, **Immer**, **middleware**, **one** tree, **DevTools**.

3. **Spoken:** **Keep** it; **don’t** big-bang Zustand. **Stop** putting **new** server data in slices; **own** listeners. Wizer = **ownership**, not a rewrite.

4. **Spoken:** **Golden rule** — cache/dedupe/invalidation is **RQ**. Redux copies **drift**.

5. **Spoken:** **Cross-slice** client effects, logging, **not** as a substitute for HTTP.

## Connections

1. Redux is **one possible home** for **complex global client**. Other rows **unchanged**.
2. **`useSelector` a slice** or you **fan out**. Same as `useStore(s => s.x)`.
3. **No new code** in `state.api`; new **hooks** with RQ; **delete** thunks when unused.
4. **RTKQ vs RQ** table, keys, `staleTime`. This answer stays **client RTK vs overuse**.
5. **`<Provider store>`** **and** Theme/QueryClient Context. Store ≠ DI for the query client.
