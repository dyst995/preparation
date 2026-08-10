# 09. Packaging, linking, and autolinking

> Source: `interview-prep/react-native/16-native-modules.md`

### Topics to learn
- [ ] App-local modules vs separate native package
- [ ] Autolinking in modern RN for libraries
- [ ] Manual package registration in older apps / custom cases
- [ ] Gradle / Podfile native dependency declaration for vendor SDKs

### Interview answer

> "If the module is app-specific, I keep it in the Android/iOS project and register it in the app package. If it's reusable, I extract a package with autolinking. Vendor SDKs still need Gradle/CocoaPods dependencies declared correctly."

---
