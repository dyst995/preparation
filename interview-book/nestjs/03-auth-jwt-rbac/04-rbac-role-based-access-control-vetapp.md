# 04. RBAC (Role-Based Access Control) - VetApp

> Source: `interview-prep/nestjs/03-auth-jwt-rbac.md`

### Topics to learn
- [ ] Roles decorator + `RolesGuard` pattern
- [ ] Role hierarchy vs flat roles (admin > vet > receptionist, or fully flat with explicit permission sets)
- [ ] Role-based vs permission-based (fine-grained) access control - trade-offs
- [ ] Combining authentication guard + RBAC guard (order matters: authenticate first, then authorize)
- [ ] Resource ownership checks that RBAC alone can't express (e.g. "a vet can only edit *their own* appointments")
- [ ] Where ownership checks should live: guard vs service layer

### VetApp roles (concrete example to use in interviews)

| Role | Can do |
|---|---|
| `admin` | Full access: manage users/roles, view all clinics' data, financial reports |
| `vet` | View/manage their own appointments and patient records, write medical notes |
| `receptionist` | Schedule/reschedule appointments, manage owner/pet records, cannot access medical notes or payments admin |

### `@Roles()` decorator + `RolesGuard`

```typescript
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true; // no @Roles() = no restriction beyond auth

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role === role);
  }
}
```

```typescript
@Roles('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Delete('users/:id')
deleteUser(@Param('id') id: number) { /* ... */ }
```

**Guard ordering matters:** `JwtAuthGuard` must run before `RolesGuard` - you can't authorize a role for a request you haven't authenticated yet. Nest runs guards in the array order given to `@UseGuards()`.

### Ownership checks (RBAC isn't enough alone)

RBAC answers "can this *role* do this *type* of action." It doesn't answer "can *this specific vet* edit *this specific appointment*, which belongs to a different vet." That's an ownership/ABAC-style check, usually done in the service layer (or a dedicated guard reading the route param):

```typescript
async update(id: number, dto: UpdateAppointmentDto, user: AuthUser) {
  const appointment = await this.repo.findOneByOrFail({ id });
  if (user.role === 'vet' && appointment.vetId !== user.id) {
    throw new ForbiddenException('You can only modify your own appointments');
  }
  return this.repo.save({ ...appointment, ...dto });
}
```

### Role-based vs permission-based

| | Role-based (RBAC) | Permission-based |
|---|---|---|
| Model | User has one (or few) roles; role implies a fixed set of allowed actions | User has explicit granular permissions, possibly composed from multiple roles |
| Simplicity | Simple to reason about, easy to implement | More flexible but more moving parts |
| Fits VetApp | Yes - small, well-defined role set (admin/vet/receptionist) | Overkill unless requirements get much more granular |
| When to switch | - | When you need things like "vet A can view but not edit," or per-clinic scoping in a multi-tenant system |

### Interview questions

**Q: Walk me through how you implemented RBAC on VetApp.**
> "I modeled three roles - admin, vet, receptionist - each with a clear set of allowed actions. I built a `@Roles()` decorator using `SetMetadata`, and a `RolesGuard` that reads that metadata via `Reflector` and compares it against the authenticated user's role, which was already attached to the request by a preceding JWT auth guard. For anything RBAC alone couldn't express - like a vet only editing their own patients' records - I added an explicit ownership check in the service layer, because that's data-dependent, not just role-dependent."

**Q: Why put the ownership check in the service instead of the guard?**
> "The guard has cheap access to route params and the authenticated user, but checking 'does this appointment belong to this vet' usually requires a DB lookup of the resource itself - which the service is about to do anyway to perform the action. Duplicating that lookup in a guard means either two DB round-trips or awkward request-object caching between guard and service. I keep RBAC (role-level) in the guard, and ownership (data-level) in the service, right where the resource is already being fetched."

**Q: What's the security risk of trusting a role claim baked into an old JWT?**
> "If a user's role changes (promoted, demoted, deactivated) mid-token-lifetime, a stateless JWT won't reflect that until it expires. I mitigate this by keeping access token lifetimes short, and for sensitive role changes (e.g. admin revokes someone), I invalidate their refresh tokens immediately so they can't silently get a new access token with the old role past that point."

---
