# 04. Threads and the Bridge

> Source: `interview-prep/react-native/15-bridge.md`

### Topics to learn
- [ ] JS thread runs React + most business logic
- [ ] Native/UI thread lays out and draws views
- [ ] Native modules may do work on background threads
- [ ] Bridge congestion vs JS thread blockage vs UI thread jank - different diagnoses

### Symptom table (interview gold)

| Symptom | Likely layer |
|---|---|
| UI frozen, taps delayed, React not updating | JS thread busy |
| Scroll still moves but JS reactions lag | Native scroll OK; JS/bridge overloaded |
| Dropped frames during style thrash from JS | Bridge + UI updates / JS-driven animation |
| Startup slow before first meaningful paint | Module init + bundle + bridge setup |
| Native crash with JS still "fine" until next call | Native module bug, not Bridge itself |

---
