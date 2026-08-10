# 07. The full pipeline, in order (memorize this table)

> Source: `interview-prep/nestjs/02-rest-validation-swagger.md`

| Stage | Runs | Can short-circuit? | Typical responsibility |
|---|---|---|---|
| Middleware | Before Nest's request context is fully built | Yes (e.g. reject early) | Logging, CORS, raw body parsing, request ID injection |
| Guards | Before route handler | Yes (deny -> 403/401) | Auth, RBAC |
| Interceptors (pre) | Before route handler | Yes (e.g. serve from cache) | Timing, context setup, caching |
| Pipes | Just before handler args are bound | Yes (throw -> 400) | Validation, transformation of `@Body/@Param/@Query` |
| Route handler | The controller method | - | Delegate to service |
| Interceptors (post) | After handler resolves | - | Transform/wrap response, logging |
| Exception filters | Only if something threw, anywhere in the chain | - | Shape error response, logging |

### Interview question

**Q: If I want to reject unauthenticated requests as early and cheaply as possible, where does that logic belong?**
> "A guard, not a pipe or an interceptor before it in the after-handler sense - guards run before interceptors and pipes, so an unauthenticated request never even reaches validation logic or handler-adjacent interceptor work. Middleware runs even earlier but doesn't have access to the Nest execution context (route handler metadata, e.g. `@Roles()`), so RBAC in particular has to be a guard, not middleware."

---
