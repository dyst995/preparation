# 12. Hands-on drills (do these)

> Source: `interview-prep/react-native/06-performance.md`

- [ ] Take a `FlatList` with inline `renderItem` and object-literal styles; refactor to a memoized row component with stable props, then measure JS FPS before/after with Perf Monitor.
- [ ] Deliberately break `React.memo` with an inline arrow function prop, observe the extra re-renders in React DevTools, then fix it with `useCallback`.
- [ ] Add `getItemLayout` to a fixed-height list and compare initial render time and `scrollToIndex` behavior before/after.
- [ ] Build a screen with a `setInterval` in `useEffect` without cleanup, navigate away/back 10 times, and watch memory climb in a native profiler � then fix it.
- [ ] Animate an element's position two ways: (a) via `setState` on every gesture move, (b) via Reanimated shared values + Gesture Handler. Compare smoothness while a heavy JS task runs in the background.
- [ ] Load a list of large remote images unthrottled vs with a properly sized/cached image component; compare memory usage.
- [ ] Time cold-start TTI before and after deferring one non-critical SDK init to after first paint.

---
