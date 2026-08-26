# The Four Kinds of State — Answers

## Core recall

1. Local UI, shared client, global app, server.  
2. `useState` / `useReducer` in that component.  
3. Theme, sidebar, filters, modal — Context if rare; Zustand/Redux if frequent/complex.  
4. Server-owned; fetched; can stale; others can change it; needs cache/revalidate.  
5. TanStack Query / React Query.  
6. Wrong kind → wrong tool and wrong failure modes; right kind → tool choice follows.  
7. Treating **server state as client state**.  
8. Server? → RQ. Local only? → useState. Shared client: rare → Context; frequent/simple → Zustand; complex → Redux.

## Explain why

1. Sharing is easy; **staleness, dedupe, revalidate, mutations** are the hard parts — RQ’s job.  
2. Theme is client-owned and rarely changes; catalog is server-owned and must stay fresh.  
3. Navigate away → component unmounts → local filters lost unless lifted/URL/store.  
4. Session flag/token handling can be client/global; profile/permissions payload is often server-cached.  
5. Those properties force cache policies — client stores don’t give them for free.  
6. One store fights every concern; unclear ownership; boilerplate and stale API copies.

## Compare and contrast

1. **Local:** one owner. **Shared client:** many distant consumers, still client-owned.  
2. **Shared:** general client sharing. **Global:** app-wide/long-lived/complex tooling end of that spectrum.  
3. **Client:** app is source of truth. **Server:** server is; client caches.  
4. **Context:** simple, watch re-renders / rare updates. **Zustand:** selective subscriptions, frequent updates.  
5. **Redux:** client/domain orchestration. **RQ:** server cache.  
6. **Props:** fine for shallow trees. **Lift/share:** when distance/duplication hurts.

## Classify these

1. **Local** — `useState`.  
2. **Shared client** — Context (or persist store).  
3. **Server** — React Query.  
4. **Global/shared client** — Redux/Zustand toast module or a toasts library.  
5. **Shared client** (or local if one page parent owns it) — Zustand/Context/`useState` in layout.  
6. **Server** — RQ (query key includes `q`).  
7. **Shared client** — Context/Zustand.  
8. **Server** — RQ (`/me`); maybe pair with client session flag.

## Debugging / design smell

1. Yes — **server state** forced into client store; use RQ.  
2. High-frequency updates in Context — wrong tool intensity; keep local/ref or non-React.  
3. **Server state** — one query key, shared cache.  
4. Likely **shared client**; boolean often doesn’t need RTK — Context/Zustand is enough.

## Application

1. **Local** + `useState`.  
2. **Server** + React Query (header + page share cache via same key).  
3. Own paraphrase of: classify → local useState / server RQ / shared Context vs Zustand vs Redux by frequency/complexity.  
4. Personal examples mapped to the four buckets.

## Interview questions

1. **Spoken:** Classify first — local → useState; server → RQ; shared client → Context/Zustand/Redux by change rate and complexity.  
   **Follow-ups:** Caching vs sharing; rare vs frequent Context.

2. **Spoken:** Server-owned remote data that can stale; needs cache/revalidate — not the same as UI flags.

3. **Spoken:** API lists in Redux without cache policy → stale UI, duplicate fetches; high-freq values in Context → render storms.

4. **Spoken:** Split: client session/bootstrapping vs `/me` as server state in RQ; don’t dump everything in one bucket blindly.

5. **Spoken:** RQ owns server cache; Zustand/Redux owns client UI/domain — different problems, both real.

## Connections

1. Later sections deepen each tool; this unit is the routing table.  
2. Hooks chapter local state = kind #1 default.  
3. Custom hooks reuse logic, not a shared store — shared kinds need Context/store/RQ.  
4. URL can hold shareable filters (client concerns) while results stay server state.  
5. Mis-copied server data lacks invalidation → classic stale/race issues RQ sections fix.
