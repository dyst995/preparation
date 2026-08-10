# 03. Guards

> Source: `interview-prep/nestjs/03-auth-jwt-rbac.md`

### Topics to learn
- [ ] `CanActivate` interface, returns `boolean | Promise<boolean> | Observable<boolean>`
- [ ] `ExecutionContext` - accessing the request, route handler, and controller class
- [ ] `Reflector` - reading metadata set by custom decorators (`@Roles()`, `@Public()`)
- [ ] Guard execution order: global -> controller -> route-level
- [ ] Composing guards (`@UseGuards(AuthGuard('jwt'), RolesGuard)`)
- [ ] `@Public()` pattern to opt specific routes out of a global auth guard

### Global JWT guard + opt-out pattern

```typescript
// Applied globally via APP_GUARD, so every route requires auth by default
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) { super(); }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context); // delegates to Passport's jwt strategy
  }
}
```

```typescript
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

```typescript
@Public()
@Post('login')
login(@Body() dto: LoginDto) { /* ... */ }
```

Registering "deny by default, opt in to public" as the global posture is a strong senior signal - it means a developer forgetting to guard a new endpoint fails *safe* (401) instead of accidentally shipping an unauthenticated endpoint.

### Interview questions

**Q: Would you rather guard every route explicitly, or deny-by-default globally with opt-outs?**
> "Deny-by-default globally, with an explicit `@Public()` opt-out for the few routes that need it - login, register, health checks. That way a new endpoint someone forgets to annotate is safe by default (returns 401) instead of silently public, which is the failure mode that actually causes security incidents."

**Q: How does a guard read custom metadata like `@Roles('admin')`?**
> "Custom decorators like `@Roles()` just call `SetMetadata(key, value)` under the hood, attaching metadata to the route handler/class. The guard uses `Reflector.getAllAndOverride()` to read that metadata off `context.getHandler()`/`context.getClass()` at runtime and decide whether to allow the request."

---
