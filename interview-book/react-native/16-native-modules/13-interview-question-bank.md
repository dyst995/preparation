# 13. Interview question bank

> Source: `interview-prep/react-native/16-native-modules.md`

1. What is a Native Module in React Native?
2. How do you register a module on Android? On iOS?
3. Promise vs event emitter - when each?
4. Why can `getCurrentActivity()` be null?
5. How do you pass errors back to JS?
6. How do you prevent memory leaks in native modules?
7. How do you expose constants?
8. How do you test modules without hardware?
9. What breaks under Proguard/R8?
10. How do legacy Native Modules relate to the Bridge?
11. Walk through your DataWedge module design.
12. Walk through your iOS file preview module (Wizer).

### Model answer - Wizer iOS preview

> "Third-party preview components didn't meet product needs, so I built a native iOS module wrapping platform preview capabilities, exported a clean JS API, and kept rendering/file concerns on the native side. JS orchestrated when to open preview and handled fallbacks."

### Model answer - MyCreditInfo patch

> "A native Android dependency had a security/compatibility issue we couldn't wait on upstream for. I patched the native layer, bridged the fixed behavior to JS, and added regression checks around the affected flow. Native patches are last resorts - but production stability required it."

---
