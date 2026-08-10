# 08. Full interview question bank (with answer targets)

> Source: `interview-prep/nextjs/04-performance-deployment.md`

### Images & fonts

1. **What does `next/image` do automatically that a plain `<img>` doesn't?**
2. **Why do remote images need `remotePatterns` configured?**
3. **Why is `next/font` better than linking Google Fonts?**

### Bundles & runtime

4. **How do you find out what's bloating a route's JS bundle?** -> `@next/bundle-analyzer`.
5. **When would you use `next/dynamic` with `ssr: false`?** -> browser-only libraries (maps, rich editors).
6. **Edge vs Node.js runtime - tradeoffs?**
7. **Does the Edge/Node distinction matter as much on a self-hosted single-server deployment as on a multi-region serverless platform?** -> less so; mainly an API-surface constraint there, not a geo-latency win.

### Deployment

8. **Walk through deploying a Next.js app with Docker, from build to running container.** -> `output: standalone`, multi-stage build, `node server.js`.
9. **What does Nginx do in front of a Next.js app?** -> SSL termination, reverse proxy, static asset caching/compression, HTTP->HTTPS redirect.
10. **How do you get and renew SSL certificates for a self-hosted app?** -> Let's Encrypt/Certbot, automatic renewal.
11. **Why choose self-hosted Docker/Nginx over Vercel for a given project?** -> control, cost, co-location with backend/DB, no vendor lock-in, client requirements.

### Env & config

12. **What's the risk of `NEXT_PUBLIC_` on a secret?** -> inlined into client bundle at build time, publicly visible, requires rotation + rebuild to fix.
13. **How do you handle a build-once-deploy-many-environments workflow with differing public config?** -> avoid baking env-specific public values at build time; fetch/inject at runtime instead.

### Core Web Vitals

14. **Name the Core Web Vitals and one Next.js feature that helps each.**
15. **A page has poor INP - what do you look at?** -> main thread work, hydration cost, large client bundles, heavy event handlers.

---
