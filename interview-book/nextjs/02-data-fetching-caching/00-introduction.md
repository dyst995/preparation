# 02 - Data Fetching & Caching — Introduction

> Source: `interview-prep/nextjs/02-data-fetching-caching.md`

> Goal: Explain exactly what Next.js caches, why, and how to control it - this is the single topic where interviewers separate "used Next.js" candidates from "understands Next.js" candidates.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Name the four distinct caches in Next.js (Request Memoization, Data Cache, Full Route Cache, Router/Client Cache) and what each one solves.
2. Control `fetch` caching explicitly with `cache` and `next.revalidate`/`next.tags` options.
3. Explain time-based revalidation (ISR) vs on-demand revalidation (`revalidateTag`, `revalidatePath`).
4. Explain why reading `cookies()`/`headers()` opts a route out of static rendering.
5. Fetch data in parallel instead of accidentally creating request waterfalls.
6. Decide when to fetch on the server vs use React Query (or SWR) on the client, and explain how the two coexist.
7. Debug "why is my data stale" and "why is my page suddenly dynamic" - two of the most common real-world Next.js bugs.
8. Tie this to Clean House (dashboards needing fresh, per-manager data) and Travel2Georgia (content that can tolerate a cache window).

---
