# 01. The performance mental model: two threads, one perception of "smooth"

> Source: `interview-prep/react-native/06-performance.md`

### Topics to learn
- [ ] JS thread vs UI/main thread responsibilities (recap from fundamentals, applied to perf)
- [ ] 60fps / 16.6ms budget per frame (and 120fps / 8.3ms on ProMotion devices)
- [ ] Where JSI/Fabric changes the old "bridge congestion" story
- [ ] "Janky frame" vs "dropped frame" vs "frozen frame"
- [ ] Why an app can *look* smooth while JS is unresponsive (native-driven scroll/animation) and vice versa

### The 16.6ms budget

Every frame, the system wants to compute layout, draw, and composite in time for the next screen refresh. If work exceeds the budget, a frame is dropped and the user perceives jank (stutter). On React Native:

- If the **JS thread** is busy (heavy re-render, huge synchronous computation, JSON parsing, long list `map`), React can't push updates in time � UI can look "stuck" or a fraction behind.
- If the **UI/main thread** is busy (huge native view hierarchies, expensive layout passes, synchronous native work), even native-driven animations and scroll can stutter.
- If a **native module call blocks the UI thread synchronously** (a bad Turbo/Native Module implementation), you get the worst of both.

### Symptom ? likely thread table

| Symptom | Likely cause | Where to look |
|---|---|---|
| Taps feel delayed, list doesn't update on new data | JS thread busy | React DevTools profiler, Perf Monitor JS FPS |
| Scroll stutters even though nothing re-renders | UI thread busy (heavy view tree, layout thrash) | UI FPS in Perf Monitor, native profiler |
| Animation stutters only when driven by `setState`/JS | JS thread driving visuals | Move to Reanimated/native driver |
| App freezes entirely for a moment | Long synchronous native call, GC pause, huge JSON parse | Native profiler + JS heap snapshot |
| Fine on emulator, bad on real low-end device | Missed on real profiling; device tier matters | Test on min-spec Android device |

### Interview question

**Q: How do you know whether a performance problem is on the JS thread or UI thread?**

**Strong answer:**
> "I open the in-app Perf Monitor or DevTools profiler, which reports JS FPS and UI FPS separately. If JS FPS drops while UI FPS stays high, the bottleneck is React work � re-renders, heavy computation, or blocking JS. If UI FPS drops too, it's native � usually view hierarchy complexity, layout, or a native call blocking the main thread. I don't guess; I isolate the thread first, then drill into what's running on it with a profiler."

---
