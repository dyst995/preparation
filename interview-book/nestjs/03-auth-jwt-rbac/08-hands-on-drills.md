# 08. Hands-on drills

> Source: `interview-prep/nestjs/03-auth-jwt-rbac.md`

- [ ] Implement `LocalStrategy` + `JwtStrategy` + login endpoint issuing an access+refresh pair.
- [ ] Implement a global `JwtAuthGuard` with a `@Public()` opt-out decorator.
- [ ] Implement `@Roles()` + `RolesGuard` with three roles (admin/vet/receptionist) and one endpoint per role restriction.
- [ ] Implement an ownership check in a service method (a "vet" can only edit their own resource) and write the 403 case.
- [ ] Implement refresh token rotation with hashed storage, and simulate a reuse-detection revocation.
- [ ] Write a password reset flow end to end: token generation, hashed storage, expiry, single-use enforcement.
- [ ] Rehearse the VetApp RBAC story out loud in under 90 seconds, including one follow-up answer (ownership checks).

---
