# 03 - Middleware, Auth & APIs — Introduction

> Source: `interview-prep/nextjs/03-middleware-auth-apis.md`

> Goal: Explain Middleware and Route Handlers precisely, describe JWT/session auth patterns at a practical level, and give a sharp, opinionated answer to "why do you pair Next.js with NestJS instead of just using Next.js API routes for everything?" - a question you will very likely get given your CV.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Explain what Next.js Middleware is, where it runs, and what it can and can't do.
2. Write and reason about a protected-route Middleware pattern.
3. Explain Route Handlers (`route.ts`) - methods, request/response shape, dynamic vs static Route Handlers.
4. Describe JWT-based and session-based auth patterns at a level that satisfies both frontend and backend interviewers.
5. Explain cookie storage tradeoffs (httpOnly, secure, sameSite) for tokens.
6. Give a clear, opinionated comparison of Next.js Route Handlers vs a separate NestJS backend, and justify when you'd use each - tied to your actual project experience.
7. Describe how the Next.js frontend and a NestJS backend talk to each other in practice (server-to-server fetch, client-to-backend via a BFF pattern, or direct client calls).

---
