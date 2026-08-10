# 03. iOS signing: certificates & provisioning profiles

> Source: `interview-prep/react-native/11-cicd-releases.md`

### Topics to learn
- [ ] Certificate (development vs distribution)
- [ ] App ID / Bundle ID
- [ ] Provisioning profile types: Development, Ad Hoc, App Store, Enterprise
- [ ] Automatic vs manual signing in Xcode
- [ ] `fastlane match` for team-shared signing
- [ ] Expiry management (certs and profiles expire and silently break CI)

### Mental model

iOS signing has three moving parts that must all agree:

1. **Certificate** - proves *who* built the app (tied to your Apple Developer account/team).
2. **App ID** - the bundle identifier and its enabled capabilities (push, keychain sharing, associated domains, etc.).
3. **Provisioning profile** - binds a certificate + App ID + (for non-App Store profiles) a device list, and defines how the app can be distributed.

| Profile type | Use case | Device restriction |
|---|---|---|
| Development | Local Xcode debugging | Registered dev devices only |
| Ad Hoc | Internal/QA distribution outside TestFlight | Registered devices only (UDID list) |
| App Store | Public release, TestFlight | None (any user) |
| Enterprise | Internal company distribution (no App Store) | None, but org-restricted |

### Why CI signing is painful without a strategy

- Certificates and profiles expire (typically ~1 year for certs; profiles have their own expiry).
- Each teammate generating their own certs causes "too many certificates" errors from Apple.
- Manual profile management doesn't scale to CI runners that need fresh checkouts.

### `fastlane match`

`match` stores encrypted signing certs/profiles in a private git repo (or cloud storage) and syncs them to any machine (including CI runners) via one command. This was the standard way to keep an entire team + CI in sync on the *same* signing identity instead of everyone minting their own.

```ruby
match(
  type: "appstore",
  readonly: is_ci,
  app_identifier: "com.company.myapp"
)
```

- `readonly: is_ci` ensures CI never mints new certs, only fetches existing ones - avoids CI accidentally invalidating the team's signing identity.

### Interview question

**Q: Walk me through iOS code signing for a CI pipeline.**

> "Certificates prove identity, App IDs define the app and its capabilities, and provisioning profiles tie a certificate, App ID, and distribution method together. Managing this manually across a team and CI runners is fragile - certs expire, and multiple people minting certs leads to Apple's certificate limit errors. I used `fastlane match` to keep signing certs and profiles in an encrypted repo that both developers and the GitLab Runner pull from, with CI always running in read-only mode so it never mutates the shared signing identity. That keeps one source of truth and avoids 'works on my machine, fails in CI' signing issues."

**Follow-up: what breaks when a cert expires mid-sprint?**
> Build fails at the codesign step in CI with a clear provisioning error; the fix is regenerating via `match` (or Xcode if manual) and re-running the pipeline - not touching app code.

---
