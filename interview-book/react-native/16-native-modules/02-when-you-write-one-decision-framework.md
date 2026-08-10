# 02. When you write one (decision framework)

> Source: `interview-prep/react-native/16-native-modules.md`

| Need | Write Native Module? | Notes |
|---|---|---|
| REST, async storage, basic UI | No | JS/RN enough |
| Biometrics / camera / secure storage | Usually wrap existing lib | Write custom only for gaps |
| Vendor hardware SDK (Zebra DataWedge) | Yes | Often no perfect RN wrapper |
| Custom iOS QuickLook-style preview | Yes | Wizer-style gap fill |
| Patch buggy native dependency behavior | Yes / patch | MyCreditInfo-style |
| Hot path needing sync native read | Legacy modules weak here | Prefer Turbo/JSI |

### Interview answer

> "I only write native modules when JS cannot access the capability cleanly - vendor SDKs, missing library features, or native bugfixes. On Clean House that was DataWedge. On Wizer I built a native iOS file preview capability beyond third-party options. On MyCreditInfo I patched native Android libraries for security/compatibility. Otherwise I prefer maintained libraries and keep native surface area small."

---
