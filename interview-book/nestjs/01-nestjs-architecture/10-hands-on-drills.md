# 10. Hands-on drills

> Source: `interview-prep/nestjs/01-nestjs-architecture.md`

- [ ] Sketch a module diagram for a mini "Appointments" domain: module, controller, service, entity, DTOs - draw the arrows for imports/exports.
- [ ] Write a custom provider using `useFactory` that builds a payment gateway client based on `ConfigService`.
- [ ] Intentionally create a circular dependency between two services, hit the error, then fix it with `forwardRef()` and again by extracting a shared module - compare both fixes.
- [ ] Write env validation with `class-validator` that fails startup on a missing required var; run it and read the error.
- [ ] Draw the full request lifecycle pipeline from memory, then check it against this chapter.

---
