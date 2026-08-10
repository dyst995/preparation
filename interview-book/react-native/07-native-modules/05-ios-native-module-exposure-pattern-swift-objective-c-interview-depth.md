# 05. iOS native module exposure pattern (Swift/Objective-C) ? interview depth

> Source: `interview-prep/react-native/07-native-modules.md`

### Topics to learn
- [ ] Objective-C bridging header / `RCT_EXPORT_MODULE()` and `RCT_EXPORT_METHOD()` (legacy pattern)
- [ ] Swift native modules requiring an Objective-C bridge file to expose them to RN (legacy architecture nuance)
- [ ] Turbo Module equivalent: conforming to the Codegen-generated protocol/spec
- [ ] Threading: main thread vs background ? UI-touching code (e.g. presenting a `QuickLook` preview controller) must run on main thread
- [ ] Emitting events via `RCTEventEmitter` subclass (legacy) or Turbo Module event equivalent
- [ ] Working knowledge level expected: Swift/Objective-C (per your CV) ? comfortable implementing and integrating, not necessarily deep iOS internals expert

### Conceptual shape (legacy-style, for discussion)

```swift
@objc(FilePreviewModule)
class FilePreviewModule: NSObject {

  @objc
  func previewFile(_ path: String,
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      // present a QuickLook-based preview controller here
      resolve(true)
    }
  }
}
```

```objc
// Bridging file so RN can see the Swift class
@interface RCT_EXTERN_MODULE(FilePreviewModule, NSObject)
RCT_EXTERN_METHOD(previewFile:(NSString *)path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
```

### Key talking points

- Any UI presentation (file preview controllers, camera view controllers, custom alerts) must be dispatched to the main thread ? a classic iOS-specific bug for RN developers coming from a JS-only background.
- Swift modules historically need an Objective-C shim to be visible to the legacy RN bridge; Turbo Modules/Codegen streamline this with generated protocols.
- Promises map naturally to Swift's resolve/reject blocks; events map to `RCTEventEmitter` subclasses with `supportedEvents()`.

### Interview question

**Q: Tell me about the native iOS file preview library you built for Wizer. Why not use an existing library?**

**Strong answer (adapt to your real specifics):**
> "Wizer needed to preview various document types (PDFs, images, possibly other formats) attached to insurance records, and the existing third-party RN libraries either didn't cover all the formats we needed or had UX/performance limitations. I built a native iOS module wrapping platform preview APIs (QuickLook-style) directly, exposed through a promise-based method to open a file by path/URL, with the actual view controller presentation dispatched to the main thread. This gave us full control over supported formats and presentation behavior instead of being constrained by a general-purpose third-party package, and it was one of the pieces of ownership work that came with taking over and modernizing that app's architecture."

---
