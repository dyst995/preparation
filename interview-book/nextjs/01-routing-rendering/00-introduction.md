# 01 - Routing & Rendering — Introduction

> Source: `interview-prep/nextjs/01-routing-rendering.md`

> Goal: Explain how Next.js turns files into routes, what actually renders where (server vs client), and confidently justify SSR/SSG/ISR/CSR choices per page - at a depth that survives senior follow-ups.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Contrast the App Router (`app/`) with the Pages Router (`pages/`) and explain why Next.js moved to App Router.
2. Explain file-based routing conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, route groups, dynamic segments, catch-all segments, parallel and intercepting routes.
3. Explain what a Server Component is, what a Client Component is, and where the boundary between them actually lives.
4. Draw the render lifecycle for SSR, SSG, ISR, and CSR and say when each is the right default.
5. Explain streaming SSR and `<Suspense>` in the App Router, and why they matter for perceived performance.
6. Justify layouts and nested layouts vs re-fetching shared UI on every page.
7. Explain hydration, and what "hydration mismatch" errors actually mean.
8. Map Clean House (existing App/Pages Router platform) and Travel2Georgia (greenfield) onto concrete rendering decisions you made or would defend.

---
