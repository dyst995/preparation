# 06. Password security (high level)

> Source: `interview-prep/nestjs/03-auth-jwt-rbac.md`

### Topics to learn
- [ ] Never store plaintext passwords
- [ ] Hashing algorithms built for passwords: bcrypt, argon2 (NOT plain SHA-256/MD5 - too fast, brute-forceable)
- [ ] Salting is built into bcrypt/argon2 automatically
- [ ] Cost factor / work factor tuning (bcrypt rounds) - trade-off between security and latency
- [ ] Password reset flow: single-use, short-lived, signed/random token sent via email, never the password itself
- [ ] Rate limiting login attempts (brute-force protection) - `@nestjs/throttler` or a dedicated lockout counter
- [ ] Generic error messages on login failure ("invalid credentials", not "user not found" vs "wrong password" - avoid user enumeration)

### Password hashing

```typescript
async hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12); // cost factor 12 - tune based on measured latency budget
}

async verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

**Why not SHA-256 for passwords:** it's *designed* to be fast, which is exactly wrong for password hashing - fast hashing means an attacker with a leaked hash table can brute-force billions of guesses per second on commodity GPUs. bcrypt/argon2 are deliberately slow and tunable (cost factor) to make brute-forcing impractical, and they handle salting for you automatically so identical passwords don't produce identical hashes.

### Rate limiting logins

```typescript
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 5, ttl: 60_000 } })
@Post('login')
login(@Body() dto: LoginDto) { /* ... */ }
```

For a more targeted brute-force defense, track failed attempts per account/IP and apply an escalating lockout or CAPTCHA rather than relying purely on a global rate limiter.

### Avoiding user enumeration

Return the same generic message and timing profile whether the email doesn't exist or the password is wrong:

```typescript
if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
  throw new UnauthorizedException('Invalid credentials');
}
```

### Interview questions

**Q: Why bcrypt/argon2 instead of just hashing with SHA-256?**
> "SHA-256 is fast by design, which is great for checksums but terrible for password storage - it makes brute-force/dictionary attacks on a leaked hash cheap at scale. bcrypt and argon2 are deliberately slow, tunable via a cost factor, and handle per-password salting automatically, so even identical passwords produce different hashes and cracking is computationally expensive per guess."

**Q: How do you design a password reset flow securely?**
> "Generate a random, single-use, short-lived token (not derived from the password), store only its hash server-side tied to the user and an expiry, email a link containing the raw token, and on submission verify the hash and expiry before allowing a new password to be set. The token is invalidated immediately after use or after expiry, and I don't reveal whether a given email exists in the system through response differences."

---
