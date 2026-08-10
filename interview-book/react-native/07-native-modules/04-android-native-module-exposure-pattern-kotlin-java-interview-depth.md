# 04. Android native module exposure pattern (Kotlin/Java) ? interview depth

> Source: `interview-prep/react-native/07-native-modules.md`

### Topics to learn
- [ ] `ReactContextBaseJavaModule` (legacy) ? `getName()`, `@ReactMethod` annotated methods
- [ ] `ReactPackage` registration so RN discovers your module
- [ ] Turbo Module equivalent: implementing the Codegen-generated spec interface
- [ ] Threading: which thread native methods run on by default, and moving heavy work off it
- [ ] Emitting events to JS via `DeviceEventManagerModule.RCTDeviceEventEmitter` (legacy) or the Turbo Module event equivalent
- [ ] Returning results via callback vs Promise
- [ ] Working knowledge level expected: Kotlin (per your CV) ? comfortable reading/writing module code, not necessarily deep Android platform internals

### Conceptual shape (legacy-style, for discussion ? you don't need to recite exact code)

```kotlin
class BarcodeScannerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "BarcodeScannerModule"

    @ReactMethod
    fun startScan(promise: Promise) {
        try {
            // interact with Zebra DataWedge intents / SDK here
            promise.resolve(scanResult)
        } catch (e: Exception) {
            promise.reject("SCAN_ERROR", e)
        }
    }

    fun emitScanEvent(payload: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onBarcodeScanned", payload)
    }
}
```

### Key talking points

- Native methods can be async (`Promise`/`Callback`) or fire events for things that happen outside a direct JS call (like a hardware scan trigger).
- Heavy work should not block the thread RN dispatches the call on ? offload to a background thread/coroutine and resolve the promise when done.
- Registering the module requires a `ReactPackage` that RN's package list picks up ? a very common "why isn't my native module showing up in JS" debugging question traces back to a missed registration.

### Interview question

**Q: You added a Kotlin native module but `NativeModules.MyModule` is `undefined` in JS. What do you check?**

**Strong answer:**
> "First, that the module's `ReactPackage` is actually registered in the app's package list ? the most common cause. Second, that `getName()` matches exactly what I'm calling from JS. Third, for Turbo Modules, that Codegen actually ran and picked up the spec, and that the native build actually rebuilt (a stale native build after adding a module is a very common false alarm ? I'd do a clean native rebuild before assuming code is wrong). Fourth, on New Architecture, whether the module needs to be registered differently than legacy."

---
