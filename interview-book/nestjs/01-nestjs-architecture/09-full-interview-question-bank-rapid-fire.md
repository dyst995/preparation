# 09. Full interview question bank (rapid fire)

> Source: `interview-prep/nestjs/01-nestjs-architecture.md`

1. **What is NestJS built on top of?** -> Express/Fastify adapter, platform-agnostic core.
2. **What's in `@Module()` metadata?** -> imports, controllers, providers, exports.
3. **Difference between a provider and a controller?** -> provider = injectable logic; controller = HTTP entry point.
4. **What are the 4 custom provider types?** -> useClass, useValue, useFactory, useExisting.
5. **What is a circular dependency and how do you break it?** -> mutual imports; `forwardRef()`, or better, extract shared logic.
6. **What are the 3 provider scopes?** -> DEFAULT, REQUEST, TRANSIENT.
7. **Why is REQUEST scope risky?** -> propagates up the dependency graph, perf cost.
8. **What does `enableShutdownHooks()` do?** -> registers process signal listeners so lifecycle shutdown hooks actually fire.
9. **Order of guards vs pipes vs interceptors?** -> middleware -> guards -> interceptors(before) -> pipes -> handler -> interceptors(after) -> filters.
10. **Why validate env vars at startup?** -> fail fast with a clear error instead of a runtime surprise.
11. **Feature-based vs layer-based structure - which do you prefer and why?**
12. **How would you structure a rewrite of a legacy monolith into NestJS?**

---
