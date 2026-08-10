# 04. Error handling

> Source: `interview-prep/nestjs/06-nodejs-runtime.md`

### Topics to learn
- [ ] `try/catch` with `async/await` - the modern default, but every `await` needs to be inside a `try` (or handled by an outer boundary) or it becomes an unhandled rejection
- [ ] `process.on('uncaughtException', ...)` and `process.on('unhandledRejection', ...)` as last-resort safety nets, not a substitute for real handling
- [ ] Why you generally should NOT try to "recover and continue" after an uncaught exception - process state may be corrupted; log and exit, let the process manager (PM2/Kubernetes) restart it
- [ ] NestJS's global exception filter as the framework-level safety net for HTTP request errors specifically (doesn't catch things outside the request lifecycle, e.g. errors in a raw `setInterval` callback or a queue consumer)
- [ ] Graceful shutdown: stop accepting new requests, finish in-flight ones, close DB/queue connections, then exit
- [ ] Domain-specific error classes (e.g. `PaymentDeclinedError`, `AppointmentConflictError`) mapped to appropriate HTTP status in filters, rather than throwing generic errors everywhere

### Global safety nets

```typescript
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason);
  // log and let it be visible; don't silently swallow
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception - shutting down', err);
  process.exit(1); // let the process manager restart with a clean state
});
```

### Graceful shutdown

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  await app.listen(3000);
}
```

```typescript
@Injectable()
export class DatabaseCleanup implements OnApplicationShutdown {
  constructor(private dataSource: DataSource) {}
  async onApplicationShutdown(signal?: string) {
    await this.dataSource.destroy(); // close pool cleanly before process exits
  }
}
```

In a containerized deployment (Docker/Kubernetes), the orchestrator sends `SIGTERM` before force-killing with `SIGKILL` after a grace period - if the app doesn't stop accepting new connections and drain in-flight requests during that window, you get dropped requests on every deploy/scale-down event.

### Interview questions

**Q: Should you try to recover from an `uncaughtException` and keep the process running?**
> "Generally no - by the time an exception reaches that top-level handler, something escaped every other layer of handling, and the process's internal state could be inconsistent in ways that are hard to reason about. The safer pattern is log it with full context, then exit, and let the process manager (PM2, Kubernetes) restart a fresh process. Trying to 'limp along' risks subtle corruption or repeated failures that are much harder to debug than a clean restart."

**Q: How do you make sure in-flight requests aren't dropped during a deploy?**
> "Graceful shutdown: the process needs to stop accepting *new* connections on `SIGTERM`, let in-flight requests finish within a grace period, close DB/queue connections cleanly, and only then exit. In Nest that's `app.enableShutdownHooks()` plus lifecycle hooks like `OnApplicationShutdown`, combined with the orchestrator (Kubernetes readiness/liveness probes, or PM2's reload) giving the process enough grace time before a hard kill."

---
