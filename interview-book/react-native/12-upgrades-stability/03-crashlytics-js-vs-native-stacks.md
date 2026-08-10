# 03. Crashlytics: JS vs native stacks

> Source: `interview-prep/react-native/12-upgrades-stability.md`

### Topics to learn
- [ ] Where JS exceptions show up in Crashlytics (via the Crashlytics RN SDK's JS error handler)
- [ ] Native Android crash stacks (Java/Kotlin, plus NDK/native crashes)
- [ ] Native iOS crash stacks (Swift/Obj-C, plus native crash symbolication)
- [ ] Symbolication requirements: Proguard/R8 mapping files (Android), dSYMs (iOS)
- [ ] Source maps for readable JS stacks in Crashlytics
- [ ] Distinguishing "caught and reported" errors vs actual fatal crashes
- [ ] Breadcrumbs/custom logs/keys attached before a crash for context

### Classification table

| Signal | JS crash | Native crash |
|---|---|---|
| Stack trace content | File/function names from your JS/TS source (or minified names without source maps) | Java/Kotlin class names (Android) or Swift/Obj-C/framework names (iOS) |
| Symbolication needed | JS source maps uploaded, or readable if unminified | Proguard/R8 mapping file (Android) or dSYM (iOS) |
| Common causes | Unhandled promise rejection, null/undefined access, bad JSON parsing, unguarded array access | Native module misuse, memory issues, OS-level API misuse, ANR-adjacent issues, native library bugs |
| Where it's caught | RN's JS error handler / ErrorBoundary / Crashlytics JS SDK hook | OS-level crash reporter hooked by the native Crashlytics SDK |
| Typical fix location | Your JS/TS code, or a JS wrapper around a native call passing bad data | Native module code, native SDK version, or platform-specific native config |

### Why symbolication matters so much

An unsymbolicated stack trace is often just memory addresses or minified/obfuscated names - effectively useless. Every release must upload:
- **Android**: the R8/Proguard `mapping.txt` for that exact build (Fastlane can automate this upload to Crashlytics).
- **iOS**: dSYMs for that exact build (also automatable via Fastlane's `upload_symbols_to_crashlytics` or the Crashlytics Gradle/Cocoapods build phase).

Without matching mapping files/dSYMs for the *exact version* that crashed, you cannot reliably read the stack - this is a common trap when debugging "an old crash" after multiple releases without keeping historical mapping files.

### Interview question

**Q: How do you tell if a Crashlytics report is a JS bug or a native bug, and what do you need to actually read it?**

> "The stack shape tells you immediately - JS stacks show your source file/function names (or minified bundle positions without source maps), native stacks show Java/Kotlin or Swift/Obj-C frames and OS/framework symbols. To actually read either one reliably you need the right artifact for that exact build: a source map for JS, a Proguard/R8 mapping file for Android native, or a dSYM for iOS native. I automated uploading all of these as part of the Fastlane release lane, because a crash report you can't symbolicate is close to useless, and doing it manually after the fact means finding the exact build's artifacts later, which is often a mess."

---
