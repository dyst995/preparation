# 08. JS-side usage pattern (clean architecture)

> Source: `interview-prep/react-native/16-native-modules.md`

```text
features/scanning/native/dataWedge.ts
  - typed wrappers
  - subscribe/unsubscribe helpers
  - maps native events -> domain models

features/scanning/hooks/useBarcodeScanner.ts
  - React lifecycle
  - permission gates
  - connects to UI
```

Do not scatter `NativeModules.Whatever` through screens.

---
