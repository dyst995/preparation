# 10. Senior red flags / green flags

> Source: `interview-prep/nextjs/04-performance-deployment.md`

### Green flags

- Has an actual, specific deployment story beyond "I pushed to Vercel."
- Knows why `NEXT_PUBLIC_` is dangerous for secrets and can explain the fix isn't just "delete the env var."
- Connects Edge/Node runtime choice to actual constraints (API surface, cold starts) rather than "Edge is always faster."
- Ties image/font optimization to specific Core Web Vitals, not just "it's faster."

### Red flags

- Never considered what happens to `node_modules` size in a Docker image (doesn't know about `output: standalone`).
- Thinks Edge runtime is strictly better in every deployment context.
- No mental model for SSL/reverse proxy setup at all.
- Treats environment variables as interchangeable regardless of `NEXT_PUBLIC_` prefix.

---
