# 03. Android legacy Native Module anatomy

> Source: `interview-prep/react-native/16-native-modules.md`

### Topics to learn
- [ ] `ReactPackage` registers modules
- [ ] Module class extends `ReactContextBaseJavaModule` (classic)
- [ ] `getName()` must match JS module name
- [ ] `@ReactMethod` exports functions
- [ ] `Promise` parameter for async results
- [ ] `Callback` parameters (less preferred than Promise today)
- [ ] `DeviceEventManagerModule` / RCTDeviceEventEmitter for events
- [ ] `getConstants()` for static constants
- [ ] Kotlin vs Java (both appear in real codebases)
- [ ] UI thread requirements for UI APIs (`runOnUiQueueThread`)

### Conceptual shape (interview-level)

```text
MyAppPackage
  └─ creates MyModule(reactContext)

MyModule
  ├─ getName() => "MyModule"
  ├─ @ReactMethod doWork(options, promise)
  ├─ @ReactMethod addListener / removeListeners (if events; RN expectations)
  └─ helper methods calling Android APIs
```

### Android pitfalls seniors watch
- Calling UI APIs off the main thread
- Holding Activity references -> leaks
- Forgetting null-safe Activity (`getCurrentActivity()` can be null)
- Blocking the native module thread with heavy disk/network work
- Mismatch between `getName()` and JS import name
- Crashing on unexpected JS argument types (Bridge delivers limited types)

---
