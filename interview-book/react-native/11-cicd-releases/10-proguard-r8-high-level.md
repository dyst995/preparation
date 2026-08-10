# 10. Proguard/R8 (high level)

> Source: `interview-prep/react-native/11-cicd-releases.md`

### Topics to learn
- [ ] Shrinking (removing unused code)
- [ ] Obfuscation (renaming classes/methods)
- [ ] Optimization (bytecode-level rewrites)
- [ ] Keep rules (`proguard-rules.pro`) for reflection-based libraries
- [ ] Mapping files for de-obfuscating crash stacks

### What R8 actually does

| Function | Effect |
|---|---|
| Shrinking | Removes unused classes/methods/resources to reduce APK/AAB size |
| Obfuscation | Renames classes/methods/fields to short meaningless names, raising reverse-engineering effort |
| Optimization | Inlines, removes dead branches, simplifies bytecode |

### Why it breaks things without keep rules

Libraries that use reflection (JSON serializers, some analytics/crash SDKs, native bridge glue code that looks up classes by name) can have the exact symbols R8 renames or strips. A `-keep` rule tells R8 "don't touch this class/method," which is why "release-only crash after enabling minification" is such a common bug class.

```proguard
-keep class com.facebook.react.** { *; }
-keep class com.mycompany.somesdk.** { *; }
-keepattributes SourceFile,LineNumberTable
```

### Interview question

**Q: What's the difference between shrinking and obfuscation in R8?**

> "Shrinking removes code and resources that static analysis proves are unreachable, which reduces app size. Obfuscation separately renames the remaining symbols to short names, which raises the bar for reverse engineering but doesn't reduce size much on its own. Both can break reflection-dependent libraries unless you add keep rules, which is why I always ship the mapping file to Crashlytics/Play so stack traces stay readable, and validate a real release build (not just debug) whenever I touch dependencies that use reflection."

---
