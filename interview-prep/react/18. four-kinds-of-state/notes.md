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

# Self-test

## Core recall

1. Name the four kinds of state.
2. Where does local UI state usually live?
3. Give two examples of shared client state and a typical tool split (rare vs frequent).
4. What makes state “server state”?
5. Typical home for server state?
6. Why does classification matter more than picking a favorite library?
7. What’s the most common misclassification?
8. Recite the decision flow in four steps.

## Explain why

1. Why isn’t “many components need this list” enough reason to put API data in Redux?
2. Why can theme live in Context while a product catalog should not?
3. Why does local state dying on unmount matter for “current filters”?
4. Why might auth be split between client flag and server-cached profile?
5. Why do stale/cache/revalidate problems define server state?
6. Why is “everything in one store” attractive but costly?

## Compare and contrast

1. Local UI vs shared client  
2. Shared client vs global app state  
3. Shared client vs server state  
4. Context vs Zustand for shared client  
5. Redux Toolkit vs React Query (what each owns)  
6. Prop drilling local state vs lifting to shared client  

## Classify these (kind + tool lean)

1. Dropdown `isOpen`  
2. Dark mode preference  
3. `GET /orders` list on the orders page  
4. Toast queue for the whole app  
5. Multi-step checkout wizard step index  
6. Search results from `/search?q=`  
7. Whether the left nav is collapsed  
8. Current user permissions from `/me`  

## Debugging / design smell

1. Team stores `users[]` from the API in Redux and hand-rolls loading/error per screen. Misclassification?  
2. Mouse coordinates in React Context updated every `mousemove`. What’s wrong with the kind/tool pairing?  
3. Product detail fetched in three places with three `useEffect`s into three `useState`s. Better kind?  
4. Sidebar open flag in Redux Toolkit with a full slice. Overkill? What kind is it?

## Application

1. For a new “favorite color” toggle used only in `SettingsPage`, pick kind + tool.  
2. For favorites list from the API shown in header badge + favorites page, pick kind + tool.  
3. Write the interview answer to “where should this state live?” in your own words (4–6 sentences).  
4. Draw a quick map: local / shared / global / server → one example each from an app you know.

## Interview questions

1. How do you decide where a new piece of state should live?  
   **Follow-ups:** Server vs client? Context vs Zustand vs Redux?

2. What is server state and why is it different?

3. Give examples of misclassifying state and the bugs that follow.

4. Is auth local, shared, global, or server? Defend a split.

5. Why might a modern stack use React Query *and* Zustand/Redux together?

## Connections

1. How does this set up the Context / Redux / Zustand / RQ sections that follow?
2. How does local `useState` from the hooks chapter fit kind #1?
3. How does “custom hooks aren’t shared state” reinforce kind boundaries?
4. How does URL state sometimes replace shared client filters?
5. How does treating server data as client state create race/stale UI bugs you’ll see in RQ sections?
