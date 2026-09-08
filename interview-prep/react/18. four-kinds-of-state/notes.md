# The Four Kinds of State

## What you need to know

**Classify before you pick a library.** Interviews care more about *why* you chose a home for state than which logo you named.

| Kind | Definition | Examples | Typical home |
| --- | --- | --- | --- |
| **Local UI state** | Owned by one component (+ maybe direct children via props) | Input text, dropdown open, hover | `useState` / `useReducer` |
| **Shared client state** | Client-only; needed by multiple / distant components | Theme, sidebar open, selected filters, modal open, wizard step | Context (rare updates) or Zustand/Redux (frequent / complex) |
| **Global app state** | Cross-cutting, long-lived; often wants middleware / DevTools / multi-slice domain | Auth/session, feature flags, toast queue, complex domain slices | Often **Redux Toolkit** (or a disciplined Zustand store) |
| **Server state** | **Owned by the server**; fetched; can go stale; others can change it; needs cache/revalidate | Users list, profile, catalog, orders | **TanStack Query** (React Query) |

Most state bugs and follow-ups come from **misclassification** — especially treating **server state as client state**.

---

## Why classification beats “which library is better”

Tools overlap. The hard question is ownership and failure modes:

- Who is the **source of truth**?  
- Does it go **stale**?  
- Who else can **change** it?  
- How **often** does it update?  
- How **many** consumers, how **far** apart?

Get those right → the tool choice mostly follows. Argue libraries without classification → cargo-cult answers.

---

## 1. Local UI state

**What:** Ephemeral UI belonging to one place in the tree.

**Home:** `useState` / `useReducer` in that component; pass props/callbacks to children if needed.

**Signals you’ve outgrown it** (preview of later sections):

- Prop drilling 2–3+ levels for one value.  
- Distant cousins need the same value with no natural parent.  
- Must survive unmount / route change (local state dies with the component).

Don’t lift to Redux “just in case.”

---

## 2. Shared client state

**What:** Still **client-owned** (browser/app), but **not** local to one component.

**Examples:** theme, sidebar collapsed, filter chips, which modal is open, multi-step wizard progress, a client-side “isLoggedIn” flag (careful: session *data* from API is often server state).

**Home by update frequency / complexity:**

| Pattern | Prefer |
| --- | --- |
| Rarely changes (theme, locale) | **Context** (with stable `value`) |
| Updates often / many selectors | **Zustand** (lightweight) or **Redux** |
| Complex domain + middleware/DevTools | **Redux Toolkit** → often labeled “global” below |

Shared ≠ must be Redux. Shared + rare → Context is fine.

---

## 3. Global app state

**What:** Cross-cutting, app-wide, often long-lived. The curriculum treats this as the “heavy” end of client state: auth/session orchestration, feature flags, toast queues, multi-slice business state.

**Overlap with shared client:** Global is shared client with **higher** scope/complexity. Don’t stress a sharp philosophical wall — stress **tooling needs** (middleware, time-travel, normalized entities, many writers).

**Typical home:** Redux Toolkit in many enterprise stacks; Zustand can still work if you keep modules disciplined.

Auth nuance: **access token in memory** might be client/global; **user profile from `/me`** is often **server state** cached in React Query, with a thin client flag for “has session.”

---

## 4. Server state

**What:** The server owns the data. The client holds a **cached view** that can be wrong.

Properties that scream server state:

- Loaded via **network**  
- Can become **stale**  
- **Other users/tabs/devices** can change it  
- Needs **caching, deduping, revalidation, retries, mutation + invalidate**

**Home:** TanStack Query (or similar). **Not** “put API JSON in Redux because many screens need it.” Sharing is easy; **cache correctness** is the hard part — that’s what RQ solves.

Putting server lists in Redux without a cache policy → duplicate fetches, stale screens, manual loading flags everywhere, race bugs.

---

## Decision flow (interview-friendly)

```text
Is it owned by the server / fetched / can go stale?
  YES → React Query (server state)
  NO ↓

Is it only used in one component (or tight parent/child)?
  YES → useState / useReducer (local)
  NO ↓

Client-only, shared across the tree:
  Rarely changes → Context
  Frequent / selectors / simple store → Zustand
  Complex domain / middleware / DevTools → Redux Toolkit
```

Preserved spoken answer:

> First I ask what kind of state it is. Local UI → `useState`. Server data → React Query (caching/revalidation are the hard problems, not just sharing). Client-only shared → Context vs Zustand vs Redux by update frequency and complexity.

---

## Borderline cases (classify deliberately)

| Situation | Lean |
| --- | --- |
| Form draft for one page | Local (or URL for shareable filters) |
| Filters used by list + URL | URL + local, or shared client; list **results** = server |
| Optimistic UI on a todo | Server state mutation (RQ) + optional local overlay |
| WebSocket “connected” boolean | Shared/global client |
| WebSocket pushes new messages | Server/cache update (or RQ + external sync) |
| Feature flag from config API | Server state (or bootstrap then treat as rarely changing client) |

When unsure: ask **“if the server updates, is my copy wrong?”** If yes → server state.

---

## Common mistakes and misconceptions

1. API data in Redux/Context “because two pages need it.”  
2. Everything in Redux from day one.  
3. Everything in Context including high-frequency mouse/scroll state.  
4. Treating “global” and “server” as the same.  
5. Duplicating React Query cache into Zustand “for convenience.”  
6. Believing local state can’t be passed to children (props are fine).

---

## Connections to other concepts

```
classify → tool
  local → useState
  shared client → Context / Zustand / Redux
  global/complex client → Redux Toolkit
  server → React Query

misclassify server as client
  → manual fetch/cache bugs (later sections)

Context for rare shared client
  → re-render pitfalls (next sections)
```

---

## Interview perspective

Lead with **classification**, then **tool**. Be ready to:

1. Define all four kinds with examples.  
2. Explain why server state is special.  
3. Walk the decision flow.  
4. Place a tricky example (auth, filters, product list) and defend it.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
