# 01. What is NestJS and why does it exist

> Source: `interview-prep/nestjs/01-nestjs-architecture.md`

### Core idea

NestJS is a Node.js framework that sits on top of an HTTP adapter (Express by default, or Fastify) and adds:

- **Opinionated architecture** inspired by Angular: modules, decorators, dependency injection.
- **TypeScript-first** design (though plain JS is supported).
- A **platform-agnostic core** - the same app can serve HTTP, run as a microservice (TCP/Redis/Kafka/gRPC), or run a hybrid of both.
- Built-in solutions for **cross-cutting concerns**: guards, interceptors, pipes, filters, middleware.

### Why not "just Express"

| Plain Express | NestJS |
|---|---|
| No enforced structure - grows into spaghetti as it scales | Enforced module/provider structure |
| DI is manual (or third-party) | DI is first-class, testable, mockable |
| Cross-cutting concerns hand-rolled per route | Guards/interceptors/pipes/filters as reusable, declarative building blocks |
| No built-in testing scaffolding | `@nestjs/testing` with `Test.createTestingModule` |
| Swagger/validation are DIY | First-class `@nestjs/swagger` + `class-validator` integration |

### Interview answer sketch

> "NestJS is a Node.js framework built on top of Express (or Fastify) that brings Angular-style architecture to the backend: modules, dependency injection, and decorators. It's opinionated on purpose - it gives teams a consistent way to structure controllers, services, and cross-cutting concerns like validation, auth, and logging, so a codebase stays maintainable as it grows past a handful of routes. On VetApp, that structure is exactly why we could rewrite a PHP monolith into NestJS module by module instead of a risky big-bang rewrite."

---
