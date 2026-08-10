# 09. Camera & barcode scanning integrations

> Source: `interview-prep/react-native/07-native-modules.md`

### Topics to learn
- [ ] Standard camera capture (photo/video) via community libraries vs custom native camera views
- [ ] Barcode/QR scanning via camera-based libraries vs dedicated hardware scanners
- [ ] Zebra DataWedge specifically: intent-based broadcast integration on Android rugged devices (Clean House warehouse context)
- [ ] Performance consideration: scan event frequency and debouncing to avoid flooding JS with duplicate scans
- [ ] Permission + lifecycle handling (camera must release resources properly on screen unmount/backgrounding)

### Zebra DataWedge deep dive (your Clean House project)

DataWedge is Zebra's data capture service that runs on their rugged Android devices (used heavily in warehouse/logistics). Instead of the app driving the camera/scanner hardware directly, DataWedge is configured (via profiles) to capture a scan (hardware trigger or camera-based) and broadcast the result as an Android intent that your app's native module registers a `BroadcastReceiver` for.

**Why this needed native Android work, not a generic RN barcode library:**
- Generic camera-based barcode-scanning RN libraries don't talk to a dedicated hardware scanner engine at all ? they'd have you re-implement scanning via the phone/tablet's camera, ignoring the device's purpose-built, faster, more reliable hardware scanner.
- DataWedge integration is Android-specific, intent-based, and requires configuring a DataWedge profile (package name, intent action/category/key) matched by a native `BroadcastReceiver` that then forwards the decoded barcode data to JS via an event emitter.

### Interview question

**Q: Tell me about the barcode scanning integration you built for Clean House.**

**Strong answer:**
> "Clean House ran on rugged Android devices used by warehouse staff with dedicated hardware barcode scanners, so instead of a generic camera-based JS barcode library, I integrated with Zebra's DataWedge service. That meant configuring a DataWedge profile to associate scan intents with our app package, and writing a native Android module with a `BroadcastReceiver` that listens for those scan intents, extracts the decoded barcode payload, and emits it to JS as an event the delivery/warehouse workflow screens subscribe to. I also had to debounce/de-duplicate rapid repeated scans so a single physical trigger pull didn't fire the same barcode-handling logic multiple times, and make sure the receiver was properly registered/unregistered with screen lifecycle to avoid leaks or stale listeners firing on the wrong screen."

---
