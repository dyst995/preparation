# 02. Modules

> Source: `interview-prep/nestjs/01-nestjs-architecture.md`

### Topics to learn
- [ ] `@Module()` metadata: `imports`, `controllers`, `providers`, `exports`
- [ ] Feature modules vs the root `AppModule`
- [ ] Shared modules (common utilities, exported providers)
- [ ] Global modules (`@Global()`) - when justified, when it's an anti-pattern
- [ ] Dynamic modules (`forRoot`, `forRootAsync`, `forFeature`)
- [ ] Re-exporting modules to expose their providers transitively
- [ ] Module boundaries and why "everything imports everything" is a smell

### Anatomy of a module

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Appointment]), AuthModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService], // only if other modules need it
})
export class AppointmentsModule {}
```

- `imports`: other modules whose **exported** providers this module needs.
- `controllers`: HTTP entry points owned by this module.
- `providers`: things Nest can inject - services, repositories, guards, factories.
- `exports`: subset of `providers` (or re-exported modules) visible to modules that `import` this one. Anything not exported is private to the module.

### Global modules

`@Global()` makes a module's exports available everywhere without explicit imports. Useful for things like a `ConfigModule` or a `LoggerModule` used by nearly every feature. **Overusing it defeats the purpose of modular boundaries** - it becomes implicit coupling. Rule of thumb: global only for true cross-cutting infrastructure, not domain logic.

### Dynamic modules (`forRoot` / `forRootAsync` / `forFeature`)

Used when a module needs runtime configuration (connection strings, options) rather than static wiring.

```typescript
// Static config
TypeOrmModule.forRoot({ type: 'mysql', host: '...', ... })

// Async config (reads from ConfigService, which itself must resolve first)
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'mysql',
    host: config.get('DB_HOST'),
    // ...
  }),
})

// forFeature registers entities/repositories scoped to a specific feature module
TypeOrmModule.forFeature([Appointment, Vet, Owner])
```

`forRoot*` is called once (usually in `AppModule`) to configure the whole integration; `forFeature` is called per feature module to register just what that module needs (e.g. specific entities/repositories).

### Interview questions

**Q: What's the difference between `imports` and `providers` in a module?**
> "`providers` are the things this module owns and can inject into its own controllers/services. `imports` bring in other modules so I can use *their exported* providers. A provider that isn't exported is effectively private to its module - other modules importing it won't see it."

**Q: When would you make a module global?**
> "Only for true infrastructure shared by almost every feature - configuration, logging, maybe a caching client. I wouldn't make a domain module like `AppointmentsModule` global; that hides dependencies and makes the module graph harder to reason about."

**Q: What problem do dynamic modules solve?**
> "They let a module accept configuration at import time instead of hardcoding it, and they let that configuration come from async sources - like reading DB credentials from `ConfigService` before `TypeOrmModule` connects. `forFeature` is the finer-grained version, scoping registration (like specific entities) to just the feature module that needs them, instead of re-declaring everything in the root."

---
