# 08. Secrets never in the bundle

> Source: `interview-prep/react-native/13-security.md`

### Topics to learn
- [ ] Why the JS bundle is fully inspectable (it's just JS shipped to the device)
- [ ] Native binary "secrets" are also extractable, just with more effort
- [ ] The correct model: secrets live server-side, client gets short-lived, scoped credentials
- [ ] Environment config vs secrets (a base URL is not a secret; an API signing key is)
- [ ] Backend-mediated third-party API calls instead of embedding third-party secret keys client-side

### The core mechanism to explain

Your JS bundle - even minified/obfuscated - ships to every user's device and can be unpacked and read. Any string embedded in it, "secret" or not, is recoverable by a motivated party. The same is largely true, with more effort, for strings embedded in the compiled native binary. **There is no truly secure place to hide a static secret on the client.**

### The correct architecture

| Client has | Client does NOT have |
|---|---|
| Short-lived, scoped access tokens obtained after authenticating with your backend | Long-lived API keys for third-party services |
| Public, non-sensitive config (API base URLs, feature flag identifiers) | Signing keys, private keys, database credentials |
| Ability to call your own backend, which then calls third parties server-side | Direct third-party secret keys embedded to call a paid API directly from the device |

### Interview question

**Q: A teammate wants to embed a third-party API secret key directly in the app to save a backend round trip. What do you tell them?**

> "That the JS bundle - and to a lesser extent the compiled native binary - is fully inspectable by anyone with the shipped app, obfuscation or not, so any embedded secret is effectively public once released. The correct pattern is to proxy that call through our own backend: the client authenticates with us using short-lived, scoped tokens, and the backend holds the real third-party secret and makes that call server-side. It's a bit more latency and infrastructure, but it's the only version of this that's actually secure rather than just harder to find."

---
