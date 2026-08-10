# 04. iOS legacy Native Module anatomy

> Source: `interview-prep/react-native/16-native-modules.md`

### Topics to learn
- [ ] `RCT_EXPORT_MODULE()` / module name
- [ ] `RCT_EXPORT_METHOD` / `RCT_REMAP_METHOD`
- [ ] Promises via RCTPromiseResolveBlock / RejectBlock
- [ ] Events via `RCTEventEmitter` subclass
- [ ] Constants via `constantsToExport` + `requiresMainQueueSetup`
- [ ] Swift vs Objective-C bridging header realities
- [ ] Main queue vs background queue method scheduling

### Conceptual shape

```text
MyModule : NSObject <RCTBridgeModule>
  ├─ RCT_EXPORT_MODULE(MyModule)
  ├─ RCT_EXPORT_METHOD(doWork:(NSDictionary *)options
  │     resolver:(RCTPromiseResolveBlock)resolve
  │     rejecter:(RCTPromiseRejectBlock)reject)
  └─ native UIKit/QuickLook/etc calls
```

Or event emitter:

```text
MyEmitter : RCTEventEmitter
  ├─ supportedEvents
  └─ sendEventWithName...
```

### iOS pitfalls seniors watch
- Forgetting to implement `supportedEvents` correctly
- Wrong queue: UIKit must be main thread
- Swift optionals / NSNull mismatches from JS
- Missing privacy usage strings in Info.plist for camera/photos/biometrics
- Rejecting promises without stable error codes

---
