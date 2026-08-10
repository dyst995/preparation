# 04. Interceptors

> Source: `interview-prep/nestjs/02-rest-validation-swagger.md`

### Topics to learn
- [ ] `NestInterceptor` interface, `intercept(context, next)`
- [ ] RxJS `next.handle()` returns an `Observable` - `pipe(map(...))` to transform responses
- [ ] Common use cases: logging, response transformation/wrapping, timeout, caching, `ClassSerializerInterceptor`
- [ ] Global vs controller vs route-level interceptors
- [ ] Interceptors run *around* the handler (before AND after) - unlike guards/pipes which only run before

### Logging interceptor example

```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();
    return next.handle().pipe(
      tap(() => this.logger.log(`${req.method} ${req.url} ${Date.now() - start}ms`)),
    );
  }
}
```

### Response transform interceptor (consistent envelope)

```typescript
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, { data: T }> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<{ data: T }> {
    return next.handle().pipe(map((data) => ({ data })));
  }
}
```

### Timeout interceptor

```typescript
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(10000),
      catchError((err) => err instanceof TimeoutError
        ? throwError(() => new RequestTimeoutException())
        : throwError(() => err)),
    );
  }
}
```

### Interview questions

**Q: How is an interceptor different from a pipe or a guard?**
> "A guard decides yes/no before the handler runs (auth/RBAC). A pipe transforms/validates specific arguments before the handler runs. An interceptor wraps the *entire* handler execution - it can run logic before *and* after, transform the response, catch and remap errors, or short-circuit and never call the handler at all (e.g. a caching interceptor returning a cached response). It's the only one of the three built around RxJS streams."

**Q: How would you add a consistent response envelope (`{ data, meta }`) across every endpoint without touching every controller?**
> "A global interceptor with `next.handle().pipe(map(...))` that wraps whatever the handler returns. That's also where I'd centralize things like stripping `null`/`undefined` fields or adding a `requestId` for tracing, without polluting every service with cross-cutting formatting."

---
