# RTK Query vs React Query — Answers

## Core recall

1. **Best with; boilerplate; cache tools; learning curve; CV.** RQ: any store / low–medium / excellent / query-focused / RQ+Zustand. RTKQ: Redux / medium codegen-ish / excellent in Redux / Redux+RQ concepts / Wizer.
2. **Used both. RQ + Zustand. RTKQ when Redux is the backbone. Both cache server state; ecosystem fit.**
3. **Server-state caching** (dedupe, invalidate, hooks).
4. **RQ:** Zustand/Context/none. **RTKQ:** Redux.
5. **EasyPay:** RQ+Zustand. **Wizer:** RTKQ.
6. **QueryClient** vs **API slice in the Redux store**.
7. **Key factories / prefix invalidate** vs **providesTags / invalidatesTags**.
8. **Use both RQ and RTKQ** (or thunks + RTKQ) for **that** resource.

## Explain why

1. **Fit** (what’s already the backbone), not a winner.
2. RQ’s host is **QueryClient**, not the Redux tree.
3. Cache **lives** in the store you **already** dispatch through; **one** DevTools story.
4. You must know **slices/dispatch** **and** query freshness/invalidation.
5. You’d introduce **configureStore** **only** for the cache — **unneeded** complexity.
6. **Big-bang** cache swap; **no** weekly ship; fashion.
7. **Two owners** — invalidate one, the other **lies**.
8. Wizard is **client** state (**slice** / Zustand). RTKQ is **HTTP cache**.

## Compare and contrast

1. **Standalone** cache vs **in-store** API reducer.
2. **Same intent** (bust related queries); **different** identity system.
3. **useQuery+keys** vs **endpoint definitions + generated hooks**.
4. **No Redux** vs **Redux already there**.
5. RTKQ **is** the cache. Thunks **duplicate** it — **overuse** from the RTK unit.
6. **This:** which library. **RQ unit:** staleTime, optimistic **mechanics**.
7. **Client** `createSlice` vs **createApi** server cache.
8. **Where** the cache **sits** and **what** you already depend on — not “one has no cache.”

## Predict the output

1. **Drift** — one list/balance updates, the other doesn’t. **Golden rule**.
2. **Same** — two txs caches.
3. **A Redux app** they didn’t need; **RTKQ** as an excuse.
4. **Nothing** (or incomplete) — **tag** never **provided**, mutation **doesn’t** match observers.

## Debugging

1. **CV contradiction** — you **used** RTKQ on Wizer; say **fit**, not tribal RQ.
2. **Double fetch/cache.** Remove thunks; **one** RTKQ endpoint.
3. **Don’t add Redux for RTKQ.** Keep RQ.
4. **Mapper** missing — **both** libraries. Not a vs-RTKQ bug.

## Application

1. Match curriculum table.
2. Match sketch.
3. **EasyPay:** no Redux → RQ. **Wizer:** Redux backbone → RTKQ.
4. **If Redux exists → RTKQ. If not → RQ (+ Zustand for client).**
5. **…live in two server caches.**
6. RQ: `invalidateQueries({ queryKey: walletKeys.all })`. RTKQ: `invalidatesTags: ['Wallet']` (with `providesTags` on queries).

## Interview questions

1. **Spoken:** I’ve used both. RQ pairs with Zustand. RTKQ when Redux is the backbone. Both cache server state; **fit** matters.  
   **Follow-up:** EasyPay RQ+Zustand; Wizer RTKQ.

2. **Spoken:** **Not** as a first-week rewrite. **Strangle** if ever; **not** fashion to match EasyPay.

3. **Spoken:** **No.** That’s **Redux for fashion**. RQ doesn’t need it.

4. **Spoken:** RQ **key prefixes**. RTKQ **tags** on endpoints. Same **idea**.

## Connections

1. **Both** have freshness/GC/invalidate. This unit **doesn’t** retake that exam.
2. **Don’t** adopt Redux/RTKQ **or** delete them **for trend**.
3. **Dual cache** = two places → **drift**.
4. **Characterize** (what store exists) → **don’t** big-bang the cache.
5. **Tokens / hydrate / secure storage** are **session**, not “which `useQuery`.” Either cache can **fetch profile**; **neither** is the **token vault**.
