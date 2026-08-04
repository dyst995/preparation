# 03 - Middleware, Auth & APIs

> Goal: Explain Middleware and Route Handlers precisely, describe JWT/session auth patterns at a practical level, and give a sharp, opinionated answer to "why do you pair Next.js with NestJS instead of just using Next.js API routes for everything?" - a question you will very likely get given your CV.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Explain what Next.js Middleware is, where it runs, and what it can and can't do.
2. Write and reason about a protected-route Middleware pattern.
3. Explain Route Handlers (`route.ts`) - methods, request/response shape, dynamic vs static Route Handlers.
4. Describe JWT-based and session-based auth patterns at a level that satisfies both frontend and backend interviewers.
5. Explain cookie storage tradeoffs (httpOnly, secure, sameSite) for tokens.
6. Give a clear, opinionated comparison of Next.js Route Handlers vs a separate NestJS backend, and justify when you'd use each - tied to your actual project experience.
7. Describe how the Next.js frontend and a NestJS backend talk to each other in practice (server-to-server fetch, client-to-backend via a BFF pattern, or direct client calls).

---

## 1. Middleware

### Topics to learn

- [ ] Middleware runs **before** a request completes, at the edge (or Node.js runtime, configurable), intercepting requests before they hit a route
- [ ] File location: `middleware.ts` at the project root (or inside `src/`)
- [ ] `config.matcher` to scope which paths Middleware runs on (avoid running it on every single asset request)
- [ ] Can read/rewrite/redirect the request, set/read cookies and headers, but **cannot** access a database directly in the Edge runtime (no arbitrary Node APIs) - it's meant to be fast and lightweight
- [ ] Common use cases: auth gating/redirects, A/B testing bucket assignment, locale detection/redirects, bot detection, request logging/headers, feature flag routing
- [ ] Middleware runs on **every matched request**, including prefetches - be careful about expensive work there
- [ ] Middleware cannot render UI - only redirect, rewrite, or pass through with modified request/response

### Example: protecting `/dashboard/*`

```ts
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("session")?.value;

  if (!token && request.nextUrl.pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

### What Middleware should NOT do

- Full JWT signature verification with heavy crypto libraries not supported in the Edge runtime (some are, but keep it lightweight; verifying against a remote auth service on every request adds latency to every navigation)
- Database queries to check permissions row-by-row (too slow, wrong layer) - do coarse-grained checks here (is there a token at all, is the role in the token good enough for this route prefix), and do fine-grained authorization in the actual Route Handler/backend
- Heavy business logic - Middleware should stay fast because it runs on the hot path of *every* matched request

### Interview question

**Q: Where would you put auth logic - Middleware, a Route Handler, or the backend?**

> "I split it by cost and purpose. Middleware does the cheap, coarse gate - is there a valid-looking session cookie at all, redirect to login if not, maybe a fast role check baked into the JWT claims for route-prefix-level gating like `/admin/*`. I don't do database lookups or full permission checks there because it runs on every matched request and needs to stay fast. Fine-grained authorization - can *this* user edit *this* specific order - happens at the Route Handler or backend layer, right next to the data it's protecting, where I can actually query the DB and apply business rules."

**Q: Have you used Middleware for anything besides auth?**

> "Locale/redirect logic is a common one - detecting `Accept-Language` or a cookie and redirecting to a localized route. On a project like Travel2Georgia with a public marketing/booking site, that kind of routing/locale logic in Middleware would keep it out of every individual page."

---

## 2. Route Handlers (`route.ts`)

### Topics to learn

- [ ] File convention: `app/api/orders/route.ts` -> exports named functions per HTTP method: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- [ ] Receives a `Request`/`NextRequest`, returns a `Response`/`NextResponse`
- [ ] Route Handlers are cached by default for `GET` in some configurations (static) unless they use dynamic APIs - similar rules to page rendering (`cookies()`, `headers()`, `request.method !== 'GET'` etc. push it dynamic)
- [ ] Can run on Node.js or Edge runtime (`export const runtime = "nodejs" | "edge"`)
- [ ] Not the same thing as Server Actions - Route Handlers are traditional REST-style endpoints you can hit from anywhere (including non-Next.js clients, webhooks, mobile apps); Server Actions are RPC-style functions called directly from your own React tree
- [ ] Good for: webhooks (Stripe, payment providers), OAuth callback endpoints, endpoints consumed by mobile apps or third parties, anything that needs a stable public URL and standard HTTP semantics

### Example

```ts
// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const token = cookies().get("session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orders = await getOrdersForUser(token);
  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  const body = await request.json();
  const order = await createOrder(body);
  return NextResponse.json(order, { status: 201 });
}
```

### Route Handlers vs Server Actions - the real distinction

| | Route Handler | Server Action |
|---|---|---|
| Shape | REST-style HTTP endpoint | RPC-style function, called like a normal async function |
| Callable from | Anywhere - browser fetch, mobile app, webhook, curl | Only from your own app's forms/components (though it does compile to an HTTP POST under the hood) |
| Good for | Public API surface, webhooks, third-party integrations | Form submissions, mutations from your own UI |
| Return shape | You control the `Response` fully (status, headers, body) | Return value is passed back into React as a normal JS value/promise result |

### Interview question

**Q: When would you use a Route Handler instead of a Server Action for a form submission?**

> "If the form is only ever submitted from my own Next.js app's UI, a Server Action is simpler - no manual fetch, automatic progressive enhancement, direct integration with `useFormStatus`/`useActionState`. I'd reach for a Route Handler instead if the same endpoint needs to be called from outside my Next.js app - a webhook from a payment provider, a mobile app hitting the same backend, or a third party integration - because a Route Handler gives me a stable, standard HTTP contract that isn't tied to React's internals."

---

## 3. Auth patterns - JWT and session, at interview depth

### Topics to learn

- [ ] Session-based auth: server issues an opaque session ID, stored server-side (DB/Redis) with the session data; client just holds the ID in a cookie
- [ ] JWT-based auth: server issues a signed token containing claims (user id, role, expiry); client stores it, server verifies the signature on each request without a DB lookup
- [ ] Access token + refresh token pattern: short-lived access token (minutes) for API calls, longer-lived refresh token (days) to mint new access tokens without forcing re-login
- [ ] Where to store tokens: `httpOnly` cookies (not readable by JS, mitigates XSS token theft) vs `localStorage`/client state (readable by JS, vulnerable to XSS, but simpler for pure SPA/mobile-style clients)
- [ ] Cookie flags that matter: `httpOnly`, `secure` (HTTPS only), `sameSite` (`lax`/`strict`/`none`) for CSRF mitigation
- [ ] CSRF risk mostly applies to cookie-based auth (browser auto-attaches cookies); less of a concern for `Authorization: Bearer <token>` headers set explicitly by JS, but that pattern is more exposed to XSS instead - there's a real tradeoff, not a free lunch either way
- [ ] Protecting routes in App Router: Middleware for the coarse redirect, plus checking the session/token again in the actual Server Component/Route Handler/Server Action (defense in depth - never trust that Middleware alone was hit, e.g. someone could hit a Route Handler directly)

### JWT vs session - comparison table

| | Session (server-side) | JWT (stateless) |
|---|---|---|
| Server storage needed | Yes (DB/Redis) | No (self-contained token) - though often still persisted for revocation lists |
| Revocation | Easy - delete the session server-side | Hard - token is valid until expiry unless you maintain a blocklist, defeating some statelessness benefit |
| Scaling across services | Needs shared session store | Easier - any service with the public key/secret can verify |
| Payload visibility | Nothing meaningful in the cookie itself | Claims are base64-encoded, not encrypted - never put secrets in a JWT payload |
| Common pairing | Traditional server-rendered apps, simpler setups | Microservices, mobile + web sharing one backend (fits a NestJS backend serving both a Next.js web app and a React Native app) |

### Interview answer sketch

> "For a setup with a shared NestJS backend serving both a Next.js web app and a React Native mobile app - which matches how I've worked - JWT access/refresh tokens make sense because both clients can use the same stateless verification without the backend needing to know or care which client type is calling. On the web side, I'd store the access token in an `httpOnly`, `secure`, `sameSite=lax` cookie so client-side JS (and therefore XSS) can't read it directly, and use a Route Handler or Server Action as a thin proxy when the browser needs to call the backend, so the token never has to live in client-readable JS state. On mobile, since there's no cookie jar in the same sense, secure storage (Keychain/Keystore) holds the token instead."

**Follow-up:** "How do you handle token refresh without kicking the user out?"
> "Short-lived access token, longer-lived refresh token. When an API call gets a 401, the client (or a Route Handler acting as a proxy) attempts a refresh using the refresh token, retries the original request once, and only redirects to login if the refresh itself fails. I've dealt with the classic race condition of multiple simultaneous requests all trying to refresh at once - the fix is to have only one refresh request in flight and queue the others behind it."

---

## 4. Next.js API routes vs a separate NestJS backend - the question you WILL get

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

## 5. Protected routes end-to-end (App Router)

### Topics to learn

- [ ] Layered protection: Middleware (coarse redirect) + Server Component/Layout check (defense in depth) + backend-level authorization (final source of truth)
- [ ] Reading the session in a Server Component to conditionally render or `redirect()`
- [ ] `redirect()` from `next/navigation` inside Server Components/Server Actions - throws internally, must not be caught by a surrounding `try/catch` that swallows it
- [ ] Role-based rendering: don't rely on hiding a button in the UI as your only authorization - the backend must reject unauthorized requests regardless of what the UI shows

### Example: layout-level auth check

```tsx
// app/dashboard/layout.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession(cookies().get("session")?.value);
  if (!session) {
    redirect("/login");
  }
  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
```

### Interview question

**Q: If Middleware already redirects unauthenticated users away from `/dashboard`, why check again in the layout?**

> "Defense in depth. Middleware matching can be misconfigured, someone could add a new route under `/dashboard` and forget to check the matcher covers it, or a Route Handler under that path could be hit directly without ever going through the page-rendering path Middleware assumes. I treat Middleware as a fast, coarse first gate for UX (redirect quickly, avoid rendering a page that will immediately bounce), and I treat the actual data-layer and backend checks as the real security boundary that I can't skip."

---

## Full interview question bank (with answer targets)

### Middleware

1. **What is Middleware, where does it run, and what can't it do?**
2. **How do you scope Middleware to specific paths?** -> `config.matcher`.
3. **Why shouldn't Middleware do heavy DB/auth logic?** -> runs on every matched request, needs to stay fast; do coarse checks only.
4. **Give a non-auth use case for Middleware.** -> locale redirects, A/B bucketing, bot detection, request headers/logging.

### Route Handlers

5. **How do you define a `GET` vs `POST` handler for the same route?** -> named exports per HTTP method in `route.ts`.
6. **Route Handler vs Server Action - when do you pick each?**
7. **Can a Route Handler be statically cached? What makes it dynamic?** -> similar rules to pages: dynamic APIs, non-GET methods, etc.

### Auth

8. **JWT vs session-based auth - tradeoffs?**
9. **Where do you store an access token on the web, and why?** -> httpOnly cookie to mitigate XSS token theft; note the CSRF tradeoff and `sameSite`.
10. **How do you handle token refresh without abrupt logouts?** -> refresh token flow, single in-flight refresh, retry-once pattern.
11. **How do you protect a route in the App Router end-to-end?** -> Middleware + layout/Server Component check + backend authorization.

### Architecture / NestJS pairing

12. **Why pair Next.js with a separate NestJS backend instead of using Next.js API routes for everything?** -> multi-client reuse, complex domain logic, independent scaling, team/testing structure.
13. **When would pure Next.js API routes be the right call with no separate backend?** -> small project, single client, simple logic, no need for independent scaling.
14. **How does the Next.js frontend talk to a NestJS backend in your projects - client-direct, or through a BFF proxy?** -> be ready to describe your actual setup honestly, including tradeoffs you noticed.

---

## Hands-on drills (do these)

- [ ] Write a Middleware file that redirects unauthenticated users away from `/dashboard/*` and away from `/admin/*` with different redirect targets.
- [ ] Write a Route Handler with `GET` and `POST` for a single resource, including a 401 response when unauthenticated.
- [ ] Explain out loud, in under 2 minutes, JWT access/refresh token flow including the "multiple requests racing to refresh" problem and its fix.
- [ ] Rehearse your "Next.js API routes vs NestJS backend" answer out loud until it's under 60 seconds and sounds decisive, not wishy-washy.
- [ ] Describe, specifically, how Clean House's web app and mobile app likely shared (or could share) the same backend auth/session model.

---

## Senior red flags / green flags

### Green flags

- Treats Middleware as a fast, coarse gate - not the only security boundary.
- Has a decisive, tradeoff-aware answer for Next.js API routes vs a real backend, instead of "it depends" with nothing further.
- Knows the difference between Route Handlers and Server Actions precisely.
- Mentions defense-in-depth (multiple layers checking auth) unprompted.

### Red flags

- Believes hiding a button in the UI is sufficient authorization.
- Doesn't know Middleware can't safely do heavy DB/crypto work in the Edge runtime.
- Stores JWTs in `localStorage` without being able to discuss the XSS tradeoff.
- Can't explain why you'd ever need a backend separate from Next.js API routes.

---

## Tie-backs to your experience (use in answers)

- Clean House: a shared backend serving both the web (Next.js) and the React Native mobile app you built from scratch is a concrete, real example of "one backend, multiple clients" - the strongest justification for NestJS over pure Next.js API routes.
- Travel2Georgia: you designed the backend services yourself, so you can speak to *why* you structured the API the way you did, not just how you consumed it from the frontend.
- VetApp (NestJS + TypeORM + JWT + Swagger, rebuilt from a legacy PHP backend) is a strong supporting story for JWT-based auth and backend architecture depth, even though it's not itself a Next.js project - it reinforces that your NestJS opinions are backed by real backend ownership, not just frontend guesswork.

---

## Mastery checklist

- [ ] I can explain Middleware's purpose and limits without over- or under-selling what it can do.
- [ ] I can write a Route Handler and explain when to use it over a Server Action.
- [ ] I can explain JWT vs session auth and a refresh-token flow including the race-condition fix.
- [ ] I have a crisp, opinionated, under-60-second answer for Next.js API routes vs a separate backend.
- [ ] I can describe defense-in-depth for protected routes end to end.
- [ ] I can connect every answer above to a specific decision I made or observed on Clean House or Travel2Georgia.
