# 07. PII-safe logging

> Source: `interview-prep/react-native/12-upgrades-stability.md`

### Topics to learn
- [ ] What counts as PII in a fintech app (names, IDs, account/card numbers, balances, auth tokens)
- [ ] Redaction/scrubbing before logging
- [ ] Structured logging with allow-listed fields instead of dumping raw objects
- [ ] Crashlytics custom keys/breadcrumbs discipline (don't attach raw user data)
- [ ] Regulatory/compliance angle for fintech specifically

### Rules of thumb

| Do | Don't |
|---|---|
| Log user IDs (opaque, non-guessable) for correlation | Log full names, card numbers, balances, tokens |
| Log request IDs/correlation IDs | Log full request/response bodies containing sensitive fields |
| Use allow-listed structured fields | `console.log(JSON.stringify(response))` on a payments payload |
| Scrub known-sensitive keys centrally (one logging wrapper) | Trust every call site to remember to redact manually |
| Attach non-sensitive breadcrumbs (screen name, action type, flag state) to crash reports | Attach account numbers or auth tokens as Crashlytics custom keys |

### Interview question

**Q: How do you make sure debugging logs don't leak sensitive data in a fintech app?**

> "I centralize logging through one wrapper instead of trusting every call site to remember to redact, and that wrapper scrubs or blocks known-sensitive keys - tokens, card numbers, balances, personal identifiers - by default rather than by exception. For Crashlytics breadcrumbs and custom keys, I only attach non-sensitive context like screen name, action type, or feature flag state, correlated by an opaque user ID rather than any real identifying data. This isn't just good practice, it's a real compliance requirement in fintech, so I treat it as a hard rule, not a style preference."

---
