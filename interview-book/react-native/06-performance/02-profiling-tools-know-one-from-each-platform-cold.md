# 02. Profiling tools  know one from each platform cold

> Source: `interview-prep/react-native/06-performance.md`

### Topics to learn
- [ ] React DevTools Profiler (component render timings, why-did-this-render)
- [ ] In-app Perf Monitor (JS FPS / UI FPS overlay)
- [ ] Flipper (legacy but still seen) vs React Native DevTools (modern default)
- [ ] Android Studio Profiler (CPU, memory, energy) + Systrace/Perfetto for frame-level tracing
- [ ] Xcode Instruments (Time Profiler, Allocations, Leaks, Core Animation)
- [ ] Hermes sampling profiler (`hermes-profile-transformer`, Chrome DevTools flame chart)
- [ ] `console.time` / custom marks for coarse measurement
- [ ] Firebase Performance Monitoring / Crashlytics breadcrumbs for production-only issues

### Practical workflow

1. **Reproduce** on a release-like build (dev mode has extra overhead: warnings, dev-only checks, no Hermes bytecode optimizations in some setups) � never trust dev-mode perf numbers alone.
2. **Isolate the thread** with Perf Monitor / DevTools.
3. **Drill down**:
   - JS-side ? React DevTools Profiler (which components re-rendered, how long, why) or Hermes sampling profiler for hot JS functions.
   - Native-side ? Xcode Instruments Time Profiler / Android Studio CPU Profiler to see native call stacks.
4. **Fix the top offender**, not everything at once.
5. **Re-measure** with the same method to confirm the fix actually worked � never assume.
6. **Guard against regression**: add a lightweight perf check or at least a code-review note ("this list must stay virtualized").

### Interview question

**Q: Walk me through how you'd investigate "the app feels slow" reported by a client.**

**Strong answer:**
> "First I get specifics � which screen, which action, which device tier, does it reproduce on release build. Then I reproduce it myself on a release build matching their device class if possible. I use the Perf Monitor to see if it's JS or UI thread, then React DevTools Profiler or Instruments/Android Profiler to find the actual hot path. I fix the biggest offender, re-measure with the same tool, and only then move to the next issue. I've done this exact workflow reducing crash-adjacent and jank issues on MyCreditInfo and Wizer, where 'it's slow' from a client turned out to be unmemoized list rows and unbounded re-renders from Context, respectively."

### Rule to say out loud in every performance answer

> "I never optimize blind. Every fix I mention started from a profiler measurement, and I re-measure afterward to confirm the win � otherwise you're just guessing and might make things worse (e.g. `useMemo` where the comparison cost exceeds the recompute cost)."

---
