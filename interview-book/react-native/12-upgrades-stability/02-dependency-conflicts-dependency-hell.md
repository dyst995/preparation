# 02. Dependency conflicts & "dependency hell"

> Source: `interview-prep/react-native/12-upgrades-stability.md`

### Topics to learn
- [ ] Peer dependency mismatches (React version conflicts between RN and libraries)
- [ ] Native version mismatches (a JS library version expecting a newer/older native counterpart)
- [ ] Autolinking picking up multiple versions of a native dependency transitively
- [ ] Lockfile discipline (`yarn.lock`/`package-lock.json` committed and respected)
- [ ] Resolutions/overrides to force a single version of a transitive dependency
- [ ] CocoaPods `Podfile.lock` and Gradle dependency resolution conflicts

### Systematic conflict resolution approach

1. Reproduce cleanly: delete `node_modules`, lockfile-respecting reinstall, delete native caches (`Pods`, `Podfile.lock` only if intentional, Gradle cache).
2. Identify the actual conflicting versions via `yarn why <package>` / `npm ls <package>` rather than guessing.
3. Check whether it's a **peer dependency warning** (often survivable) vs an actual **runtime/native mismatch** (usually not survivable).
4. Force resolution with `resolutions` (Yarn) or `overrides` (npm) when you need a single version of a deeply nested transitive dependency, and document *why* with a comment - future you (or a teammate) needs the context.
5. For native-level conflicts (two libraries requiring different native SDK versions), check each library's changelog/compatibility table before forcing anything - some conflicts genuinely require picking a different library version pairing, not a forced override.

### Interview question

**Q: You add a new library and the app won't build. How do you debug it?**

> "First I check whether it's a JS-level peer dependency conflict or a native build failure - the error message and which platform fails usually tells me immediately. For JS conflicts, I use `yarn why` to see the actual dependency tree instead of guessing, and consider a `resolutions` override if it's a transitive version fight. For native failures, I check the library's required native SDK/Kotlin/Xcode version against what the project currently has, and check autolinking isn't pulling in two versions of the same native dependency transitively. I always reproduce from a clean install first, because a huge share of 'dependency hell' reports are actually stale cache issues, not real conflicts."

---
