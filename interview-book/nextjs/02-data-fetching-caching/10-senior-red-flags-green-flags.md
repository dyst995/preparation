# 10. Senior red flags / green flags

> Source: `interview-prep/nextjs/02-data-fetching-caching.md`

### Green flags

- Says "which of the caches" instead of just "the cache" when debugging staleness.
- Knows caching defaults can change between Next.js versions and checks rather than assumes.
- Distinguishes public/shared cacheable data from per-user data that must never sit in a shared cache.
- Has a real, concrete story pairing server fetching with React Query rather than treating them as competitors.

### Red flags

- Believes "Next.js just caches everything automatically, don't worry about it."
- Doesn't know `cookies()`/`headers()` affect static vs dynamic rendering.
- Uses `no-store`/`force-dynamic` everywhere "to be safe," defeating the point of the framework.
- Can't explain the difference between time-based and on-demand revalidation.

---
