# 06. Application & request lifecycle

> Source: `interview-prep/nestjs/01-nestjs-architecture.md`

### Topics to learn
- [ ] Bootstrap sequence: `NestFactory.create()` -> module resolution -> `listen()`
- [ ] Lifecycle hooks: `OnModuleInit`, `OnApplicationBootstrap`, `OnModuleDestroy`, `beforeApplicationShutdown`, `OnApplicationShutdown`
- [ ] `app.enableShutdownHooks()` and why it matters for graceful shutdown
- [ ] Order of execution for guards -> interceptors (before) -> pipes -> controller -> interceptors (after) -> filters (on error)
- [ ] Middleware runs *before* guards, outside the Nest request pipeline proper

### Bootstrap

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks(); // required for OnApplicationShutdown to actually fire on SIGTERM
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(3000);
}
bootstrap();
```

### Lifecycle hooks, in order

| Hook | Fires when | Typical use |
|---|---|---|
| `OnModuleInit` | After the host module's dependencies are resolved | Warm caches, verify config, open non-critical connections |
| `OnApplicationBootstrap` | After the *entire* app's modules have initialized | Cross-module startup logic that needs everything ready |
| `OnModuleDestroy` | When shutdown begins, module-by-module | Close per-module resources |
| `beforeApplicationShutdown` | After destroy hooks, before the app stops accepting requests fully | Final cleanup with access to the shutdown signal |
| `OnApplicationShutdown(signal)` | Right before process exit | Close DB pools, flush logs, deregister from service discovery |

**Gotcha interviewers probe:** shutdown hooks do nothing unless `app.enableShutdownHooks()` was called - a very common "why doesn't my cleanup run on SIGTERM in Kubernetes/Docker" bug.

### The full request pipeline (memorize this order)

```
Incoming request
  -> Middleware (Express-level, no DI context awareness of route handler yet)
  -> Guards (can activate at controller or route level; auth/RBAC checks)
  -> Interceptors (before handler - e.g. start a timer, wrap in a transaction context)
  -> Pipes (validate/transform @Body/@Param/@Query)
  -> Route handler (controller method)
  -> Interceptors (after handler - transform response, cache, log)
  -> Exception filters (only if something threw)
  -> Response sent
```

### Interview questions

**Q: Walk me through what happens when a request hits a NestJS app, end to end.**
> "First it passes through any global/module middleware, then guards decide if the request is allowed to proceed - auth and RBAC live here. Interceptors then run their pre-handler logic, pipes validate and transform the incoming body/params/query against the DTO, and the controller method finally executes, usually delegating to a service. On the way out, interceptors get a second chance to transform the response, and if anything threw at any point, exception filters catch it and shape the error response."

**Q: Why did my `OnApplicationShutdown` hook never run in production?**
> "Almost certainly because `app.enableShutdownHooks()` was never called - Nest doesn't listen for termination signals by default, so shutdown hooks are dead code until you opt in."

---
