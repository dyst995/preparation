# 01. The four kinds of state - classify before you pick a tool

> Source: `interview-prep/react/03-state-data-fetching.md`

Before reaching for any library, classify the state. This classification *is* the answer to "why did you choose X" in interviews.

| Kind | Definition | Example | Typical home |
|---|---|---|---|
| **Local UI state** | Owned and used by one component (and maybe its direct children) | Input value, whether a dropdown is open, form field focus | `useState`/`useReducer` in that component |
| **Shared client state** | Client-only data needed by multiple, possibly distant, components | Current theme, sidebar collapsed/expanded, selected filters, modal open/closed, auth token (client-side flag), multi-step wizard progress | Context (rarely changing) or Zustand/Redux (frequently changing / complex) |
| **Global app state** | Cross-cutting, app-wide, often long-lived, sometimes needs middleware/devtools/time-travel | Auth/session, feature flags, app-wide notifications/toasts queue, complex multi-slice domain state | Redux Toolkit |
| **Server state** | Data that is *owned by the server*, fetched over the network, can go stale, can be updated by other clients, needs caching/revalidation | List of users, a user's profile, product catalog, orders | React Query / TanStack Query |

### Why this classification matters more than "which library is better"

Nearly all real state-management bugs and interview follow-up questions trace back to **misclassifying state** - most commonly, treating **server state as if it were client state** (see Section 4). Get the classification right, and the "which tool" question mostly answers itself.

### Interview question

**Q: How do you decide where a new piece of state should live?**

> "First I ask what kind of state it is. If it's local to one component's UI, it's `useState`. If it's server data - fetched from an API, can go stale, might be updated elsewhere - it goes in React Query regardless of how many components need it, because caching and revalidation are the actual hard problems, not just 'sharing a value.' If it's genuinely client-only and shared across distant parts of the app, I decide between Context, Zustand, or Redux based on update frequency and complexity - Context for rarely-changing values, Zustand for lightweight shared state, Redux Toolkit when the domain is complex enough to benefit from centralized reducers, middleware, and devtools."

---
