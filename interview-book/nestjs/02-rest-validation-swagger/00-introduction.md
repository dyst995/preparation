# 02 - REST Design, Validation & Swagger: DTOs, Pipes, Interceptors, Filters, OpenAPI — Introduction

> Source: `interview-prep/nestjs/02-rest-validation-swagger.md`

> Goal: design a clean REST API surface, enforce input correctness at the edge, shape consistent responses/errors, and document all of it automatically - the daily bread-and-butter of NestJS interviews.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Design REST resources with correct verbs, status codes, and URL structure.
2. Write DTOs with `class-validator`/`class-transformer` and explain the validation pipeline.
3. Explain and write custom pipes, and configure the global `ValidationPipe` correctly.
4. Explain interceptors and use them for response shaping, logging, and timeouts.
5. Explain the exception hierarchy and write custom exception filters.
6. Wire up Swagger/OpenAPI so DTOs generate accurate, browsable API docs.
7. Recite the exact execution order of middleware/guards/interceptors/pipes/filters.

---
