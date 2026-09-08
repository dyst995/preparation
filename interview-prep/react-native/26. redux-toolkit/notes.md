# Redux Toolkit

## What you need to know

[Zustand](../25.%20zustand/notes.md) is the **default** for **light** global client state. This unit is **when a single Redux store (RTK) is still the right complexity** — and when stuffing **everything** into Redux is **overuse**.

**Learn:**

- **Single store + slices** (RTK)
- **Immutability via Immer** in RTK
- **Middleware** (logging, listeners)
- When Redux complexity is **justified**
- **DevTools time-travel** in complex flows
- **Overuse:** putting **everything** in Redux

**Still makes sense:**

- Complex **multi-step client** workflows with **cross-feature** coordination
- Team **already** standardized on Redux
- Mature **middleware** / **entity adapters** for **large client** caches
- Existing **Redux-heavy** codebase (Wizer-style ownership may include **RTK Query**)

**Unnecessary:**

- Mostly **CRUD server** data
- **Simple** UI state
- Small/medium apps where **Zustand + React Query** is enough

Preserve:

> Redux Toolkit is excellent when client-side state transitions are complex and shared widely. For many RN apps, React Query handles server state and Zustand handles light global client state with less boilerplate. I choose based on complexity, not fashion.

**RTK Query vs React Query** is the **next** comparison section. Here: **client** RTK vs **don’t use Redux as RQ**.

---

## Single store + slices (what RTK actually is)

Classic Redux: one **store**, **pure reducers**, **actions**, **dispatch**. Pain: boilerplate, accidental **mutations**.

**Redux Toolkit:** `configureStore` + **`createSlice`**. Each **slice** is a **domain** of **client** state (like a Zustand store, but **one** tree and **one** dispatch).

```ts
const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState: { step: 0, kycDraft: {} as Draft },
  reducers: {
    nextStep(state) {
      state.step += 1; // Immer — looks like mutate
    },
    setKycField(state, action: PayloadAction<{ key: string; value: string }>) {
      state.kycDraft[action.payload.key] = action.payload.value;
    },
  },
});

const store = configureStore({
  reducer: {
    onboarding: onboardingSlice.reducer,
    walletUi: walletUiSlice.reducer,
  },
});
```

**One store** means **time-travel** and **middleware** see **the whole client machine**. That’s the **coordination** win: a listener can react to `onboarding/completed` and **also** clear `walletUi` without two Zustand stores **hand-wiring**.

**`useSelector(s => s.walletUi.selectedAccountId)`** — same **idea** as Zustand selectors. Select the **whole** store and you **re-render** like Context.

---

## Immer: “mutate” in the reducer, still immutable

Reducers must **not** mutate the previous state **by hand** (bugs, DevTools lies). **Immer** (built into RTK slices) lets you **write** `state.step += 1`; it produces the **next** immutable tree.

You still **must not** do **async** or **I/O** inside the reducer. Side effects: **listener middleware**, **thunks**, or **RQ mutations** — not `fetch` in `nextStep`.

If you **return** a new object yourself, that’s also valid; mixing **mutate + return** in one reducer is a footgun (Immer rules). Interview: **“RTK uses Immer so slice reducers can look mutative but stay immutable.”**

---

## Middleware: logging, listeners (not “Redux is for API”)

**Middleware** sits around `dispatch`. **Logging** (dev): action in → state out.

**`createListenerMiddleware`:** “when `transfer/succeeded` **client** flag fires, run this.” Useful for **cross-slice** orchestration **without** dumping business HTTP into reducers.

**Overuse:** `createAsyncThunk` **fetching balances** into `state.wallet.txs`. That’s **server state**. **React Query** (or RTK Query **if** you’re already in Redux). This unit’s rule: **Redux is not the API cache** unless you **chose** RTKQ as a **team** — and even then you’re in **§6**.

---

## DevTools time-travel

Complex **client** flows (KYC wizard + account selection + flags that **must** replay): being able to **step actions** is a **real** debug tool. Zustand **devtools** exist; Redux DevTools **time-travel** is **mature** when the **action log** is the **product**.

If your “flow” is **fetch list / show list**, time-travel **won’t** justify Redux — **RQ Devtools** would.

---

## When justified vs fashion

| Situation | Lean |
| --- | --- |
| EasyPay: selected account + RQ balances | **Zustand + RQ** |
| Wizer: already **RTK** everywhere | **Don’t rewrite** for Zustand as a **flex** — **own** the store, **stop adding** server lists if you can migrate **those** to RQ/RTKQ |
| KYC + loans + wallet **client** machines sharing **one** undoable log | **RTK** |
| “Senior means Redux” | **Fashion** — fail |

**Entity adapters:** normalized **client** collections (think **offline form drafts**, **local-only** queues). **Not** an excuse to **mirror** the **transactions API**.

**Team standard:** switching stores **mid-flight** is **architecture cost**. Seniors **choose complexity**, they don’t **churn** Wizer for a blog post.

---

## Common mistakes and misconceptions

- **Balances in `walletSlice`** “so it’s global.”
- **Redux for modal open** on one screen.
- **Migrating EasyPay to Redux** to look senior.
- **Rewriting** a working RTK app to Zustand in week one of ownership.
- **fetch in reducers.**
- **createAsyncThunk for every GET** instead of RQ.
- Confusing **RTK** (store) with **RTK Query** (server cache **on** Redux) — different layers.

---

## Connections to other concepts

`taxonomy → Zustand default for light client → RTK when the client machine is the product`

- **[Taxonomy](../23.%20state-taxonomy/notes.md):** Redux is **global client** (complex), **not** server, **not** nav.
- **[Zustand](../25.%20zustand/notes.md):** same **selector** discipline; **less** ceremony; **weaker** default **cross-store** orchestration.
- **[Context](../24.%20context-api/notes.md):** still **DI** for QueryClient/theme; Redux doesn’t replace that.
- **Wizer / [legacy playbook](../21.%20legacy-modernization/notes.md):** **strangle** server-out-of-Redux; **don’t** big-bang the store.
- **§5 RQ / §6 RTKQ:** **where HTTP cache lives** if the team is Redux-shaped.

---

## Interview perspective

They want **complexity, not fashion**, plus **one** Wizer-shaped **inherit** story and **one** EasyPay-shaped **don’t add Redux**.

If they say “do you know Redux?”: **yes — slices, Immer, listeners, when I wouldn’t use it.**

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
