# 12. Debugging toolkit

> Source: `interview-prep/react-native/01-fundamentals.md`

### Topics to learn
- [ ] LogBox / console
- [ ] React DevTools (component tree, props, hooks)
- [ ] React Native DevTools (modern direction)
- [ ] Flipper legacy awareness (many teams moved on)
- [ ] Native debugging: Android Studio / Logcat, Xcode / Console
- [ ] Crashlytics for production
- [ ] Reproducing release-only issues (`--variant release`, TestFlight, internal track)

### Matching tool ? problem

| Problem | Start here |
|---|---|
| Wrong UI / props / re-renders | React DevTools |
| JS exceptions in dev | LogBox / RN DevTools |
| Android native crash | Logcat + Crashlytics stack |
| iOS native crash | Xcode device logs + symbolicated Crashlytics |
| Perf FPS / JS lag | Perf monitor + list profiling + why-did-you-render (carefully) |
| Prod-only bug | Release build, staging env parity, feature flags, Crashlytics breadcrumbs |

### Interview question

**Q: How do you debug a production-only crash?**

> �First classify JS vs native from the stack. Reproduce on a release build with matching app version. Use Crashlytics breadcrumbs/logs, device/OS segmentation, and recent release diffs. If native, symbolicate and open the relevant Android/iOS project. If JS, trace the feature path, add guarded logging if needed, and verify whether it�s data-dependent, racey, or upgrade-related. Ship via staged rollout when possible.�

---
