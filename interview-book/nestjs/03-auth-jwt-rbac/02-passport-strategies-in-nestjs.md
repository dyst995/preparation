# 02. Passport strategies in NestJS

> Source: `interview-prep/nestjs/03-auth-jwt-rbac.md`

### Topics to learn
- [ ] `@nestjs/passport` + `passport-jwt` + `passport-local`
- [ ] `LocalStrategy` for username/password login (validates credentials, returns user)
- [ ] `JwtStrategy` for bearer token verification (validates signature/expiry, returns `req.user`)
- [ ] `ExtractJwt.fromAuthHeaderAsBearerToken()`
- [ ] `validate()` method contract - what you return becomes `request.user`
- [ ] `AuthGuard('jwt')` / `AuthGuard('local')` tying a strategy to a guard
- [ ] Multiple strategies (e.g. separate `jwt-refresh` strategy validating the refresh token specifically)

### LocalStrategy (login step)

```typescript
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<AuthUser> {
    const user = await this.authService.validateCredentials(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return user; // becomes request.user inside the login route
  }
}
```

### JwtStrategy (protecting routes)

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    // payload signature+expiry already verified by Passport at this point
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

```typescript
@UseGuards(AuthGuard('jwt'))
@Get('me')
getProfile(@CurrentUser() user: AuthUser) {
  return user;
}
```

**Key point interviewers check:** `validate()` in `JwtStrategy` runs *after* Passport has already verified the signature and expiry - it's not re-checking those. Its job is to shape/enrich what becomes `request.user` (and optionally do an extra check, e.g. "is this user still active / not banned").

### Separate refresh strategy

Verifying refresh tokens with their own strategy (different secret, and typically checking against a stored hash in the DB) keeps access and refresh verification cleanly separated - a leaked access-token secret shouldn't be usable to forge refresh tokens and vice versa.

### Interview question

**Q: What's the point of `validate()` if Passport already checked the signature?**
> "Passport's strategy handles cryptographic verification - signature and expiry. `validate()` is where I decide what identity actually gets attached to the request, and it's a natural place to add a cheap extra check, like confirming the user hasn't been deactivated since the token was issued, without hitting the DB on every single field of every request."

---
