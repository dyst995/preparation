# 15. Senior-Level Best Practices

> Source: `interview-prep/react-native/16-native-modules.md`

### Decision framework
1. Can a maintained library do it? Use it.
2. Can we isolate a thin native wrapper with a tiny API? Do that.
3. Prefer promises for commands, events for streams.
4. Keep domain mapping in JS; keep platform details native.
5. Plan New Arch compatibility the day you add a module.

### Production checklist
- [ ] Typed JS facade (no raw NativeModules in UI)
- [ ] Stable error codes
- [ ] Main-thread UI discipline documented
- [ ] Listener cleanup on unmount
- [ ] Proguard keep rules if needed
- [ ] Crashlytics breadcrumbs around native calls
- [ ] README for the module (inputs/outputs/events)

### Anti-patterns
- God module exposing entire platform SDK surface
- Emitting events at insane frequency without coalescing
- Blocking UI thread on network/disk
- Silent catch on native side (JS hangs forever)
- Duplicating business rules in Kotlin/Swift and TS

### Observability
- Native success/failure counters
- Time-to-resolve for promise methods
- Event rate metrics for scanners/sensors
- Crash-free sessions attributed to module versions

### Harder follow-ups

**Q: How do you version a native module API without breaking old app releases?**
> "Additive methods first, feature-detect on JS side, avoid renaming exported module names, and gate new behavior with app version checks or capability flags."

**Q: Native module works on Pixel but fails on a Zebra device. What now?**
> "Treat it as device capability matrix work. Log model/OS, verify DataWedge profile config, reproduce on hardware, isolate intent extras differences, and add defensive parsing. Emulators won't save you."

### Staff monologue
> "A good native module is a boring, tiny contract. The seniority is in what you refuse to expose, how you handle threading and lifecycle, and how you keep JS features from rotting into platform soup. My production integrations succeeded because the native edge was narrow and well-tested on real devices."

---
