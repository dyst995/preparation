# 16. Mastery checklist

> Source: `interview-prep/react-native/06-performance.md`

- [ ] I can diagnose JS-thread vs UI-thread bottlenecks using Perf Monitor/DevTools before touching code
- [ ] I can name the exact tradeoff of every major FlatList performance prop, not just its name
- [ ] I know when `memo`/`useMemo`/`useCallback` help and when they add overhead for nothing
- [ ] I can explain Reanimated's UI-thread worklet model vs `Animated`'s native driver
- [ ] I have a systematic memory-leak-hunting process (repro ? profiler ? effect cleanup audit)
- [ ] I can describe a concrete startup-time optimization I shipped
- [ ] I can tell the MyCreditInfo/Wizer/Online School crash-rate story with the specific technical root causes, not just the percentages
- [ ] I always frame answers as measure ? isolate ? fix ? re-measure
