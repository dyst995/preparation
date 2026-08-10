# 04. Threads: JS, UI/main, native modules

> Source: `interview-prep/react-native/01-fundamentals.md`

### Topics to learn
- [ ] JS thread responsibilities
- [ ] UI / main thread responsibilities
- [ ] Native module background threads
- [ ] What �JS thread blocked� feels like in UX
- [ ] Gesture/animation strategies that avoid JS bottlenecks

### Mental model

| Thread | Typical work |
|---|---|
| **JS thread** | React render, business logic, most app JS |
| **UI / main thread** | Native layout, drawing, native gesture recognition, platform UI |
| **Native modules threads** | Native async work (I/O, heavy native compute), depending on implementation |

### If the JS thread is blocked

Symptoms:
- UI may still show static frames, but React updates stall
- Taps feel dead
- Navigation transitions stutter
- Timers/`setState` delayed
- Lists stop updating

Common blockers:
- Heavy JSON parsing on JS thread
- Large synchronous loops
- Expensive re-renders of huge trees
- Big image processing in JS
- Unbounded work in startup path

### Interview questions

**Q: What runs where? What if JS is blocked?**

> �React reconciliation and most app logic run on the JS thread. Native views layout and draw on the UI thread. If JS is blocked, React can�t process updates or events promptly � the app feels frozen even if the OS process is alive. That�s why we move heavy work off the critical path, virtualize lists, and keep high-frequency animations off the JS bridge where possible.�

**Q: Why can scroll still be smooth while JS is busy?**

> �Native scroll views can continue on the UI thread. But JS-driven reactions to scroll (e.g. JS listeners doing heavy work) can still jank.�

---
