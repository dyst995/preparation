# 01. Debug vs release builds

> Source: `interview-prep/react-native/11-cicd-releases.md`

### Topics to learn
- [ ] What changes in JS bundling (dev server vs bundled/minified JS)
- [ ] What changes in native build config (BuildConfig/Info.plist, `__DEV__`)
- [ ] Signing differences (debug keystore/dev certs vs release signing)
- [ ] Performance differences (dev warnings, Redux devtools, extra checks removed in release)
- [ ] Why "works in debug, crashes in release" is a real category of bug

### What actually changes

| Dimension | Debug | Release |
|---|---|---|
| JS source | Served live from Metro or unminified dev bundle | Bundled, minified, tree-shaken, often Hermes-precompiled bytecode |
| `__DEV__` | `true` | `false` - disables warnings, dev-only checks, extra logging |
| Signing (Android) | Auto-generated debug keystore | Your real release keystore (upload key or app signing key) |
| Signing (iOS) | Development certificate/profile | Distribution certificate + App Store/Ad Hoc/Enterprise provisioning profile |
| Native optimizations | Off (Proguard/R8 disabled, no bitcode/strip tuning) | Proguard/R8 minify+shrink on Android; symbol stripping/optimizations on iOS |
| Network | Often points to dev/staging API | Points to production API (must be configured, not hardcoded) |
| Error overlays | Red box / LogBox visible | No JS error overlay - crashes must be caught by Crashlytics/ErrorBoundary |
| Console logs | Visible via Metro/Logcat/Xcode console | Should be stripped or gated - noisy or leaking logs in release are a real bug class |

### Why "works in debug, crashes in release" happens

- Proguard/R8 strips or renames a class/method a reflection-based library needs (missing keep rule).
- A dev-only mock or flag silently hid a null/undefined path.
- Hermes bytecode behaves subtly differently from JSC for an edge case (rare but real).
- Environment config pointed at the wrong (or unreachable) API in release.
- A native module only works because Xcode/Android Studio injected extra debug entitlements.

### Interview question

**Q: You have a bug that only reproduces in a release build. How do you approach it?**

**Strong answer:**
> "I stop trying to reproduce it in debug and instead build a release APK/IPA locally or use the same lane the CI uses, so I'm testing what actually ships. I check Proguard/R8 mapping files and keep rules first if it's Android and touches reflection-based libraries (analytics SDKs, some native bridges). I check environment config to confirm production endpoints are used. I check Crashlytics for the exact release-only stack. If it's not crashing but just behaving differently, I isolate whether it's a `__DEV__`-gated code path or a minification side effect (e.g. relying on function/class names at runtime)."

---
