# 07. Permissions ? Android vs iOS differences

> Source: `interview-prep/react-native/07-native-modules.md`

### Topics to learn
- [ ] Android runtime permissions model (declare in manifest + request at runtime for dangerous permissions)
- [ ] iOS `Info.plist` usage-description strings + system prompt on first API use
- [ ] Permission states: granted, denied, "don't ask again" (Android) / permanently denied requiring Settings deep link (iOS)
- [ ] Camera, location, biometrics, notifications, storage ? each has its own quirks per platform
- [ ] Handling permission denial gracefully in UX (not just crashing or silently failing)
- [ ] Libraries like `react-native-permissions` abstracting some of this, but understanding the underlying platform model is still expected

### Comparison table

| Aspect | Android | iOS |
|---|---|---|
| Declaration | `AndroidManifest.xml` permission entries | `Info.plist` usage description strings (e.g. `NSCameraUsageDescription`) |
| Request timing | Requested at runtime for "dangerous" permission groups (camera, location, etc.) | System prompt fires automatically on first actual API use if description string is present |
| Denial UX | Can ask again, or user selects "don't ask again" | If denied, app can't re-prompt ? must direct user to Settings |
| Granular control | Some permissions are grouped | Some permissions have "while using app" vs "always" nuances (location) |
| Missing config symptom | Crash or silent failure if manifest entry missing | Instant crash if `Info.plist` usage string missing when API is touched |

### Interview question

**Q: A camera feature works in dev but crashes instantly on iOS TestFlight. What's your first guess?**

**Strong answer:**
> "Missing or incorrect `Info.plist` usage description string, like `NSCameraUsageDescription`. iOS crashes immediately if you touch a permission-gated API without the corresponding usage string present ? this is one of the most common 'works in dev, crashes in a real build' issues, especially if the dev build was run with a cached/different plist or the entry was added after the last clean build. I'd check the `Info.plist`, do a clean rebuild, and verify on a real device before looking anywhere else."

---
