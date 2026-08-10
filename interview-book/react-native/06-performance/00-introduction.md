# 06  Performance Optimization — Introduction

> Source: `interview-prep/react-native/06-performance.md`

> Goal: Be able to diagnose *where* a React Native app is slow (JS thread, UI thread, native, memory, startup), explain *why*, and describe concrete fixes you have shipped � backed by your real crash-rate and performance wins (MyCreditInfo, Wizer, Online School, EasyPay).

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Explain the JS-thread vs UI-thread performance model and diagnose which one is the bottleneck from symptoms alone.
2. Use profiling tools (Flipper/RN DevTools, Perf Monitor, Xcode Instruments, Android Studio Profiler, Systrace/Perfetto) to find real bottlenecks instead of guessing.
3. Apply `memo`, `useMemo`, `useCallback` correctly � and explain when they *hurt* rather than help.
4. Tune every important `FlatList` prop and explain the tradeoffs of each.
5. Discuss FlashList and when it is worth adopting.
6. Explain Reanimated/gesture-handler's UI-thread execution model at a level that satisfies a senior interviewer.
7. Optimize images, fonts, and assets for memory and network.
8. Reduce app startup time / Time-To-Interactive (TTI).
9. Recognize and fix common memory leaks in RN apps.
10. Explain Hermes and bridge/JSI performance costs precisely.
11. Always frame answers around **"measure first, then optimize"** � this is the single biggest signal of seniority.
12. Tie every technique back to a concrete story from your CV (crash-rate reductions, FlatList-heavy fintech/insurance/edtech apps).

---
