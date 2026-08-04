# 06 — Performance Optimization

> Goal: Be able to diagnose *where* a React Native app is slow (JS thread, UI thread, native, memory, startup), explain *why*, and describe concrete fixes you have shipped — backed by your real crash-rate and performance wins (MyCreditInfo, Wizer, Online School, EasyPay).

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Explain the JS-thread vs UI-thread performance model and diagnose which one is the bottleneck from symptoms alone.
2. Use profiling tools (Flipper/RN DevTools, Perf Monitor, Xcode Instruments, Android Studio Profiler, Systrace/Perfetto) to find real bottlenecks instead of guessing.
3. Apply `memo`, `useMemo`, `useCallback` correctly — and explain when they *hurt* rather than help.
4. Tune every important `FlatList` prop and explain the tradeoffs of each.
5. Discuss FlashList and when it is worth adopting.
6. Explain Reanimated/gesture-handler's UI-thread execution model at a level that satisfies a senior interviewer.
7. Optimize images, fonts, and assets for memory and network.
8. Reduce app startup time / Time-To-Interactive (TTI).
9. Recognize and fix common memory leaks in RN apps.
10. Explain Hermes and bridge/JSI performance costs precisely.
11. Always frame answers around **"measure first, then optimize"** — this is the single biggest signal of seniority.
12. Tie every technique back to a concrete story from your CV (crash-rate reductions, FlatList-heavy fintech/insurance/edtech apps).

---

## 1. The performance mental model: two threads, one perception of "smooth"

### Topics to learn
- [ ] JS thread vs UI/main thread responsibilities (recap from fundamentals, applied to perf)
- [ ] 60fps / 16.6ms budget per frame (and 120fps / 8.3ms on ProMotion devices)
- [ ] Where JSI/Fabric changes the old "bridge congestion" story
- [ ] "Janky frame" vs "dropped frame" vs "frozen frame"
- [ ] Why an app can *look* smooth while JS is unresponsive (native-driven scroll/animation) and vice versa

### The 16.6ms budget

Every frame, the system wants to compute layout, draw, and composite in time for the next screen refresh. If work exceeds the budget, a frame is dropped and the user perceives jank (stutter). On React Native:

- If the **JS thread** is busy (heavy re-render, huge synchronous computation, JSON parsing, long list `map`), React can't push updates in time — UI can look "stuck" or a fraction behind.
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
> "I open the in-app Perf Monitor or DevTools profiler, which reports JS FPS and UI FPS separately. If JS FPS drops while UI FPS stays high, the bottleneck is React work — re-renders, heavy computation, or blocking JS. If UI FPS drops too, it's native — usually view hierarchy complexity, layout, or a native call blocking the main thread. I don't guess; I isolate the thread first, then drill into what's running on it with a profiler."

---

## 2. Profiling tools — know one from each platform cold

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

1. **Reproduce** on a release-like build (dev mode has extra overhead: warnings, dev-only checks, no Hermes bytecode optimizations in some setups) — never trust dev-mode perf numbers alone.
2. **Isolate the thread** with Perf Monitor / DevTools.
3. **Drill down**:
   - JS-side ? React DevTools Profiler (which components re-rendered, how long, why) or Hermes sampling profiler for hot JS functions.
   - Native-side ? Xcode Instruments Time Profiler / Android Studio CPU Profiler to see native call stacks.
4. **Fix the top offender**, not everything at once.
5. **Re-measure** with the same method to confirm the fix actually worked — never assume.
6. **Guard against regression**: add a lightweight perf check or at least a code-review note ("this list must stay virtualized").

### Interview question

**Q: Walk me through how you'd investigate "the app feels slow" reported by a client.**

**Strong answer:**
> "First I get specifics — which screen, which action, which device tier, does it reproduce on release build. Then I reproduce it myself on a release build matching their device class if possible. I use the Perf Monitor to see if it's JS or UI thread, then React DevTools Profiler or Instruments/Android Profiler to find the actual hot path. I fix the biggest offender, re-measure with the same tool, and only then move to the next issue. I've done this exact workflow reducing crash-adjacent and jank issues on MyCreditInfo and Wizer, where 'it's slow' from a client turned out to be unmemoized list rows and unbounded re-renders from Context, respectively."

### Rule to say out loud in every performance answer

> "I never optimize blind. Every fix I mention started from a profiler measurement, and I re-measure afterward to confirm the win — otherwise you're just guessing and might make things worse (e.g. `useMemo` where the comparison cost exceeds the recompute cost)."

---

## 3. `memo`, `useMemo`, `useCallback` — correct use and real tradeoffs

### Topics to learn
- [ ] `React.memo` shallow prop comparison and when it helps
- [ ] `useMemo` for expensive computations vs referential stability
- [ ] `useCallback` for stable function identity (mainly to satisfy memoized children or dependency arrays)
- [ ] The cost of memoization itself (comparison cost, memory retained)
- [ ] Why memoizing everything is an anti-pattern
- [ ] Context re-render traps and how memoization does/doesn't help
- [ ] `useMemo`/`useCallback` are not guarantees (React can discard the cache) — mental model correction

### When each actually helps

| Tool | Helps when | Doesn't help / hurts when |
|---|---|---|
| `React.memo` | Component is expensive to render and receives the same props often (e.g. list rows) | Props change almost every render anyway (comparison cost wasted); props include new object/array/function literals each render (breaks memoization silently) |
| `useMemo` | Computation is genuinely expensive (sorting/filtering large arrays, derived heavy objects) | Trivial computations — the memoization bookkeeping can cost more than recomputing |
| `useCallback` | Function is passed to a memoized child, or is a dependency of another hook (`useEffect`) that must stay stable | Used everywhere "just in case" — adds cognitive and runtime overhead with no measured benefit |

### The classic silent-break pattern

```jsx
// BAD: new object literal every render defeats React.memo on Row
<Row style={{ marginVertical: 8 }} onPress={() => onPress(item.id)} />

// BETTER: stable references
const rowStyle = useMemo(() => ({ marginVertical: 8 }), []);
const handlePress = useCallback(() => onPress(item.id), [item.id, onPress]);
<Row style={rowStyle} onPress={handlePress} />
```

Interviewers love asking about this because it's the #1 reason "I already used `React.memo` but it's still slow."

### Context re-render trap

Any component consuming a Context re-renders whenever the Context value changes — regardless of `memo` on that component, because `memo` only checks *props*, and Context isn't a prop. Fixes:
- Split Context into smaller, more granular providers (state vs dispatch, or per-domain slices).
- Memoize the Context value object itself so it doesn't get a new reference every parent render.
- Consider a selector-based state library (Zustand, Redux with selectors) for hot paths instead of Context for frequently-changing data.

### Interview question

**Q: When would `useMemo` make performance worse?**

**Strong answer:**
> "If the computation is cheap — like a simple arithmetic derivation or short array of a few items — the memoization machinery (dependency comparison, cache storage) can cost more than just recomputing every render. `useMemo` is also not a semantic guarantee in React; the cache can be dropped for memory reasons, so you shouldn't rely on it for correctness, only for performance. I reserve it for measurably expensive derivations — large list transforms, heavy formatting, or expensive selectors — and I verify with the profiler that it actually reduced render time before keeping it."

**Q: `React.memo` isn't working — why?**

**Strong answer:**
> "Usually because a prop is a new reference every render — inline object/array/style literals or inline arrow functions passed down without `useMemo`/`useCallback`, or a Context value changing underneath. `React.memo` only does a shallow prop comparison, so any of those defeats it silently with no warning. I check with React DevTools' 'why did this render' or a manual `console.log` of prop identities before assuming memoization failed for another reason."

---

## 4. FlatList performance — deep dive (high interview weight)

This is one of the most tested RN performance topics. Know every important prop and its tradeoff, not just the names.

### Topics to learn
- [ ] Virtualization/windowing concept (recap) and the render-window lifecycle
- [ ] `keyExtractor` correctness and stability
- [ ] `renderItem` cost, purity, and memoization strategy
- [ ] `getItemLayout` — what it unlocks and its constraint (fixed/predictable height)
- [ ] `initialNumToRender`
- [ ] `windowSize`
- [ ] `maxToRenderPerBatch`
- [ ] `updateCellsBatchingPeriod`
- [ ] `removeClippedSubviews`
- [ ] `onEndReachedThreshold` / `onEndReached` for pagination
- [ ] `ListEmptyComponent`, `ListHeaderComponent`, `ListFooterComponent` — layout implications
- [ ] `extraData` for triggering re-render when non-prop state changes
- [ ] Avoiding nested `FlatList`/`VirtualizedList` inside `ScrollView`
- [ ] Item layout stability — avoid dynamic heights that fight `getItemLayout`
- [ ] Image loading strategy inside rows (thumbnails, caching, placeholders)
- [ ] `CellRendererComponent` for advanced custom cell wrapping (rare, but shows depth)

### Prop-by-prop reference table

| Prop | What it controls | Tradeoff / gotcha |
|---|---|---|
| `keyExtractor` | Stable identity per row for reconciliation | Using array index as key causes state bugs and wasted re-renders on reorder/insert; use a stable ID |
| `renderItem` | Function that renders each row | Must be light and ideally memoized (`React.memo` on the row component); avoid creating new inline functions/objects per item |
| `getItemLayout` | Precomputed `{ length, offset, index }` so FlatList skips measuring | Huge perf win, but only valid for fixed (or precisely computable) row heights; wrong values cause visual glitches/scroll jumps |
| `initialNumToRender` | How many items render on first mount | Higher = smoother initial scroll but slower first paint; tune to just cover the initial viewport + a little buffer |
| `windowSize` | Multiplier of viewport-heights kept rendered above/below (default 21 ? 10 above + 10 below + visible) | Lower = less memory/CPU but more blank cells on fast scroll ("flicker"/"popping"); higher = smoother fast scroll but more memory |
| `maxToRenderPerBatch` | Max items rendered per batch during scroll | Lower = smaller, more frequent, cheaper batches (helps keep JS thread responsive); too low can slow down time-to-fill-screen while scrolling fast |
| `updateCellsBatchingPeriod` | Delay (ms) between render batches | Higher = fewer, chunkier updates (can feel less responsive); lower = more frequent updates (more CPU) |
| `removeClippedSubviews` | Detaches views outside the viewport from the native hierarchy (Android historically bigger win) | Can cause rendering glitches in some nested/absolute-positioned layouts; test carefully, especially with sticky headers or overlays |
| `onEndReachedThreshold` | Distance (in units of viewport length) from the end to trigger `onEndReached` | Too small = pagination trigger fires late (user sees a loading gap); too large = fires too early, wasting requests |
| `extraData` | Forces re-render of items when something outside `item`/`index` changes (e.g. a "selected" set) | Forgetting this is the #1 cause of "my list doesn't update the UI even though state changed" bugs |
| `ListHeaderComponent`/`ListFooterComponent` | Non-virtualized header/footer content | Keep them light — they're not windowed |
| `CellRendererComponent` | Custom wrapper per cell (e.g. custom animations, z-index control) | Advanced; only reach for it with a specific measured need |

### Core interview answer for "how do you optimize a FlatList?"

> "First I confirm it's actually the list that's slow via profiling, not something else on the screen. Then, in order of impact: I make sure `keyExtractor` returns a stable unique ID, not index. I keep `renderItem` a memoized, presentational component with primitive or memoized props. If rows have a fixed or computable height, I add `getItemLayout` to skip measurement entirely — this alone often fixes scroll-jump and initial-render-time issues. I tune `initialNumToRender` to the actual initial viewport instead of an oversized default, and adjust `windowSize`/`maxToRenderPerBatch` based on whether I'm optimizing for memory (lower) or scroll smoothness (higher) — that's a tradeoff, not a free win. I check `removeClippedSubviews` empirically since it can help Android memory but sometimes causes rendering glitches. I make sure images in rows are properly sized/cached, not full-resolution network images. And I always confirm any lift by re-measuring FPS and memory, not by assumption."

### Common FlatList bugs (great interview material)

- Using array index as `keyExtractor` ? item state bleeds into the wrong row after insert/delete/reorder.
- Passing `data.filter(...)` or `data.map(...)` inline as the `data` prop ? new array reference every render, defeats internal optimizations, can cause unnecessary re-renders.
- Nesting a `FlatList` inside a `ScrollView` (or another `VirtualizedList`) ? breaks virtualization, RN warns about this, and you lose all the perf benefit.
- Rows with dynamic/unknown heights combined with `getItemLayout` using a guessed constant ? visible scroll jumping.
- Loading full-resolution images per row with no caching/resizing ? memory spikes, especially on Android with many rows scrolled through in a session (classic OOM crash contributor).
- Forgetting `extraData` when row appearance depends on external state (selection, favorites) ? stale UI.
- Heavy work (formatting dates, computing derived fields) done inline in `renderItem` on every render instead of memoized/precomputed once when data arrives.

### FlashList (Shopify) — awareness level

### Topics to learn
- [ ] What problem FlashList solves vs FlatList (recycling views instead of mount/unmount)
- [ ] `estimatedItemSize` requirement
- [ ] API similarity to FlatList (easy migration path) but different internals
- [ ] When it's worth the migration vs when FlatList is "good enough"

FlashList reuses (recycles) native views similarly to `RecyclerView`/`UICollectionView` recycling, rather than mounting/unmounting cells as FlatList does. This reduces the cost of view creation/teardown for very large or fast-scrolling lists, and tends to keep memory flatter over long scroll sessions.

**Interview framing**: "FlashList is a drop-in-ish replacement from Shopify built on view recycling instead of FlatList's mount/unmount model. It needs `estimatedItemSize` to pre-plan its recycling pool. I'd reach for it on very large, highly dynamic lists (feeds, chat) where FlatList's mount/unmount overhead is measurably the bottleneck — but I wouldn't reach for it by default; if FlatList profiles fine for the dataset size, I keep the simpler, more battle-tested dependency, especially in a fintech app (EasyPay) where I favor fewer, well-understood native-adjacent dependencies."

### Interview questions for this section

**Q: `getItemLayout` — what does it require and what does it save you?**
> "It requires that you can compute each row's length and offset without rendering it — normally a fixed row height, or a formula for variable-but-predictable heights. In exchange, FlatList skips its async layout measurement pass, which speeds up initial render and prevents scroll position jumps, especially valuable for `scrollToIndex` calls."

**Q: How do you handle variable-height rows performantly?**
> "If the variability is limited to a few known heights (e.g. text vs text+image), I still try to precompute layout with a formula for `getItemLayout`. If heights are truly unpredictable, I accept the measurement cost but keep everything else tight — memoized rows, stable keys, tuned `windowSize` — and consider FlashList, which handles variable sizes more gracefully via estimation and recycling."

---

## 5. Reanimated & Gesture Handler — high-level but confident

### Topics to learn
- [ ] Why JS-driven animations (`Animated` without `useNativeDriver`, or raw `setState` loops) jank under JS load
- [ ] `useNativeDriver: true` for the classic `Animated` API — what it does and its limits (only certain properties)
- [ ] Reanimated's worklet model — animation logic runs on the UI thread, not round-tripping through JS per frame
- [ ] Shared values vs React state for animation-driven data
- [ ] `react-native-gesture-handler` — native-driven gesture recognition vs the old JS `PanResponder`
- [ ] Why combining Reanimated + Gesture Handler gets you 60/120fps gestures independent of JS thread load

### Mental model

The old `Animated` API without `useNativeDriver` sends a new value across the bridge every frame from JS — if JS is busy, animation stutters. `useNativeDriver: true` offloads *supported* properties (transform, opacity) to run natively once the animation starts, but it can't handle animations that need to update non-animatable properties (like `height` in some cases) or run arbitrary JS logic per frame.

Reanimated goes further: your animation logic itself (worklets) is compiled/run in a way that executes on the UI thread without needing a JS round-trip per frame, which is why complex, gesture-driven, physics-based animations stay smooth even when the JS thread is under load (e.g. during network calls or heavy re-renders elsewhere in the app).

Gesture Handler moves gesture *recognition* to native as well, instead of relying on JS-thread `PanResponder` callbacks for every touch event — critical for drag/swipe interactions that must feel instant.

### Interview question

**Q: Why would you use Reanimated instead of the built-in `Animated` API?**

**Strong answer:**
> "`Animated` with `useNativeDriver` already offloads simple transform/opacity animations to the native/UI thread, which is often enough. I reach for Reanimated when I need gesture-driven or interdependent animations — e.g. a swipe-to-dismiss that follows the finger, or an animation whose value depends on other animated values with per-frame logic — because Reanimated's worklets run on the UI thread directly rather than bridging JS every frame. Combined with Gesture Handler for native gesture recognition, this keeps interactions smooth even if the JS thread is momentarily busy with a re-render or network response, which matters a lot in a transaction-heavy fintech app like EasyPay where you can't let a background API call jank the UI."

---

## 6. Image optimization

### Topics to learn
- [ ] Serving correctly-sized images (don't ship 4000px images for 40px avatars)
- [ ] `resizeMode` semantics: `cover`, `contain`, `stretch`, `center`, `repeat`
- [ ] Native image caching behavior (memory + disk cache) and cache-busting pitfalls
- [ ] `react-native-fast-image` (or platform-native caching equivalents) awareness for aggressive caching/priority control
- [ ] Placeholder/blur-up strategies to avoid layout pop
- [ ] Avoiding image decode cost on the JS/UI thread for large lists
- [ ] Memory pressure from many large images decoded simultaneously (common Android OOM source)

### Practical points

- Request appropriately sized images from the backend/CDN (e.g. thumbnail endpoints) rather than downscaling huge images client-side — client-side downscale still pays the full decode/memory cost first.
- Reserve layout space (fixed dimensions or aspect-ratio boxes) before the image loads to avoid content jumping.
- In a list, ensure each row's image is a small, cached thumbnail — this was a real contributor to memory-related crashes in legacy apps like MyCreditInfo before optimization.
- Prefer PNG/WebP appropriately (WebP is generally smaller for photographic content on Android; iOS support has matured too) — know the format tradeoff exists even if the answer is "it depends on the asset pipeline."

### Interview question

**Q: A screen with a long list of user avatars/thumbnails is causing memory warnings/crashes on Android. What do you check?**

**Strong answer:**
> "First, image size — are we downloading full-resolution images and letting the device decode and hold them at full size in memory just to display a 40x40 avatar? I'd request appropriately sized thumbnails from the backend or CDN. Second, caching — are duplicate requests re-decoding the same image, or is there a proper memory+disk cache? Third, list virtualization — confirm images are only decoded for currently-rendered rows, not the entire dataset. This combination — oversized images plus no virtualization — was exactly the pattern behind crash-rate issues I fixed at MyCreditInfo, where Crashlytics showed OOM-adjacent native crashes concentrated on image-heavy screens on lower-end Android devices."

---

## 7. Startup performance & Time-To-Interactive (TTI)

### Topics to learn
- [ ] What counts toward startup time: native app launch ? JS bundle load/parse ? first meaningful render ? interactive
- [ ] Hermes bytecode precompilation reducing parse/compile time (recap, applied to TTI)
- [ ] Lazy loading / code-splitting screens and heavy libraries not needed at launch
- [ ] Deferring non-critical initialization (analytics, non-blocking SDK inits) until after first paint
- [ ] Reducing work in the root component tree before first render
- [ ] Splash screen strategy — matching perceived vs actual load time
- [ ] Avoiding synchronous heavy storage reads (e.g. large AsyncStorage blobs) on the startup path
- [ ] Network waterfall on startup (auth check, config fetch) — parallelize instead of serializing

### Practical techniques

1. **Lazy-load screens** not needed on first paint (`React.lazy`/dynamic import patterns adapted for RN, or simply deferring heavy provider setup).
2. **Defer non-critical SDK init** (crash reporting can init early since you want to catch startup crashes, but heavy analytics batching, feature-flag fetches, etc. can be deferred slightly).
3. **Cache warm data**: if a "logged in" screen needs data, consider showing cached/last-known data immediately while refetching, rather than blocking the first render on a network round trip.
4. **Trim root-level Context/Provider nesting** — every provider mounted before first render adds cost; only mount what's truly needed immediately.
5. **Use Hermes** (assume default now) and confirm bytecode precompilation is actually enabled for release builds.
6. **Measure real TTI** with a timestamp from native launch to "first interactive frame," not just "JS bundle loaded."

### Interview question

**Q: How do you reduce app startup time?**

**Strong answer:**
> "I first measure — instrument a timestamp from native process start to first interactive frame, not just bundle-load time, so I know the real budget. Then I look at three buckets: bundle/parse cost (Hermes bytecode helps here), root-tree initialization cost before first paint (trim unnecessary providers, defer non-critical SDK init), and network-on-the-critical-path (don't block first render on a sequential chain of auth-check ? config-fetch ? data-fetch; parallelize or show cached data first). On the apps I modernized — MyCreditInfo especially — startup performance was one of the concrete wins I delivered through lazy loading and reducing the initial rendering/network path, alongside HTTP caching with ETags so repeat loads didn't re-fetch unchanged data."

---

## 8. Memory leaks in React Native

### Topics to learn
- [ ] Uncleaned event listeners / subscriptions (Firebase listeners, event emitters, WebSocket connections)
- [ ] Uncleaned timers (`setInterval`/`setTimeout`) surviving unmount
- [ ] Stale closures holding references to large objects
- [ ] Native module listeners that must be explicitly removed (common with Notifee, Firebase Messaging, camera/barcode SDKs)
- [ ] Image caches growing unbounded without eviction
- [ ] Navigation stacks retaining unmounted screen state improperly (memory-heavy screens kept alive)
- [ ] Detecting leaks: memory graphs in Xcode Instruments (Leaks/Allocations) and Android Studio Profiler heap dumps

### The universal fix pattern

```jsx
useEffect(() => {
  const sub = SomeNativeModule.addListener('event', handler);
  const id = setInterval(tick, 1000);

  return () => {
    sub.remove();       // or unsubscribe(), depending on API
    clearInterval(id);
  };
}, []);
```

Every subscription/timer/listener created in an effect needs a matching cleanup — this is the single most common source of RN memory leaks and a very common interview probe.

### Interview question

**Q: How would you find and fix a memory leak in a React Native screen?**

**Strong answer:**
> "I'd reproduce by navigating in and out of the screen repeatedly and watch memory in Xcode Instruments (Allocations/Leaks) or Android Studio's memory profiler — if memory climbs and doesn't come back down after garbage collection, something is being retained. Then I audit the screen's `useEffect`s for subscriptions, listeners (native module event listeners are a common culprit — Firebase, push notification SDKs, barcode scanner SDKs), and timers that aren't cleaned up in the return function. I also check for closures capturing large objects unnecessarily. This kind of leak hunting was part of the production-issue investigation work behind the crash-rate reductions on Wizer and Online School — some 'crashes' were actually OOM kills traceable to unreleased native listeners after repeated navigation."

---

## 9. Bridge / JSI cost, and when it still matters

### Topics to learn
- [ ] Why frequent small native calls still have overhead even on the New Architecture
- [ ] Batching native calls instead of calling per-item in a loop
- [ ] Avoiding chatty native module APIs (many tiny calls vs one call with a batched payload)
- [ ] Synchronous vs asynchronous native calls — when sync is safe (JSI enables it) and when it's dangerous (blocking UI thread)

### Interview question

**Q: You have a Turbo/Native Module and a loop that calls it 500 times. What's wrong, and what would you do?**

**Strong answer:**
> "Even with JSI's lower per-call overhead versus the old bridge, 500 individual native calls in a loop still pay serialization and call overhead 500 times, and if the native side does any work per call, that adds up on whichever thread it runs on. I'd redesign the API to accept a batch — pass the whole array once and let native process it in one call — rather than calling per item. This is the same principle as batching network requests: fewer, larger calls beat many small ones."

---

## 10. Measure first — the meta-skill interviewers actually grade

### Topics to learn
- [ ] Never claim a fix "should" help without a before/after measurement
- [ ] Understanding that some "optimizations" (excess memoization, premature FlashList adoption, over-aggressive `shouldComponentUpdate`-style logic) can *regress* performance
- [ ] Communicating tradeoffs (memory vs CPU vs smoothness vs code complexity) rather than absolutes
- [ ] Knowing when "good enough" is the right answer — not every screen needs `getItemLayout` or Reanimated

### The answer structure senior interviewers want, every time

1. What was the reported/observed symptom?
2. How did you confirm which thread/subsystem was the bottleneck?
3. What tool did you use to pinpoint the exact cause?
4. What was the fix, and why that fix specifically (not a shotgun of unrelated changes)?
5. How did you confirm it actually worked, and did you guard against regression?

---

## Full interview question bank (with answer targets)

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
8. **FlatList vs FlashList — when to switch?** ? Very large/high-churn lists where mount/unmount overhead is the measured bottleneck.
9. **Common list-caused crashes?** ? Unbounded image memory, nested virtualized lists, stale keys causing state bleed.

### Animation/gesture

10. **`Animated` + `useNativeDriver` vs Reanimated — difference?** ? Native driver offloads specific properties; Reanimated runs worklet logic on the UI thread for arbitrary, gesture-driven, interdependent animations.
11. **Why pair Reanimated with Gesture Handler?** ? Native gesture recognition + UI-thread animation logic together avoid JS-thread dependency for interaction smoothness.

### Startup & memory

12. **How do you reduce TTI?** ? Trim root providers, lazy-load non-critical screens/SDKs, parallelize startup network calls, Hermes bytecode.
13. **How do you hunt a memory leak?** ? Repro + Instruments/Android Profiler memory graph, audit effect cleanups, check native listener removal.
14. **Real production example of a memory-related crash you fixed?** ? Use MyCreditInfo/Wizer image or listener leak stories.

### Native boundary

15. **Why batch native calls instead of looping calls?** ? Per-call overhead adds up even with JSI's improvements.

---

## Hands-on drills (do these)

- [ ] Take a `FlatList` with inline `renderItem` and object-literal styles; refactor to a memoized row component with stable props, then measure JS FPS before/after with Perf Monitor.
- [ ] Deliberately break `React.memo` with an inline arrow function prop, observe the extra re-renders in React DevTools, then fix it with `useCallback`.
- [ ] Add `getItemLayout` to a fixed-height list and compare initial render time and `scrollToIndex` behavior before/after.
- [ ] Build a screen with a `setInterval` in `useEffect` without cleanup, navigate away/back 10 times, and watch memory climb in a native profiler — then fix it.
- [ ] Animate an element's position two ways: (a) via `setState` on every gesture move, (b) via Reanimated shared values + Gesture Handler. Compare smoothness while a heavy JS task runs in the background.
- [ ] Load a list of large remote images unthrottled vs with a properly sized/cached image component; compare memory usage.
- [ ] Time cold-start TTI before and after deferring one non-critical SDK init to after first paint.

---

## Senior red flags / green flags

### Green flags interviewers love
- Every optimization claim is paired with a measurement method and a before/after
- Can explain *why* a specific FlatList prop helps, not just recite the prop names
- Knows memoization is not free and can hurt
- Distinguishes "the app feels slow" (needs triage) from "I know exactly which frame budget is blown"
- Ties fixes to real production crash/perf numbers (your 20%?0.03%, 15%?0.09%, 28%?0.15% reductions)

### Red flags
- "Just wrap everything in `useMemo`/`React.memo`" with no measurement
- Confusing FlatList virtualization with lazy-loading images (different concerns)
- Claiming Reanimated is "always better" than `Animated` without explaining the worklet/UI-thread reason
- No mention of profiling tools at all — pure guesswork answers
- Optimizing without ever discussing tradeoffs (memory vs CPU vs code complexity)

---

## Tie-backs to your experience (use in answers)

- **MyCreditInfo**: crash rate 20% ? 0.03% via Firebase Crashlytics-driven investigation; startup performance, rendering efficiency, and network performance improved via lazy loading and HTTP caching (ETags) — a direct TTI + network-waterfall story.
- **Wizer**: crash rate 15% ? 0.09%; feature-based architecture refactor that reduced re-render blast radius and made performance regressions easier to isolate; native iOS file preview library work shows comfort optimizing at the native boundary, not just JS.
- **Online School**: crash rate 28% ? 0.15% on a high-traffic, nationwide app with heavy lists (grades, attendance, messaging) — strong FlatList/memory story.
- **EasyPay**: fintech app built from scratch — you made the *architectural* performance decisions upfront (state management choice, navigation structure) rather than retrofitting, and cared about memory/performance/security as explicit CV bullet points.
- **Clean House**: Zebra DataWedge barcode workflows are a good example of avoiding chatty native calls in a scan-heavy warehouse workflow — batch and debounce scan events rather than triggering heavy JS work per scan.

---

## Senior-Level Best Practices

### Decision framework: which optimization is actually worth doing right now?

| Question | If yes -> | If no -> |
|---|---|---|
| Have I measured which thread/subsystem is actually the bottleneck? | Proceed to targeted fix | Stop - profile first, any "optimization" here is a guess |
| Does the fix address the specific measured hot path? | Ship it, then re-measure | Don't ship a plausible-sounding but unmeasured change |
| Is this a list with more than a few hundred rows or frequent updates? | `getItemLayout` + memoized rows + tuned windowing is worth the effort | A short static list doesn't need FlatList tuning beyond the basics |
| Is the list extremely large/high-churn (feed, chat) and FlatList is measurably the bottleneck after tuning? | Consider FlashList migration | Stay on FlatList - fewer, more battle-tested dependencies especially in a fintech app |
| Is the animation gesture-driven or does it depend on other animated values per frame? | Reanimated + Gesture Handler | `Animated` + `useNativeDriver` is likely sufficient |
| Is startup time the complaint? | Instrument real TTI first (native launch to interactive), then attack the biggest bucket (bundle/parse, root-tree init, network waterfall) | Don't guess which of the three buckets is the problem |

### Production checklist (performance, ship-ready)

- [ ] Every "we fixed performance" claim in a PR description has a before/after measurement attached (FPS, TTI, memory), not just "should be faster"
- [ ] Every FlatList/FlashList in the app has a stable `keyExtractor`, memoized row component, and `getItemLayout` where row height is fixed/predictable
- [ ] TTI is instrumented from native launch to first interactive frame in production (not just "bundle loaded"), with alerting on regression
- [ ] Root component tree before first paint is audited - no unnecessary providers or synchronous heavy storage reads blocking first render
- [ ] Image-heavy screens serve appropriately-sized thumbnails from the backend/CDN, not client-side-downscaled full-resolution images
- [ ] A memory-leak sweep (repeated navigate in/out of heavy screens while watching native memory profilers) has been run on at least the top 5 highest-traffic screens
- [ ] Native module calls that could be batched are batched - no per-item loops calling into native hundreds of times
- [ ] Release-build profiling has actually happened on a real low-end/min-spec Android device, not only on a simulator or a flagship test phone

### Anti-patterns seniors reject in code review

- **"Just wrap it in `useMemo`/`React.memo`" as a reflexive response with no profiler evidence** - sometimes the bookkeeping cost exceeds the recompute cost, and memoization is not free.
- **Optimizing based on emulator/simulator performance alone** - min-spec real Android devices routinely reveal problems invisible on a dev machine or flagship test phone.
- **Claiming Reanimated is "always better" than `Animated`** without being able to explain the worklet/UI-thread reasoning - signals memorized talking points, not understanding.
- **Adopting FlashList by default "because it's faster"** without first confirming FlatList, properly tuned, is actually the bottleneck - adds a dependency and migration cost for an unmeasured gain.
- **Fixing five things at once after one bug report** instead of isolating and fixing the single measured top offender, then re-measuring - makes it impossible to know what actually helped, and risks new regressions from unrelated changes.
- **Treating "the app feels slow" as a single ticket** instead of demanding specifics (which screen, which action, which device tier, release vs dev build) before writing any code.
- **Ignoring `extraData` on a FlatList that depends on external state**, then "fixing" the resulting stale-UI bug by forcing a full remount or key-changing the whole list - masks the real issue and defeats virtualization's benefits.

### Failure modes & how seniors debug them

| Symptom | Likely root cause | First tool | Fix |
|---|---|---|---|
| Jank only on Android, only on older devices | Heavy view hierarchy / lack of `removeClippedSubviews` / large image memory pressure | Android Studio Profiler on a min-spec test device | Trim view tree, tune list props, right-size images |
| App freezes for ~1 second randomly, no correlation to user action | GC pause (Hermes) triggered by memory pressure, or a large synchronous JSON parse on a timer/push event | Native memory profiler + Hermes sampling profiler correlated with timing of the freeze | Reduce allocation churn, move heavy parsing off the critical path, batch/debounce triggering events |
| Memory climbs steadily every time a user navigates into and out of one specific screen | Uncleaned listener/subscription/timer in that screen's `useEffect` | Repro loop (nav in/out x10) + Instruments Allocations or Android memory profiler heap dump | Add the missing cleanup function, audit all native module listeners on that screen |
| List scroll suddenly jumps or shows blank cells during fast scroll | `getItemLayout` values wrong for actual (non-fixed) row heights, or `windowSize` too low for the scroll speed | Visually reproduce + check row height assumptions vs actual measured heights | Fix `getItemLayout` formula or remove it if heights are genuinely variable; raise `windowSize` if memory allows |
| Cold start regresses after adding a new SDK | New SDK doing synchronous/eager init on the startup path | Compare TTI instrumentation before/after the SDK was added, bisect if needed | Defer SDK init to after first paint if it's not startup-critical |

### Observability / metrics you'd watch in production

- **JS FPS / UI FPS distributions** on top 3-5 highest-traffic screens, sampled continuously, not just spot-checked during QA.
- **TTI (native launch to interactive)**, p50/p95, tracked per release - a creeping p95 regression is often invisible in p50 averages.
- **Memory high-water mark per session** on image-heavy or long-list-heavy screens, segmented by device tier.
- **ANR rate (Android)** as a distinct signal from JS-exception crash rate - points specifically at UI-thread/native blocking.
- **Crash-free users % segmented by device tier and OS version**, since perf-driven crashes (OOM-adjacent) cluster on specific low-end device classes.
- **Bundle size over time** and **native app size over time** - both quietly affect download conversion and startup cost if unmonitored.

### Scalability & team practices

- **A written performance budget per screen type** (e.g. "list screens must hit X JS FPS on a min-spec test device") makes "is this fast enough" an objective code-review question instead of a subjective debate.
- **A designated min-spec Android test device (or device farm profile) is part of the QA process**, not an afterthought - most perf regressions that reach production were invisible on the engineer's own flagship phone.
- **Code review checklist includes**: "does this new list have a stable key, memoized row, and appropriate `getItemLayout`?" and "does this new `useEffect` with a subscription/timer have a cleanup?" - the two highest-yield, cheapest-to-catch review items in RN.
- **Every performance PR requires a before/after measurement in the description** (screenshot of Perf Monitor, profiler trace, or a TTI number) - this is a lightweight but powerful team norm that prevents "should be faster" from shipping unverified.
- **Regressions get a lightweight guard**, even if just a comment ("this list must stay virtualized - do not wrap in ScrollView") near the risky code, since perf regressions are otherwise silent until a client complains.
- **Post-incident performance write-ups** (what was slow, how it was found, what fixed it) get added to a team knowledge base - this is exactly how a 20%->0.03% or 28%->0.15% crash-rate story becomes a repeatable team capability instead of one person's tribal knowledge.

### Tradeoffs table

| Choice | Pro | Con |
|---|---|---|
| Lower `windowSize` | Less memory/CPU | More blank-cell flicker on fast scroll |
| Higher `windowSize` | Smoother fast scroll | More memory held, worse on low-end devices |
| `removeClippedSubviews: true` | Real memory win on Android, especially long lists | Occasional rendering glitches with overlays/sticky headers - must test |
| FlashList over FlatList | Lower mount/unmount overhead on very large/high-churn lists | Extra dependency, `estimatedItemSize` tuning, less battle-tested in a risk-averse fintech context |
| Aggressive memoization everywhere | Prevents some real re-render costs | Adds comparison/bookkeeping overhead and cognitive load where the win doesn't exist |
| Deferring SDK init post-first-paint | Faster perceived TTI | Slightly delayed availability of that SDK's data/features immediately at launch |

### Harder follow-up interview questions (with model answers)

**Q: You fixed a jank issue by adding `React.memo` and the profiler shows fewer re-renders, but users still report the screen "feels slow." What do you check next?**

> "Fewer re-renders isn't the same as 'fast enough' - I'd check whether the remaining renders are still expensive (heavy computation inside the memoized component itself), whether the bottleneck actually moved to the UI thread now (native view complexity, image decode cost), or whether the real complaint is about something else entirely, like network latency perceived as UI slowness. I don't declare victory on one metric moving; I go back to Perf Monitor and re-isolate JS vs UI thread for the specific reported interaction."

**Q: How do you performance-test a screen before it ships, given you probably don't have every device tier in your test lab?**

> "I prioritize testing on at least one genuinely low-end/min-spec Android device, since that's where most real-world regressions surface first and iOS device fragmentation is far smaller. If I truly can't get physical device coverage, I use Android's CPU/memory throttling in the profiler to simulate a weaker device, but I treat that as a fallback, not a substitute - throttled emulators don't perfectly replicate real thermal throttling and memory pressure patterns."

**Q: A teammate wants to add `useMemo` to every derived value in a component 'to be safe.' How do you push back constructively?**

> "I'd explain that `useMemo` has a real cost - the dependency comparison and cache storage - and for cheap computations that cost can exceed just recomputing on every render. I'd ask them to point at a specific measured cost (via the profiler) before adding memoization, and frame it as 'memoize what's proven expensive,' not 'memoize everything defensively,' because the latter adds both runtime overhead and reviewer cognitive load without a proven benefit."

**Q: Startup time regressed by 400ms after a recent release, but no single commit looks obviously heavy. How do you find the cause?**

> "I'd bisect using the TTI instrumentation itself rather than reading diffs - run the same instrumented build across the commit range (or use whatever CI perf tracking exists) to find exactly which commit introduced the regression, since 400ms is rarely one obviously 'heavy' line and is more often a new dependency doing eager init, an added provider in the root tree, or a newly-serial network call. Once bisected, I'd look specifically at what changed in the startup path around that commit rather than guessing across the whole diff."

**Q: How would you explain to a non-technical stakeholder why 'just add more `useMemo`' isn't a real performance strategy?**

> "I'd frame it as: performance work is diagnosis before treatment, the same way a doctor wouldn't prescribe medication before finding out what's actually wrong. Sprinkling `useMemo` everywhere is like taking medicine for a symptom you haven't identified yet - it might do nothing, or occasionally make things worse, and it costs engineering time we could spend on the actual bottleneck once we've measured it."

**Q: What's a performance optimization you'd actively avoid doing even if it would technically help, and why?**

> "Migrating every list in the app to FlashList preemptively, without evidence that FlatList's mount/unmount overhead is the measured bottleneck for that specific list's size and update frequency. In a fintech app I favor fewer, well-understood, battle-tested dependencies over a broad preemptive migration - the operational and QA cost of a sweeping dependency change across every list screen isn't justified unless the data shows FlatList is actually the constraint for that particular screen."

### What I'd say in a staff/senior interview

> "If there's one meta-skill I'd want an interviewer to walk away remembering, it's 'measure, isolate, fix the single biggest offender, re-measure, guard against regression' - not any specific FlatList prop or Reanimated API. I've applied that exact loop to get crash rates down from 15-28% to under 0.2% across three different legacy codebases, and the fixes were rarely exotic - unmemoized list rows, uncleaned native listeners, oversized images loaded into memory, unbounded re-renders from Context. The technical knowledge (what `getItemLayout` does, how Reanimated's worklet model works, why Context isn't a prop for `memo`) matters because it tells you where to look and what tool to reach for, but the discipline of never shipping an unmeasured 'optimization' is what actually prevents a team from chasing ghosts or introducing a regression while trying to fix a different one."

---

## Mastery checklist

- [ ] I can diagnose JS-thread vs UI-thread bottlenecks using Perf Monitor/DevTools before touching code
- [ ] I can name the exact tradeoff of every major FlatList performance prop, not just its name
- [ ] I know when `memo`/`useMemo`/`useCallback` help and when they add overhead for nothing
- [ ] I can explain Reanimated's UI-thread worklet model vs `Animated`'s native driver
- [ ] I have a systematic memory-leak-hunting process (repro ? profiler ? effect cleanup audit)
- [ ] I can describe a concrete startup-time optimization I shipped
- [ ] I can tell the MyCreditInfo/Wizer/Online School crash-rate story with the specific technical root causes, not just the percentages
- [ ] I always frame answers as measure ? isolate ? fix ? re-measure
