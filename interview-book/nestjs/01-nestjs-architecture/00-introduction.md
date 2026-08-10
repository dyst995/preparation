# 01 - NestJS Architecture: Modules, Providers, DI, Controllers, Services, Lifecycle, Config — Introduction

> Source: `interview-prep/nestjs/01-nestjs-architecture.md`

> Goal: explain how a NestJS application is put together and *why* it is structured that way, well enough to design a new module from scratch on a whiteboard and justify every decision.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Explain what NestJS is and why it exists on top of Express/Fastify.
2. Explain modules: what they are, what belongs in `imports`/`providers`/`controllers`/`exports`.
3. Explain dependency injection (DI) in Nest: tokens, providers, scopes, circular deps.
4. Explain controllers: routing, decorators, request/response handling.
5. Explain the role of services and where business logic should live.
6. Walk through the full request lifecycle and application lifecycle hooks.
7. Configure an app with `@nestjs/config`, including validation and typed config.
8. Justify a feature-based project structure, and describe how you structured the VetApp rewrite.

---
