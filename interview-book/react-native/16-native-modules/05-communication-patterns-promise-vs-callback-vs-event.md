# 05. Communication patterns: Promise vs Callback vs Event

> Source: `interview-prep/react-native/16-native-modules.md`

### Topics to learn
- [ ] Promise: one-shot async request/response (preferred for commands)
- [ ] Callback: older style, error-first or multi-callback pitfalls
- [ ] Event: stream of notifications (hardware scans, progress, broadcast intents)
- [ ] Don't use events where a promise belongs (and vice versa)

### Decision table

| Situation | Prefer |
|---|---|
| "Do this and tell me success/failure once" | Promise |
| Continuous barcode scans from DataWedge | Event emitter |
| Progress of a long native task | Events + final Promise (or events only) |
| Legacy API already callback-based | Wrap into Promise at JS edge |

### DataWedge example framing (Clean House)

> "DataWedge delivers scan data through Android intents/broadcasts. That is naturally an event stream. I wrap the native receiver in a module that emits scan events to JS, and keep configuration/commands as promise-based methods."

---
