# 08. Full interview question bank (rapid fire)

> Source: `interview-prep/nestjs/02-rest-validation-swagger.md`

1. **PUT vs PATCH?** -> full replace vs partial update.
2. **401 vs 403?** -> not authenticated vs authenticated-but-not-allowed.
3. **Why DTOs instead of validating entities directly?** -> separate wire contract from storage shape; avoid leaking sensitive fields.
4. **`whitelist` vs `forbidNonWhitelisted`?** -> silently strip vs hard-reject unexpected fields.
5. **What does `transform: true` unlock?** -> DTO class-instance construction + primitive coercion for params/query.
6. **Guard vs pipe vs interceptor vs filter - one-line each.**
7. **What's the default behavior if you throw a plain `Error` instead of `HttpException`?** -> becomes a generic 500, message hidden from client by default.
8. **How do you keep Swagger docs accurate without hand-writing OpenAPI YAML?** -> decorate the same DTOs/controllers used for validation/routing.
9. **How would you version a breaking API change?** -> URI versioning (`/v2/...`), keep `/v1` running until clients migrate.
10. **How do you avoid leaking a password hash in an API response?** -> `@Exclude()` + `ClassSerializerInterceptor`, and avoid over-fetching sensitive columns.

---
