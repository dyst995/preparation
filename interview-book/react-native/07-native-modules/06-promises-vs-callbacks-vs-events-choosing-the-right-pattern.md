# 06. Promises vs Callbacks vs Events ? choosing the right pattern

> Source: `interview-prep/react-native/07-native-modules.md`

### Topics to learn
- [ ] Promises: one-shot async result, resolve/reject, natural fit for `async/await` on the JS side
- [ ] Callbacks: legacy pattern, still seen, less ergonomic than promises for one-shot results
- [ ] Events: for native-initiated, potentially repeated/unsolicited notifications (hardware triggers, push notification arrival, scan events)

### Decision table

| Pattern | Use when | Example |
|---|---|---|
| Promise | JS calls native, expects exactly one result (success or failure) | "Read this file and give me its contents", "Authenticate with biometrics" |
| Callback | Legacy code, or APIs predating promise convention | Older third-party native modules |
| Event (emitter) | Native side originates the notification, possibly multiple times, not tied to a specific JS call | Barcode scan trigger from a hardware button, push notification received in foreground, DataWedge broadcast intent result |

### Interview question

**Q: You need to integrate a hardware barcode scanner (like Zebra's DataWedge). Would you use a Promise or an event?**

**Strong answer:**
> "An event. The scan is triggered by the user pressing a hardware trigger or the scanner firing independently of any specific JS call ? it's not something JS is 'awaiting' a single response to. On Android, DataWedge broadcasts scan results as intents; the native module listens for that broadcast and emits a JS event (`onBarcodeScanned` or similar) that the app subscribes to, potentially receiving many events over the component's lifetime. I'd only use a Promise for something like an explicit 'start a scan session' one-shot setup call, not for the actual scan results themselves."

---
