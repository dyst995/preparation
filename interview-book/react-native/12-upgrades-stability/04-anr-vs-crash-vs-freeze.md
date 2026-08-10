# 04. ANR vs crash vs freeze

> Source: `interview-prep/react-native/12-upgrades-stability.md`

### Topics to learn
- [ ] ANR (Application Not Responding) - Android-specific, main thread blocked past a timeout
- [ ] Crash - process terminates due to an unhandled exception/signal
- [ ] Freeze/jank - UI unresponsive but not killed, no formal OS report
- [ ] Detection tools for each
- [ ] Common causes for each in an RN app specifically

### Definitions table

| Term | What happens | Platform | How it's detected |
|---|---|---|---|
| **Crash** | Process terminates due to unhandled exception (JS) or unhandled native exception/signal | Both | Crashlytics fatal report, app closes/restarts |
| **ANR** | Android declares the app unresponsive because the main thread didn't respond to input/a broadcast within a timeout (~5s for input) | Android only (formal OS concept) | Play Console ANR rate, Crashlytics/Play vitals ANR reports with a native-looking stack of the blocked thread |
| **Freeze / jank** | UI stops responding or drops frames but the process is alive and eventually recovers | Both | No formal system report; detected via user complaints, performance monitoring, frame drop metrics, or JS thread stall instrumentation |

### RN-specific causes

| Issue | Typical cause in RN |
|---|---|
| ANR | Long synchronous native module call on the main/UI thread, heavy synchronous bridge work, blocking I/O on main thread |
| Freeze/jank | JS thread blocked by a large synchronous loop, huge unmemoized re-render tree, unvirtualized long list |
| Crash (JS) | Unhandled promise rejection, accessing properties on `null`/`undefined`, bad type assumptions on API responses |
| Crash (native) | Native module passed unexpected types/nulls from JS, OS-level API misuse, memory pressure crash on lower-end devices |

### Interview question

**Q: What's the difference between an ANR, a crash, and a freeze, and how do you investigate each?**

> "A crash means the process actually terminates from an unhandled exception - I'd check Crashlytics and classify JS vs native from the stack. An ANR is Android-specific: the OS itself declares the app unresponsive because the main thread didn't process input within its timeout, usually from a blocking native call or heavy synchronous bridge work - I'd check Play Console's ANR rate and vitals, since it's a different bucket from Crashlytics fatal crashes. A freeze or jank is UI unresponsiveness the app eventually recovers from, with no formal OS report - normally a blocked JS thread from a heavy synchronous computation or an unoptimized long list, which I'd catch through performance profiling or user reports rather than a crash dashboard."

---
