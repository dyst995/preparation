# 04. Next.js API routes vs a separate NestJS backend - the question you WILL get

> Source: `interview-prep/nextjs/03-middleware-auth-apis.md`

This is probably the single most important question in this chapter given your CV pairs Next.js with NestJS constantly (Clean House, Travel2Georgia, VetApp). Have a sharp, non-wishy-washy answer.

### Topics to learn

- [ ] Next.js Route Handlers are great as a **BFF (Backend-for-Frontend)** layer: thin, close to the UI, good for aggregating/shaping data for a specific page, hiding backend URLs/secrets from the client, handling cookies/session translation
- [ ] A dedicated backend (NestJS) is better for: real business logic, complex domain models, being consumed by *multiple* clients (web + mobile + third parties), independent scaling/deployment, a mature layered architecture (modules, services, guards, interceptors, DTOs, validation pipes), long-lived background jobs, and a team that might grow beyond "the frontend developers"
- [ ] Mixing both is normal and common: NestJS owns the real API and business logic; Next.js Route Handlers sometimes exist purely as a thin proxy/BFF for things like setting httpOnly cookies, or combining multiple backend calls into one response tailored for a specific page
- [ ] Next.js API routes scale and deploy *with* the frontend - if you need independent scaling of API load vs frontend traffic, or a different deployment cadence, a separate backend decouples that

### Decision table

| Scenario | Favor Next.js Route Handlers | Favor separate NestJS backend |
|---|---|---|
| Only the web frontend ever calls this logic | Yes | Maybe still yes if logic is complex |
| Mobile app AND web app need the same logic | No | Yes - one backend, two clients |
| Simple data aggregation/reshaping for one page | Yes | Overkill |
| Complex domain rules, multi-step transactions, background jobs | No | Yes |
| Need to hide a third-party API key from the browser | Yes (thin proxy) | Also fine if backend already exists |
| Team will grow, need clear module boundaries, DI, testing conventions | No | Yes - NestJS's structure pays off |
| Independent scaling/deployment of API vs frontend | No | Yes |

### Interview answer sketch (use this almost verbatim, adapted to your voice)

> "I don't treat it as an either/or. On Clean House and Travel2Georgia, the real business logic - orders, warehouse state, user management, payments - lived in a NestJS backend, because that logic is also needed by other clients (the React Native app on Clean House, for instance) and benefits from NestJS's structure: modules, DI, guards for auth, DTOs with validation pipes, and a testing setup that doesn't depend on the frontend framework at all. Next.js Route Handlers, when I use them, are usually a thin BFF layer - proxying a request to set an httpOnly cookie the browser can't touch directly, or combining two backend calls into one response shaped for a specific dashboard page. I'd reach for pure Next.js API routes end-to-end only on a small project with a single client and simple logic, where standing up a separate service would be overhead without payoff."

**Follow-up:** "Isn't that duplicate infrastructure?"
> "It's a deliberate tradeoff, not accidental duplication. The backend is the source of truth and the thing multiple clients depend on; the BFF layer in Next.js is there specifically to keep browser-side concerns (cookies, CSRF, response shaping for a page) out of the shared backend's API contract, so the backend API stays clean and client-agnostic."

---
