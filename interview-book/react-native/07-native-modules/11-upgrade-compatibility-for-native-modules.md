# 11. Upgrade compatibility for native modules

> Source: `interview-prep/react-native/07-native-modules.md`

### Topics to learn
- [ ] React Native version upgrades can break native module APIs (deprecated bridge methods, New Architecture requirements)
- [ ] Third-party libraries lagging behind on New Architecture support
- [ ] Native OS-level changes (Android target SDK bumps, iOS API deprecations) independent of RN itself
- [ ] Strategy: check library New Architecture/RN-version support matrices before upgrading; test native modules explicitly after any RN upgrade, not just JS behavior
- [ ] Interop layer allowing legacy modules to keep working temporarily during New Architecture migration

### Interview question

**Q: What breaks most often when you upgrade React Native in a real production app?**

**Strong answer:**
> "In my experience it's rarely the pure-JS code ? it's the native layer: third-party libraries with native modules that haven't been updated for the new RN version or New Architecture, Android target SDK requirement bumps forcing permission or manifest changes, and iOS API deprecations tied to a new Xcode/SDK requirement. My upgrade process is to check each native-module-dependent library's compatibility with the target RN version first, upgrade in a branch, and specifically re-test every native integration point ? camera, biometrics, push notifications, any custom native modules ? rather than assuming 'the app builds' means everything native still works correctly."

---
