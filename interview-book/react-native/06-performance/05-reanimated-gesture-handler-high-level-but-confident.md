# 05. Reanimated & Gesture Handler  high-level but confident

> Source: `interview-prep/react-native/06-performance.md`

### Topics to learn
- [ ] Why JS-driven animations (`Animated` without `useNativeDriver`, or raw `setState` loops) jank under JS load
- [ ] `useNativeDriver: true` for the classic `Animated` API � what it does and its limits (only certain properties)
- [ ] Reanimated's worklet model � animation logic runs on the UI thread, not round-tripping through JS per frame
- [ ] Shared values vs React state for animation-driven data
- [ ] `react-native-gesture-handler` � native-driven gesture recognition vs the old JS `PanResponder`
- [ ] Why combining Reanimated + Gesture Handler gets you 60/120fps gestures independent of JS thread load

### Mental model

The old `Animated` API without `useNativeDriver` sends a new value across the bridge every frame from JS � if JS is busy, animation stutters. `useNativeDriver: true` offloads *supported* properties (transform, opacity) to run natively once the animation starts, but it can't handle animations that need to update non-animatable properties (like `height` in some cases) or run arbitrary JS logic per frame.

Reanimated goes further: your animation logic itself (worklets) is compiled/run in a way that executes on the UI thread without needing a JS round-trip per frame, which is why complex, gesture-driven, physics-based animations stay smooth even when the JS thread is under load (e.g. during network calls or heavy re-renders elsewhere in the app).

Gesture Handler moves gesture *recognition* to native as well, instead of relying on JS-thread `PanResponder` callbacks for every touch event � critical for drag/swipe interactions that must feel instant.

### Interview question

**Q: Why would you use Reanimated instead of the built-in `Animated` API?**

**Strong answer:**
> "`Animated` with `useNativeDriver` already offloads simple transform/opacity animations to the native/UI thread, which is often enough. I reach for Reanimated when I need gesture-driven or interdependent animations � e.g. a swipe-to-dismiss that follows the finger, or an animation whose value depends on other animated values with per-frame logic � because Reanimated's worklets run on the UI thread directly rather than bridging JS every frame. Combined with Gesture Handler for native gesture recognition, this keeps interactions smooth even if the JS thread is momentarily busy with a re-render or network response, which matters a lot in a transaction-heavy fintech app like EasyPay where you can't let a background API call jank the UI."

---
