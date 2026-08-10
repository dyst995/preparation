# 01. When do you actually need native code?

> Source: `interview-prep/react-native/07-native-modules.md`

### Topics to learn
- [ ] Capabilities not exposed by RN core or any maintained JS/RN library
- [ ] Performance-critical work unsuitable for JS (heavy computation, real-time hardware I/O)
- [ ] Deep OS integration (background services, widgets, specific hardware SDKs like barcode scanners)
- [ ] Vendor SDKs that only ship native (Android/iOS) integration guides (payment SDKs, hardware SDKs)
- [ ] The cost side: native code means two codebases to maintain, more QA surface, and New Architecture compatibility work

### Decision framework

| Situation | Native needed? | Why |
|---|---|---|
| Need a REST call, some local storage, standard UI | No | RN core + JS ecosystem covers it |
| Need biometric prompt (Face ID/Touch ID/Android biometric) | Usually a well-maintained library wraps native for you | Still "native," but you don't necessarily write it yourself unless you need custom behavior |
| Need a hardware vendor SDK (e.g. Zebra DataWedge barcode scanner) | Yes | Vendor ships native Android SDK/broadcast intents only; no first-class RN wrapper exists for your exact use case |
| Need a capability third-party RN libraries don't support well (custom file preview rendering) | Yes | You build a small native module wrapping platform APIs (`QuickLook`/`PDFKit`-equivalent on iOS) |
| Need to patch a bug or add a missing feature in a native Android dependency | Yes (patch and fork/override) | The library's JS surface doesn't expose what you need, or has a native bug blocking your use case |
| Need background location/push token handling tied to platform lifecycle events | Often yes | These are OS-level lifecycle concerns, not portable JS concepts |

### Interview question

**Q: How do you decide whether to write a native module vs finding a JS library?**

**Strong answer:**
> "I start by checking if there's a well-maintained community library that already wraps the native capability ? most common needs (camera, biometrics, push notifications, file system) have solid options. I go native myself when: the capability is hardware/vendor-specific with no RN wrapper ? like Zebra's DataWedge barcode scanning on Clean House, which only ships Android SDK/intent-based integration; when I need to extend or fix behavior a third-party library doesn't support, like the file preview library I built for Wizer beyond what existing packages offered; or when I need to patch a bug directly in a native dependency, like I did with a native Android library on MyCreditInfo. I weigh that against the maintenance cost ? native code needs updating for OS/New Architecture changes and doubles the platforms I need to test."

---
