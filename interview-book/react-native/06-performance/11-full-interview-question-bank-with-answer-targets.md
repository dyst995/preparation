# 11. Full interview question bank (with answer targets)

> Source: `interview-prep/react-native/06-performance.md`

### Threading & profiling

1. **How do you tell if a perf issue is JS-thread or UI-thread?** ? Perf Monitor JS/UI FPS split, then drill with the right profiler.
2. **Name platform-specific profiling tools you've used.** ? Xcode Instruments (Time Profiler/Allocations/Leaks), Android Studio Profiler/Systrace/Perfetto, React DevTools Profiler, Hermes sampling profiler.
3. **Why measure on a release build, not dev mode?** ? Dev mode has extra checks/overhead that distort real numbers.

### Rendering & memoization

4. **When does `React.memo` fail silently?** ? New reference props (inline objects/functions), Context changes.
5. **When is `useMemo` counterproductive?** ? Cheap computations where bookkeeping cost exceeds recompute cost.
6. **How do you avoid Context-driven re-render storms?** ? Split contexts, memoize context value, or use selector-based state libraries for hot data.

### Lists

7. **Full FlatList tuning checklist?** ? `keyExtractor`, `getItemLayout`, `initialNumToRender`, `windowSize`, `maxToRenderPerBatch`, `removeClippedSubviews`, memoized rows, `extraData`.
8. **FlatList vs FlashList � when to switch?** ? Very large/high-churn lists where mount/unmount overhead is the measured bottleneck.
9. **Common list-caused crashes?** ? Unbounded image memory, nested virtualized lists, stale keys causing state bleed.

### Animation/gesture

10. **`Animated` + `useNativeDriver` vs Reanimated � difference?** ? Native driver offloads specific properties; Reanimated runs worklet logic on the UI thread for arbitrary, gesture-driven, interdependent animations.
11. **Why pair Reanimated with Gesture Handler?** ? Native gesture recognition + UI-thread animation logic together avoid JS-thread dependency for interaction smoothness.

### Startup & memory

12. **How do you reduce TTI?** ? Trim root providers, lazy-load non-critical screens/SDKs, parallelize startup network calls, Hermes bytecode.
13. **How do you hunt a memory leak?** ? Repro + Instruments/Android Profiler memory graph, audit effect cleanups, check native listener removal.
14. **Real production example of a memory-related crash you fixed?** ? Use MyCreditInfo/Wizer image or listener leak stories.

### Native boundary

15. **Why batch native calls instead of looping calls?** ? Per-call overhead adds up even with JSI's improvements.

---
