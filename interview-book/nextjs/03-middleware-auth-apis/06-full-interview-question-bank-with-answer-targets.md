# 06. Full interview question bank (with answer targets)

> Source: `interview-prep/nextjs/03-middleware-auth-apis.md`

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
