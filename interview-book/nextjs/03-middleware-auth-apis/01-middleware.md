# 01. Middleware

> Source: `interview-prep/nextjs/03-middleware-auth-apis.md`

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
