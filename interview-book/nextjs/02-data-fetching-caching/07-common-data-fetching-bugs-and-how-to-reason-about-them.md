# 07. Common data-fetching bugs and how to reason about them

> Source: `interview-prep/nextjs/02-data-fetching-caching.md`

| Symptom | Likely cause | Fix |
|---|---|---|
| Page that should be static is rendering on every request | `cookies()`/`headers()` used, or a `no-store` fetch, somewhere in the render path | Isolate the dynamic part into its own component/Suspense boundary, or accept it's dynamic and cache elsewhere (CDN, edge) |
| Data never updates after a mutation | Missing `revalidatePath`/`revalidateTag` after the write | Add explicit revalidation in the Server Action/Route Handler that performs the write |
| Data updates for one user but shows stale for others behind a CDN | Confusing per-user data with a public/shared cache | Never cache per-user/authenticated data in the shared Data Cache/CDN; use `no-store` or per-user cache keys |
| Page takes far longer to load than any single query should | Sequential waterfall of independent fetches | `Promise.all`, or split into parallel Server Components |
| "Dynamic server usage" build/runtime error | Using `cookies()`/`headers()` in a route also marked for static generation, or used somewhere unexpected (e.g. a shared utility called from multiple places) | Trace which fetch/API call forced dynamic rendering; decide if that's actually required for that route |

---
