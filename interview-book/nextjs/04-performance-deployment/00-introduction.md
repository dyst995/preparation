# 04 - Performance & Deployment — Introduction

> Source: `interview-prep/nextjs/04-performance-deployment.md`

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
