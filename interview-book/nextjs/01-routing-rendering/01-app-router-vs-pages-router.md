# 01. App Router vs Pages Router

> Source: `interview-prep/nextjs/01-routing-rendering.md`

### Topics to learn

- [ ] `pages/` conventions: `pages/index.tsx`, `pages/[id].tsx`, `_app.tsx`, `_document.tsx`, `getServerSideProps`, `getStaticProps`, `getStaticPaths`
- [ ] `app/` conventions: `app/page.tsx`, `app/layout.tsx`, colocated `loading.tsx` / `error.tsx` / `not-found.tsx`
- [ ] Why React Server Components (RSC) needed a new router (data-fetching model, streaming, layouts)
- [ ] Can both routers coexist in one project? (yes - incremental migration is supported)
- [ ] What Pages Router cannot do that App Router can (nested layouts without full remount, granular streaming, Server Components, colocated loading/error UI)
- [ ] Why some teams stay on Pages Router (maturity, simpler mental model, third-party library compatibility, migration cost)

### Core idea

Pages Router treats **every file in `pages/` as a route** rendered by one function you write (`getServerSideProps`, `getStaticProps`, or nothing = static by default). Data fetching and page component are tightly coupled per page, and everything below `_app.tsx` re-renders as one client tree after hydration.

App Router treats **routing as a folder tree** where each folder segment can contribute a `layout.tsx` (persists across navigations within it), a `page.tsx` (the leaf UI), and optional `loading.tsx` / `error.tsx` / `not-found.tsx` boundaries. Crucially, **components are Server Components by default** - they render on the server (or at build time) and never ship their JS to the client unless you opt in with `"use client"`.

### Why the change happened (be ready to explain "why")

| Problem with Pages Router | How App Router addresses it |
|---|---|
| Whole page is one client-side React tree after hydration - even static parts ship JS | Server Components render to HTML/RSC payload, zero JS shipped for non-interactive parts |
| Shared layout (nav, sidebar) re-renders/remounts on every route change unless manually hoisted into `_app.tsx` (losing per-route data) | Nested `layout.tsx` persists across child route navigation, doesn't refetch/remount |
| One data-fetching function per page (`getServerSideProps`), hard to fetch at multiple levels in parallel | Any Server Component (page, layout, or nested component) can `fetch`/query independently; Next.js dedupes and parallelizes |
| No built-in streaming; the whole page waits for the slowest data before responding | Streaming + `<Suspense>` boundaries let fast parts render immediately, slow parts stream in |
| Loading/error states are manual (state in the component) | `loading.tsx` / `error.tsx` are framework-level conventions per route segment |

### Interview answer sketch

> "Pages Router gives you one file, one route, one data-fetching function, and a fully client-hydrated tree. App Router restructures routing around nested folders where each segment can own a layout, loading state, and error boundary, and where components are Server Components by default - meaning they render on the server and don't ship JS unless marked `'use client'`. That unlocks per-segment streaming, parallel data fetching at multiple levels of the tree, and layouts that don't remount on navigation. I've worked on an existing Next.js platform (Clean House) and built one from scratch (Travel2Georgia), so I've seen both the migration-constrained reality and the greenfield App Router setup."

**Follow-up to expect:** "Would you migrate an existing Pages Router app to App Router?"
> "Only incrementally and only if there's a concrete win - e.g., a slow, JS-heavy page that would benefit from Server Components, or a layout that's awkward to manage in `_app.tsx`. Next.js supports both routers side by side, so I'd migrate route-by-route starting with the highest-traffic or worst-performing pages, not do a big-bang rewrite."

---
