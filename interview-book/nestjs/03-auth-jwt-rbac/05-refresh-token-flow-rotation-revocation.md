# 05. Refresh token flow, rotation & revocation

> Source: `interview-prep/nestjs/03-auth-jwt-rbac.md`

### Topics to learn
- [ ] Why refresh tokens must be tracked server-side (hashed, per-device)
- [ ] Refresh token rotation: issue a new refresh token on every use, invalidate the old one
- [ ] Detecting refresh token reuse (a classic sign of token theft)
- [ ] Logout = delete/invalidate the stored refresh token(s)
- [ ] "Logout everywhere" = invalidate all refresh tokens for a user
- [ ] Storing refresh tokens hashed (like passwords) so a DB leak doesn't hand out valid tokens
- [ ] Race conditions on refresh (two concurrent refresh calls - ties to mobile networking chapter)

### Storage: never store raw refresh tokens

```typescript
async storeRefreshToken(userId: number, token: string, deviceId: string) {
  const hash = await bcrypt.hash(token, 10);
  await this.refreshTokenRepo.save({ userId, deviceId, tokenHash: hash, expiresAt: addDays(new Date(), 30) });
}

async validateRefreshToken(userId: number, deviceId: string, token: string): Promise<boolean> {
  const record = await this.refreshTokenRepo.findOneBy({ userId, deviceId });
  if (!record || record.expiresAt < new Date()) return false;
  return bcrypt.compare(token, record.tokenHash);
}
```

### Rotation on every refresh

```typescript
async refresh(userId: number, deviceId: string, oldToken: string) {
  const valid = await this.validateRefreshToken(userId, deviceId, oldToken);
  if (!valid) {
    // Reuse of an already-rotated/invalid token: possible theft - revoke everything for this user
    await this.revokeAllRefreshTokens(userId);
    throw new UnauthorizedException('Refresh token invalid - please log in again');
  }
  const newAccessToken = this.issueAccessToken(userId);
  const newRefreshToken = this.issueRefreshToken();
  await this.storeRefreshToken(userId, newRefreshToken, deviceId); // overwrites/rotates
  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}
```

Rotation means every refresh call invalidates the previous refresh token and issues a new one. If an attacker steals a refresh token and uses it, and *then* the legitimate client also tries to use the (now-rotated-away) old token, that mismatch is a strong signal of theft - revoking all tokens for that user at that point is the standard defensive response.

### Logout

```typescript
async logout(userId: number, deviceId: string) {
  await this.refreshTokenRepo.delete({ userId, deviceId }); // this device only
}

async logoutEverywhere(userId: number) {
  await this.refreshTokenRepo.delete({ userId }); // all devices
}
```

### Interview questions

**Q: Why hash refresh tokens in the database instead of storing them as-is?**
> "Same reasoning as passwords - if the database ever leaks, raw refresh tokens would let an attacker impersonate every user indefinitely (or until expiry). Hashing them means a DB leak alone isn't enough; the attacker would still need the original token value, which never touches the DB in plaintext."

**Q: What does refresh token rotation protect against, specifically?**
> "It limits the value of a stolen refresh token to a single use before detection. If a token is stolen and used, and the legitimate client later tries the same (now stale) token, I can detect that mismatch as reuse of an invalidated token and immediately revoke the whole session/device, rather than letting a single leaked long-lived token remain valid for its entire lifetime."

**Q: How do you handle two simultaneous refresh requests racing each other from a mobile client?**
> "That's a classic race - two requests both present the same still-valid refresh token before either rotation completes. I'd either make refresh idempotent for a short grace window (accept the immediately-prior token once, to tolerate one retry), or serialize refreshes per-device with a short-lived lock, so I don't legitimately lock out a client that just had a retried request from a flaky network - which is exactly the kind of thing that bit me in mobile apps like EasyPay, where I had to be careful two near-simultaneous 401-triggered refresh calls didn't both fire and end up racing."

---
