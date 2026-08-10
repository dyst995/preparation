# 08. Senior red flags / green flags

> Source: `interview-prep/nextjs/03-middleware-auth-apis.md`

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
