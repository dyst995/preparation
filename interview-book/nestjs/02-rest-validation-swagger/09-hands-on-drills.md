# 09. Hands-on drills

> Source: `interview-prep/nestjs/02-rest-validation-swagger.md`

- [ ] Write `CreateAppointmentDto` and `UpdateAppointmentDto` (via `PartialType`) with full `class-validator` decorators.
- [ ] Configure a global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, and `transform`, and verify an extra unexpected field actually gets rejected.
- [ ] Write a `TransformInterceptor` that wraps every response in `{ data, timestamp }`.
- [ ] Write a global exception filter that returns a consistent JSON error shape and maps a MySQL duplicate-key error to 409.
- [ ] Set up Swagger with `addBearerAuth()`, decorate one controller fully, and manually try an authenticated request from the Swagger UI.
- [ ] Draw the full request pipeline table from memory and check it against this chapter.

---
