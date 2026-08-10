# 08. Full interview question bank (with answer targets)

> Source: `interview-prep/nextjs/01-routing-rendering.md`

### Routing fundamentals

1. **App Router vs Pages Router - what changed and why?** -> RSC-first, nested layouts, streaming, per-segment conventions.
2. **What files does a route segment support and what does each do?** -> `page`, `layout`, `template`, `loading`, `error`, `not-found`, `route`.
3. **How do dynamic segments and catch-all routes work?** -> `[id]`, `[...slug]`, `[[...slug]]`.
4. **What's a route group and why would you use one?** -> `(name)` folders organize routes/layouts without affecting the URL.
5. **What are parallel and intercepting routes, at a high level?** -> `@slot` for independent sections; `(.)folder` to render a route as an overlay/modal while preserving the URL.

### Rendering model

6. **Server Component vs Client Component - the actual rule?** -> default server; `"use client"` marks a boundary that pulls the subtree into the client bundle.
7. **Can a Client Component import a Server Component? Why/why not?**
8. **How does Next.js decide whether a route is static or dynamic?** -> presence of dynamic APIs/uncached fetch/`force-dynamic`.
9. **Explain SSR/SSG/ISR/CSR in App Router terms, not Pages Router terms.**
10. **What triggers ISR regeneration - time-based and on-demand?** -> `revalidate`, `revalidateTag`, `revalidatePath`.
11. **What is streaming SSR and what does `<Suspense>` do here?**
12. **Why do layouts not re-render on child navigation, and why is that useful?**

### Debugging / practical

13. **A page that should be static is rendering dynamically - how do you find out why?** -> check for `cookies()/headers()`, uncached `fetch`, `dynamic` export, build output logs (Next prints static/dynamic per route).
14. **You have a slow third-party API call on a page - how do you stop it blocking the whole page?** -> isolate in its own async Server Component + `<Suspense>`.
15. **What causes a hydration mismatch and how do you fix it?**

---
