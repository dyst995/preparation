# 08. Project structure

> Source: `interview-prep/nestjs/01-nestjs-architecture.md`

### Topics to learn
- [ ] Feature-based structure vs layer-based structure
- [ ] Nest CLI module/controller/service generation conventions
- [ ] Shared/common module for cross-cutting pieces (filters, guards, decorators, pipes)
- [ ] Barrel files (`index.ts`) - convenience vs circular-import risk
- [ ] Monorepo awareness: Nest CLI "apps and libs" mode for multiple deployables sharing code
- [ ] Migration strategy for legacy rewrites (VetApp: PHP -> NestJS module by module)

### Feature-based structure (what I use)

```
src/
  main.ts
  app.module.ts
  config/
    env.validation.ts
    database.config.ts
  common/
    decorators/        (e.g. @CurrentUser, @Roles)
    filters/            (global exception filter)
    guards/              (JwtAuthGuard, RolesGuard)
    interceptors/        (logging, transform)
    pipes/
  modules/
    auth/
      auth.module.ts
      auth.controller.ts
      auth.service.ts
      strategies/
        jwt.strategy.ts
    appointments/
      appointments.module.ts
      appointments.controller.ts
      appointments.service.ts
      dto/
        create-appointment.dto.ts
        update-appointment.dto.ts
      entities/
        appointment.entity.ts
    vets/
    owners/
    payments/
    records/
    notifications/
```

Layer-based (`controllers/`, `services/`, `entities/` as top-level folders across the whole app) tends to fall apart once the app has more than a few domains - unrelated features end up mixed in the same folder, and it's harder to see or enforce module boundaries. Feature-based folders map directly onto Nest modules, which map onto business domains - easy to reason about, easy to eventually extract into a microservice if needed.

### VetApp rewrite structure story (use as a talking point)

> "The PHP backend had grown organically with logic spread across scripts. I rewrote it module-by-module in NestJS - auth, vets, owners, appointments, records, payments, notifications - each as its own feature module with its own controller/service/DTOs/entities, while pointing TypeORM at the *existing* MySQL schema so we didn't need a risky data migration. That let us cut over incrementally rather than a big-bang rewrite, and RBAC/validation/Swagger came for free at the framework level instead of being reimplemented per endpoint like in the PHP version."

### Interview questions

**Q: How do you decide module boundaries?**
> "Around business capabilities/domains, not technical layers. `Appointments`, `Payments`, `VetRecords` are separate modules because they change for different reasons and different people own them conceptually, even if one engineer touches all of them. Shared technical concerns - guards, filters, common decorators - live in a `common` module that everything can depend on."

**Q: What's your process for rewriting a legacy backend without a big-bang cutover?**
> "Map the legacy system's actual behavior (including undocumented quirks) domain by domain, keep the same database (or a compatible schema) so you're not doing a risky simultaneous data migration, stand up one NestJS module at a time behind the same routes/contracts the old system served, and use feature flags or a routing layer (e.g. Nginx path rules) to cut traffic over incrementally per-domain. VetApp is exactly this: rewritten in NestJS against the existing MySQL DB, module by module."

---
