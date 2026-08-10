# 10. Senior red flags / green flags

> Source: `interview-prep/nextjs/01-routing-rendering.md`

### Green flags interviewers love

- Explaining Server/Client Components in terms of *where code runs and what ships*, not just "some are server, some are client."
- Being able to say "this page should be dynamic because X" instead of defaulting everything to SSR out of caution.
- Knowing that layouts persisting across navigation is a deliberate performance feature.
- Connecting rendering strategy choices to real product requirements (auth, freshness, SEO) instead of reciting definitions.

### Red flags

- "Next.js is just React with file-based routing" (misses RSC, caching, streaming entirely).
- Treating SSR as always the "better" or "more modern" choice regardless of the page's needs.
- Not knowing that `"use client"` affects the whole subtree, not just one file.
- Confusing `getServerSideProps`/`getStaticProps` (Pages Router) with App Router's actual mental model when asked about App Router specifically.

---
