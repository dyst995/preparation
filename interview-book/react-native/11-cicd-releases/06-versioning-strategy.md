# 06. Versioning strategy

> Source: `interview-prep/react-native/11-cicd-releases.md`

### Topics to learn
- [ ] Android `versionCode` (integer, must increase) vs `versionName` (marketing string)
- [ ] iOS `CFBundleVersion` (build number) vs `CFBundleShortVersionString` (marketing version)
- [ ] Keeping both platforms' marketing versions in sync
- [ ] Automating bumps in CI vs manual bumps
- [ ] Git tags as the source of truth

### Table: version fields

| Platform | Field | Meaning | Constraint |
|---|---|---|---|
| Android | `versionCode` | Internal integer for Play Store ordering | Must strictly increase per upload |
| Android | `versionName` | Human-readable, e.g. `2.4.1` | Free-form, shown to users |
| iOS | `CFBundleVersion` | Build number | Must increase per build within a version, per Apple |
| iOS | `CFBundleShortVersionString` | Marketing version, e.g. `2.4.1` | Shown in App Store |

### Recommended scheme

- Marketing version (`2.4.1`) follows semantic versioning and is bumped intentionally per release, kept identical on Android `versionName` and iOS `CFBundleShortVersionString`.
- Build number/`versionCode` is auto-incremented by CI on every build that reaches an upload step (never hand-edited), sourced from "current store build + 1" via Fastlane (`latest_testflight_build_number`, `google_play_track_version_codes`) to avoid collisions across machines/retries.
- A git tag (`v2.4.1`) is the trigger and audit trail for what actually shipped to production.

### Interview question

**Q: How do you avoid versionCode collisions when multiple CI runs happen close together?**

> "I don't maintain a local counter - I ask the store for its current highest build number/versionCode via the Fastlane actions that query Play/App Store Connect, and increment from that live value at build time. That way even if two pipelines run close together, or a build is retried, the number reflects reality instead of drifting out of sync with what's already been uploaded."

---
