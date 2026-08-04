# 04 - Performance & Deployment

> Goal: Speak concretely about `next/image` and `next/font`, bundle analysis, Edge vs Node runtimes, and - your strongest differentiator - deploying a Next.js app yourself with Docker, Nginx, and SSL, because you actually did this on Travel2Georgia while most candidates have only clicked "Deploy" on Vercel.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Explain how `next/image` optimizes images and what problems it solves versus a plain `<img>`.
2. Explain `next/font` and why it avoids layout shift and external network requests for fonts.
3. Analyze and reduce a Next.js bundle using `@next/bundle-analyzer` and reason about code splitting.
4. Explain the Edge runtime vs Node.js runtime tradeoffs and when to pick each.
5. Describe deploying Next.js with Docker (standalone output), Nginx as a reverse proxy, and SSL/domain setup - your Travel2Georgia story.
6. Explain environment variable handling: build-time vs runtime, `NEXT_PUBLIC_` prefix, and secrets hygiene.
7. Name Core Web Vitals and connect at least one to a real optimization you'd make.

---

## 1. `next/image` - image optimization

### Topics to learn

- [ ] Automatic resizing, format conversion (WebP/AVIF where supported), and lazy loading by default
- [ ] `width`/`height` (or `fill`) required so the browser can reserve space and avoid layout shift (CLS)
- [ ] `priority` prop for above-the-fold images (e.g. hero image) to opt out of lazy loading and hint eager fetch
- [ ] Remote images require `images.remotePatterns` (or legacy `domains`) configured in `next.config.js` - a very common "why isn't my image showing" bug
- [ ] Image Optimization API runs per-request unless cached/CDN-fronted; on serverless/edge deployments this has cost and latency implications; can be disabled (`unoptimized: true`) if self-hosting without the optimizer, or if using a third-party image CDN already
- [ ] `sizes` prop for responsive images so the browser (and the optimizer) picks the right resolution per breakpoint

### Interview question

**Q: Why use `next/image` instead of a plain `<img>` tag?**

> "It automatically serves appropriately sized, modern-format images, lazy-loads offscreen images, and forces me to declare dimensions up front so the layout doesn't shift as images load - that directly helps Cumulative Layout Shift, one of the Core Web Vitals. On a content-heavy site like Travel2Georgia with lots of tour photography, that's a meaningful, measurable difference versus shipping full-resolution JPEGs and letting the browser scale them down client-side."

**Q: You added a remote image URL and it's not rendering - why?**

> "Almost certainly `next/image` needs the remote host allow-listed in `next.config.js` under `images.remotePatterns`, otherwise it blocks optimizing (and therefore serving) images from unknown domains for security reasons."

---

## 2. `next/font` - font optimization

### Topics to learn

- [ ] `next/font/google` and `next/font/local` self-host fonts at build time - no runtime request to Google Fonts' CDN, which avoids a render-blocking third-party network request
- [ ] Automatic `font-display` handling and preloading to reduce layout shift from font swapping (a contributor to CLS)
- [ ] Subsetting support to ship only the character sets you need
- [ ] Using a font as a CSS variable (`variable: "--font-inter"`) to integrate with Tailwind/CSS without hardcoding font-family everywhere

### Interview question

**Q: Why is `next/font` better than a `<link>` to Google Fonts in `<head>`?**

> "A `<link>` to Google Fonts means the browser has to make an extra round trip to a third-party domain before it can render text in that font, which can block or delay text rendering and contribute to layout shift when the fallback font swaps to the real one. `next/font` downloads and self-hosts the font at build time, so it's served from the same origin, can be preloaded properly, and Next.js manages `font-display` behavior to minimize shift - all without me thinking about it beyond importing the font."

---

## 3. Bundle analysis and code splitting

### Topics to learn

- [ ] `@next/bundle-analyzer` wraps `next.config.js` and generates a visual treemap of what's in each JS bundle
- [ ] Automatic route-based code splitting - each route only ships the JS it needs, not the whole app
- [ ] `next/dynamic` for manual code splitting of heavy Client Components (charting libraries, rich text editors, map widgets) so they aren't in the main bundle for routes that don't need them
- [ ] `ssr: false` option in `next/dynamic` to skip server-rendering a component entirely (for browser-only libraries)
- [ ] Server Components already reduce client bundle size structurally - this is often a bigger win than manual splitting, since non-interactive UI ships zero JS by default
- [ ] Common bundle bloat causes: importing a whole utility library instead of a single function (check for tree-shaking support), accidentally marking a large subtree `"use client"`, including heavy moment.js/lodash-style libraries without lighter alternatives

### Example: lazy-loading a heavy client widget

```tsx
import dynamic from "next/dynamic";

const RevenueChart = dynamic(() => import("./revenue-chart"), {
  loading: () => <ChartSkeleton />,
  ssr: false, // charting library only works in the browser
});
```

### Interview question

**Q: How would you find out why a page's JS bundle is unexpectedly large?**

> "I'd run the bundle analyzer against the build to see the actual treemap of what's shipped for that route, then look for the usual suspects: a large third-party library that isn't tree-shaken well, a component that's marked `'use client'` higher in the tree than necessary (pulling everything under it into the client bundle), or a heavy widget that's always loaded eagerly instead of via `next/dynamic`. On a Server-Components-first App Router app, my first instinct is also to check whether something that could stay a Server Component was accidentally made a Client Component."

---

## 4. Edge runtime vs Node.js runtime

### Topics to learn

- [ ] `export const runtime = "edge" | "nodejs"` on pages, layouts, and Route Handlers
- [ ] Edge runtime: runs on a lightweight V8-isolate-based runtime (not full Node.js), extremely fast cold starts, deployed geographically closer to users on platforms that support it, but with a restricted API surface (no arbitrary native Node modules, limited/no filesystem access, size limits)
- [ ] Node.js runtime: full Node.js API access, all npm packages work, higher cold-start cost on serverless platforms, no built-in geographic distribution
- [ ] Middleware always runs on the Edge runtime (a deliberate constraint, not a choice)
- [ ] When self-hosting on your own server/Docker container (like Travel2Georgia), the Edge-vs-Node distinction matters less for latency/geo-distribution since you're running one Node.js process anyway - the distinction matters most on serverless/multi-region platforms
- [ ] Decision heuristic: Edge for latency-sensitive, lightweight logic (auth checks, redirects, header rewriting, simple personalization); Node.js for anything needing full library support, heavier compute, or direct DB drivers that assume a Node environment

### Interview question

**Q: When would you choose the Edge runtime for a Route Handler?**

> "If it's lightweight and latency-sensitive - a simple auth check, a redirect, geolocation-based content - and doesn't need a Node-specific library or heavy compute. If it needs a full ORM/DB client with native bindings, file system access, or a large npm dependency that assumes Node, I keep it on the Node.js runtime. On a self-hosted setup like Travel2Georgia, running everything as one Node.js process behind Nginx, the Edge/Node distinction is more about API surface constraints than about the geographic-latency benefit you'd get from an edge network - since it's one server in one region either way."

---

## 5. Docker, Nginx, SSL deployment (Travel2Georgia)

This is your standout section. Most Next.js candidates have only used Vercel and go blank on real infra questions - you actually did this.

### Topics to learn

- [ ] `next.config.js` -> `output: "standalone"` produces a minimal, self-contained server bundle (only the files actually needed at runtime) - dramatically smaller Docker images than copying the whole `node_modules`
- [ ] Multi-stage Docker build: one stage installs deps and builds, a final slim stage copies only the standalone output + static assets + public folder
- [ ] Running `node server.js` (the generated standalone server) inside the container, typically on an internal port (e.g. 3000)
- [ ] Nginx as a reverse proxy in front of the Node process: terminates SSL, handles gzip/br compression, sets caching headers for static assets, can serve `/_next/static/*` directly or proxy it, load-balances if multiple app instances run
- [ ] SSL via Let's Encrypt/Certbot (common self-hosted pattern) or a managed certificate, renewed automatically
- [ ] Domain/DNS pointing at the server, Nginx `server_name` and `server` blocks for the domain, HTTP -> HTTPS redirect
- [ ] Process management/restart policy (Docker restart policy, or a process manager) so the app comes back up after a crash or server reboot
- [ ] Why you'd choose this over Vercel: full control over infra, cost predictability at scale, ability to co-locate with other self-hosted services (DB, other backend), no vendor lock-in, and sometimes a project/client requirement to self-host

### Example: minimal Dockerfile shape for standalone output

```dockerfile
# deps stage
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# runtime stage - only what's needed to run
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

### Example: Nginx reverse proxy shape

```nginx
server {
    listen 80;
    server_name travel2georgia.example;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name travel2georgia.example;

    ssl_certificate     /etc/letsencrypt/live/travel2georgia.example/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/travel2georgia.example/privkey.pem;

    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Interview answer sketch (this is a genuinely strong story - use it)

> "On Travel2Georgia I owned the full deployment path, not just the app code. I used `output: 'standalone'` in `next.config.js` so the Docker image only contains the minimal server output instead of the entire `node_modules`, built it as a multi-stage Docker image to keep the final image small, and ran it behind Nginx as a reverse proxy. Nginx terminated SSL - certificates via Let's Encrypt - handled the HTTP-to-HTTPS redirect, served or cached the `/_next/static` assets aggressively since those are immutable, hashed filenames, and forwarded everything else to the Node process. I also handled domain/DNS setup and made sure the container had a restart policy so the app would recover automatically if it crashed or the host rebooted. It's a very different experience from clicking 'Deploy' on a managed platform, and it gave me a much better understanding of what those platforms are actually doing under the hood - which also makes me faster at debugging production issues on either kind of setup."

**Follow-up:** "Why self-host instead of Vercel for this project?"
> "It came down to control and cost predictability for a client project, and the fact that I was also running the backend services and could co-locate them efficiently on the same infrastructure rather than paying for and coordinating multiple managed platforms."

---

## 6. Environment variables and config

### Topics to learn

- [ ] `NEXT_PUBLIC_` prefix = inlined into the client bundle at build time, visible to anyone - never put secrets behind this prefix
- [ ] Non-prefixed env vars are only available server-side (Server Components, Route Handlers, Server Actions, `next.config.js`)
- [ ] Build-time vs runtime env vars: in a standard Next.js build, `NEXT_PUBLIC_*` values get baked in at build time - if you need truly runtime-configurable public values (e.g. same Docker image promoted through dev/staging/prod without rebuilding), you need a pattern for that (e.g. reading config at request time from a non-`NEXT_PUBLIC_` var and exposing via an API route, or entrypoint scripts that substitute values before `node server.js` starts)
- [ ] `.env.local`, `.env.production`, `.env.development` precedence and gitignore hygiene - never commit real secrets
- [ ] In Docker deployments, secrets are typically passed as container environment variables at runtime, not baked into the image

### Interview question

**Q: What happens if you accidentally use `NEXT_PUBLIC_` on an API secret?**

> "It gets inlined directly into the client-side JavaScript bundle at build time, meaning literally anyone can open dev tools and read it. It's not a runtime leak you can patch - you'd have to rotate the secret and rebuild without the prefix. That's why I'm strict about only using `NEXT_PUBLIC_` for values that are genuinely safe to expose, like a public API base URL or a public analytics key, and keeping everything else - DB credentials, private API keys, JWT signing secrets - unprefixed and server-only."

**Q: You have one Docker image you want to promote from staging to production without rebuilding - what's the env var gotcha?**

> "If any config differs between environments and is read via `NEXT_PUBLIC_*`, it's already baked into that build's JS bundle and can't change at runtime without rebuilding. For a build-once-deploy-many workflow, public runtime config needs a different pattern - fetching config from an endpoint at runtime, or using a startup script that injects values into a runtime-read file/window global before the app serves traffic - rather than relying on build-time env inlining."

---

## 7. Core Web Vitals and general performance framing

### Topics to learn

- [ ] LCP (Largest Contentful Paint) - how fast the main content renders; `next/image` `priority`, reducing server response time, minimizing render-blocking resources all help
- [ ] CLS (Cumulative Layout Shift) - avoided by reserving space for images/fonts/ads (this is exactly what `next/image` and `next/font` are built to prevent)
- [ ] INP (Interaction to Next Paint, replaced FID) - responsiveness to user input; keeping the main thread free, minimizing large client bundles/hydration cost, avoiding long synchronous work in event handlers
- [ ] TTFB (Time to First Byte) - server/rendering speed; caching strategy (chapter 02) is the biggest lever here
- [ ] `next build` output tells you per-route whether it's static (○), dynamic (λ/ƒ depending on version), or SSG with revalidate - a quick sanity check after any rendering-strategy change

### Interview question

**Q: A page has a bad LCP score - what do you check, in order?**

> "First, what the LCP element actually is - often a hero image or a large text block. If it's an image, check it's using `next/image` with `priority` and correctly sized, not lazy-loaded. Then look at server response time - is this route static/ISR (fast, cached) or dynamic (paying full render cost per request)? Then check for render-blocking resources - large synchronous JS or CSS delaying paint. I'd use Lighthouse or the Vercel/browser performance panel to confirm which of these is actually the bottleneck before changing anything, rather than guessing."

---

## Full interview question bank (with answer targets)

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

## Hands-on drills (do these)

- [ ] Write out, from memory, a minimal multi-stage Dockerfile for a Next.js app using `output: standalone`.
- [ ] Write an Nginx server block that redirects HTTP to HTTPS and reverse-proxies to a local Next.js process.
- [ ] Run (or describe running) `@next/bundle-analyzer` on a project and explain what you'd look for in the output.
- [ ] Explain, out loud, the exact risk of putting a secret behind `NEXT_PUBLIC_` and how you'd catch it in code review.
- [ ] Rehearse the Travel2Georgia deployment story end-to-end (build -> Docker -> Nginx -> SSL -> domain) in under 90 seconds.

---

## Senior red flags / green flags

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

## Tie-backs to your experience (use in answers)

- Travel2Georgia is your headline story for this entire chapter: Docker, Nginx, SSL, domain management, all owned end-to-end, which is genuinely rare among frontend-leaning candidates.
- Your broader DevOps exposure (AWS S3/SNS, Fastlane CI/CD for mobile, GitLab Runner pipelines) reinforces that infrastructure ownership isn't a one-off for you - it's a pattern across your projects.
- Clean House's dashboards (warehouse management, delivery workflows) are good supporting material for Core Web Vitals/performance discussion, since dashboard-heavy UIs are exactly where bundle size and INP problems show up in practice.

---

## Mastery checklist

- [ ] I can explain what `next/image` and `next/font` each solve, tied to specific Core Web Vitals.
- [ ] I can describe how to find and fix bundle bloat.
- [ ] I can explain Edge vs Node runtime tradeoffs and when the distinction matters less (self-hosted single server).
- [ ] I can walk through the Travel2Georgia Docker/Nginx/SSL deployment from memory, in under 90 seconds.
- [ ] I can explain the `NEXT_PUBLIC_` risk and the build-once-deploy-many env var gotcha.
- [ ] I can name the Core Web Vitals and connect each to a concrete Next.js feature or practice.
