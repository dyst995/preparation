# 01 — React Native Fundamentals

> Goal: Explain how React Native works under the hood, how UI is rendered, how threads interact, and how you debug day-to-day issues — at a depth that survives senior follow-ups.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Contrast React Native rendering with React DOM.
2. Explain the old Bridge architecture and its bottlenecks.
3. Explain New Architecture pieces: JSI, Fabric, Turbo Modules, Codegen.
4. Describe what runs on JS thread, UI/main thread, and native module threads.
5. Defend Hermes as a default choice with concrete benefits.
6. Write and justify platform-specific code correctly.
7. Reason about Flexbox/layout differences vs web CSS.
8. Tune lists and explain why virtualization matters.
9. Choose the right debugging tool for JS vs native vs production issues.

---

## 1. How React Native differs from React on the web

### Core idea

React (web) reconciles a virtual DOM and commits to the browser DOM (`div`, `span`, etc.).

React Native reconciles a React tree and commits to **native host views**:
- iOS: `UIView`, `UILabel`, `UIScrollView`, …
- Android: `View`, `TextView`, `ScrollView` / `RecyclerView`-backed lists, …

You still write React components, hooks, and JSX. The **host** is different.

### What this means in interviews

- There is no real browser DOM, no CSS cascade as on web, no `window`/`document` in the same way.
- Styling is mostly a constrained Flexbox + Yoga layout system, not full CSS.
- Navigation is not URL-first by default (unless you add linking).
- Many web libraries that touch DOM will not work; you need RN-compatible alternatives.

### Answer sketch

> “React Native uses React’s reconciliation, but instead of updating the DOM it updates native views through a renderer. Components like `View` and `Text` map to platform primitives. That’s why we get native look-and-feel and platform APIs, but we must think about the JS/native boundary, threading, and mobile constraints.”

---

## 2. The old Bridge architecture

### Topics to learn
- [ ] Asynchronous, serialized bridge
- [ ] JSON-like message batching between JS and native
- [ ] Why large/frequent crossings are expensive
- [ ] Why synchronous native calls were painful/limited
- [ ] Classic symptoms: laggy animations if driven from JS, bridge congestion

### How the bridge worked (mental model)

1. JS wants native work (e.g. create a view, call a native module).
2. The call is queued and sent across an asynchronous bridge.
3. Data is serialized (historically JSON-like), sent, deserialized on the other side.
4. Native does work, may send results back the same way.

### Problems

| Problem | Why it hurts |
|---|---|
| Serialization cost | Big objects / frequent messages = CPU + latency |
| Async-only by default | Hard to implement sync native reads cleanly |
| Congestion | Many events (scroll, gestures) can flood the bridge |
| Harder interop | Native modules felt “far away” from JS |

### Interview question

**Q: What is the bridge, and what problems does it cause?**

**Strong answer:**
> “The legacy bridge is an asynchronous communication channel between JS and native. Calls and data are serialized and batched across that boundary. It’s flexible, but serialization and asynchrony become bottlenecks for high-frequency updates, large payloads, and modern native interop. The New Architecture reduces that overhead with JSI and Turbo Modules.”

**Follow-ups to expect:**
- Can you give an example of bridge congestion?
- Did animations belong on the JS thread? (Prefer native driver / Reanimated UI thread work.)

---

## 3. New Architecture: JSI, Fabric, Turbo Modules, Codegen

### Topics to learn
- [ ] JSI (JavaScript Interface)
- [ ] Fabric renderer
- [ ] Turbo Modules
- [ ] Codegen (schema ? typed native bindings)
- [ ] Concurrent React features enabled by Fabric (high level)
- [ ] Migration reality: libraries must support new arch; dual support period

### JSI

JSI lets native code hold direct references to JS objects/functions via a C++ layer, instead of only talking through an async serialized bridge.

Implications:
- Native can call into JS more directly.
- Sync operations become more feasible where appropriate.
- Lower overhead for native module APIs.

### Fabric

Fabric is the new renderer:
- Better coordination between React commits and native UI mounting/updates.
- Designed to work with React’s concurrent model more cleanly.
- Improves prioritization and consistency of UI updates (interview-level: “more aligned with modern React rendering”).

### Turbo Modules

Turbo Modules are the new native module system:
- Lazy loading of modules (don’t pay init cost until used).
- Stronger typing via Codegen.
- More efficient invocation through JSI vs old bridge modules.

### Codegen

You define a typed spec (often TypeScript/Flow-ish schema). Codegen produces:
- Native interface stubs
- Type-safe bindings
- Less handwritten boilerplate and fewer mismatch bugs

### Practical interview framing (use your CV)

You listed **Turbo Modules**. Be ready to say:
- When you needed native performance or platform APIs unavailable in JS.
- That Turbo Modules are preferable for new native work on New Architecture.
- That legacy native modules may still exist during migration.

### Interview questions

**Q: Explain JSI, Fabric, and Turbo Modules simply.**

> “JSI is the low-level interface that lets native and JS talk more directly. Fabric is the new UI renderer that mounts/updates native views more efficiently and fits modern React better. Turbo Modules are the new native module system built on JSI — lazy, typed via Codegen, and cheaper to call than legacy bridge modules.”

**Q: Is New Architecture ‘just faster’?**

> “Performance is one outcome, but the deeper point is a better interop model: less serialization, lazy native modules, stronger typing, and a renderer designed for concurrent React. Real-world wins depend on app patterns and library support.”

---

## 4. Threads: JS, UI/main, native modules

### Topics to learn
- [ ] JS thread responsibilities
- [ ] UI / main thread responsibilities
- [ ] Native module background threads
- [ ] What “JS thread blocked” feels like in UX
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

> “React reconciliation and most app logic run on the JS thread. Native views layout and draw on the UI thread. If JS is blocked, React can’t process updates or events promptly — the app feels frozen even if the OS process is alive. That’s why we move heavy work off the critical path, virtualize lists, and keep high-frequency animations off the JS bridge where possible.”

**Q: Why can scroll still be smooth while JS is busy?**

> “Native scroll views can continue on the UI thread. But JS-driven reactions to scroll (e.g. JS listeners doing heavy work) can still jank.”

---

## 5. Hermes

### Topics to learn
- [ ] What Hermes is (JS engine optimized for RN)
- [ ] Bytecode ahead-of-time compilation benefits
- [ ] TTI (time to interactive) improvements
- [ ] Memory characteristics
- [ ] Debugging differences vs JSC (high level)
- [ ] When Hermes might not be the topic — it’s usually default now

### Why teams use Hermes

- Faster startup via optimized bytecode
- Often better memory use on mobile
- Engine tuned for RN workloads
- Better alignment with modern RN defaults

### Interview answer

> “Hermes is a JavaScript engine optimized for React Native. It compiles to bytecode and is tuned for mobile startup and memory constraints. In practice it usually improves TTI and resource usage versus older engine setups, which matters for production apps with cold-start expectations.”

**Follow-up:** What metrics do you check after enabling/upgrading Hermes?
> Startup time, ANRs/crashes, memory, and any native debugger tooling changes.

---

## 6. Metro bundler

### Topics to learn
- [ ] Metro’s role: bundle JS for RN
- [ ] Fast Refresh vs full reload
- [ ] Resolution of platform extensions
- [ ] Asset handling basics
- [ ] Dev bundle vs release bundle
- [ ] Common issues: cache, monorepo resolution, symlinks

### Key ideas

- Metro transforms and bundles your JS/TS for the app.
- In dev, it serves bundles and supports Fast Refresh.
- In release, JS is packaged into the binary (and Hermes bytecode when enabled).
- Module resolution understands `.ios.js`, `.android.js`, `.native.js`, etc.

### Interview question

**Q: What does Metro do?**

> “Metro is React Native’s bundler. It resolves modules, transforms JS/TS, handles platform-specific extensions, and serves or packages the bundle. In development it enables Fast Refresh; in production it creates the optimized bundle shipped inside the app.”

---

## 7. Components map to native views

### Topics to learn
- [ ] `View`, `Text`, `Image`, `ScrollView`, `TextInput`, `Pressable`/`Touchable*`
- [ ] Why nesting `Text` matters
- [ ] Why not every web concept maps 1:1
- [ ] Native base components vs third-party composites

### Practical points

- `View` ? container native view
- `Text` must wrap strings; styling text often needs `Text` nodes
- `ScrollView` renders all children (bad for long lists)
- `FlatList` virtualizes
- Prefer `Pressable` in modern codebases for flexible press handling

---

## 8. Platform-specific code

### Topics to learn
- [ ] `Platform.OS`, `Platform.select`
- [ ] File extensions: `.ios.tsx`, `.android.tsx`, `.native.tsx`
- [ ] When to split files vs inline selects
- [ ] Avoiding “platform soup” scattered everywhere

### Decision guide

| Approach | Use when |
|---|---|
| `Platform.select` | Small style/value differences |
| `Platform.OS` conditionals | Small behavioral branches |
| Separate platform files | Different structure, native APIs, or large divergence |
| Native module | Capability doesn’t exist in JS |

### Interview question

**Q: Platform.OS vs separate files?**

> “I use `Platform.select` for small differences like padding or shadow styles. If the screen structure, native API usage, or logic diverges substantially, I split `.ios` / `.android` files so each platform stays readable and testable. I avoid scattering platform checks across business logic.”

---

## 9. StyleSheet & Flexbox (RN vs web)

### Topics to learn
- [ ] Yoga layout engine basics
- [ ] Default `flexDirection: 'column'` in RN (vs row on web in many CSS resets — know RN default)
- [ ] No cascading CSS; styles are JS objects
- [ ] Density / pixel ideas (`PixelRatio`) at high level
- [ ] Shadows differ iOS vs Android
- [ ] `StyleSheet.create` benefits (some validation + referential stability)
- [ ] Absolute positioning and safe areas

### Important differences to memorize

1. **Default flex direction** in RN is `column`.
2. **No CSS cascade / selectors** — you compose style arrays.
3. **Subset of CSS-like properties**, not full CSS.
4. **Units** are density-independent pixels conceptually (not `px`/`rem` like web).
5. **Inheritance** is limited; text styles often need to live on `Text`.

### Interview question

**Q: How does Flexbox differ in RN?**

> “RN uses Flexbox via Yoga, but defaults differ — notably `flexDirection` defaults to column. There’s no CSS cascade; styles are explicit objects/arrays. Only a subset of CSS concepts exist, and platform-specific styling (especially shadows and fonts) still matters. I treat layout as mobile-first Flexbox, not web CSS.”

---

## 10. Lists: FlatList, SectionList, FlashList

### Topics to learn
- [ ] Why `ScrollView` + `.map` fails for large data
- [ ] Windowing / virtualization concept
- [ ] `keyExtractor` stability
- [ ] `renderItem` purity and memoization
- [ ] `getItemLayout` when rows are fixed height
- [ ] `windowSize`, `maxToRenderPerBatch`, `initialNumToRender`, `removeClippedSubviews`
- [ ] `SectionList` for grouped data
- [ ] FlashList (Shopify) as a common performance upgrade — awareness
- [ ] Avoiding inline anonymous `renderItem` recreating everything carelessly (balance with readability)

### Core interview answer for list performance

> “Use a virtualized list so only visible rows (plus a window) mount. Keep `renderItem` light, stable keys, avoid heavy anonymous props where they force re-renders, use fixed-height optimizations when possible, and profile before micro-optimizing. For very large lists, consider FlashList.”

### Common list bugs

- Unstable keys ? state reuse bugs / jank
- Putting huge trees inside each row
- Fetching images at full resolution in every cell
- Anonymous object/style props breaking memoization
- Nested `VirtualizedList` warnings (list inside scroll/list)

---

## 11. Images, fonts, assets, icons, splash

### Topics to learn
- [ ] Local `require()` assets vs remote URLs
- [ ] Image size / resize modes
- [ ] Caching behavior (high level)
- [ ] Custom fonts linking / modern RN asset config
- [ ] App icon & splash screen responsibilities (platform configs)
- [ ] Avoiding layout jumps when images load

### Interview-ready points

- Ship correct resolutions where relevant; don’t download 4000px images into 40px avatars.
- Know `resizeMode`: `cover`, `contain`, `stretch`, `center`.
- Fonts must be registered properly or you get silent fallbacks.
- Splash/icon issues are often native project config, not JS.

---

## 12. Debugging toolkit

### Topics to learn
- [ ] LogBox / console
- [ ] React DevTools (component tree, props, hooks)
- [ ] React Native DevTools (modern direction)
- [ ] Flipper legacy awareness (many teams moved on)
- [ ] Native debugging: Android Studio / Logcat, Xcode / Console
- [ ] Crashlytics for production
- [ ] Reproducing release-only issues (`--variant release`, TestFlight, internal track)

### Matching tool ? problem

| Problem | Start here |
|---|---|
| Wrong UI / props / re-renders | React DevTools |
| JS exceptions in dev | LogBox / RN DevTools |
| Android native crash | Logcat + Crashlytics stack |
| iOS native crash | Xcode device logs + symbolicated Crashlytics |
| Perf FPS / JS lag | Perf monitor + list profiling + why-did-you-render (carefully) |
| Prod-only bug | Release build, staging env parity, feature flags, Crashlytics breadcrumbs |

### Interview question

**Q: How do you debug a production-only crash?**

> “First classify JS vs native from the stack. Reproduce on a release build with matching app version. Use Crashlytics breadcrumbs/logs, device/OS segmentation, and recent release diffs. If native, symbolicate and open the relevant Android/iOS project. If JS, trace the feature path, add guarded logging if needed, and verify whether it’s data-dependent, racey, or upgrade-related. Ship via staged rollout when possible.”

---

## Full interview question bank (with answer targets)

### Rendering & architecture

1. **How does RN render UI vs React web?** ? host views, not DOM.
2. **What is the bridge?** ? async serialized JS?native channel; bottlenecks.
3. **What is JSI?** ? direct-ish JS?native interop layer.
4. **What is Fabric?** ? new renderer aligned with modern React.
5. **What are Turbo Modules?** ? modern native modules: lazy, typed, JSI-based.
6. **What is Codegen for?** ? generate typed native bindings from specs.

### Threads & engines

7. **JS vs UI thread responsibilities?**
8. **Symptoms of a blocked JS thread?**
9. **Why Hermes?**
10. **What does Metro do?**

### Practical app fundamentals

11. **When platform files vs `Platform.select`?**
12. **RN Flexbox vs web CSS key differences?**
13. **ScrollView vs FlatList?**
14. **Top FlatList optimizations?**
15. **How do you investigate re-render churn?**
16. **Dev vs production debugging approach?**

---

## Hands-on drills (do these)

- [ ] Draw the old bridge architecture on paper; then draw New Architecture (JSI/Fabric/Turbo Modules).
- [ ] Explain out loud for 3 minutes with no notes.
- [ ] Take a screen that maps an array inside `ScrollView` and convert it to `FlatList`.
- [ ] Intentionally block the JS thread (`while` loop) and observe UX; then fix it.
- [ ] Create a tiny platform split component (`.ios` / `.android`) and one `Platform.select` style example.
- [ ] Open a release build and find one crash stack in Crashlytics (if you have access) and classify JS vs native.

---

## Senior red flags / green flags

### Green flags interviewers love
- You separate “React knowledge” from “RN host/runtime knowledge”
- You can discuss bridge limitations without meme-level vagueness
- You relate Turbo Modules to real native work you’ve done
- You debug with a system: classify ? reproduce ? tool ? fix ? prevent

### Red flags
- “RN is just a WebView”
- “New Architecture is only Fabric”
- “Hermes makes everything faster” with no mechanism
- Blaming all jank on “RN is slow” without measurement

---

## Tie-backs to your experience (use in answers)

- Modernizing legacy apps (MyCreditInfo, Wizer, Online School) required understanding fundamentals deeply — architecture, threading, and native boundaries — not just screens.
- Crash rate reductions required distinguishing JS bugs from native crashes and release-only issues.
- Turbo Modules / native Android–iOS integrations prove you don’t stop at pure JS RN.

---

## Mastery checklist

- [ ] I can teach Bridge vs New Architecture to another engineer in 10 minutes
- [ ] I can diagnose “JS thread busy” vs “UI thread busy” from symptoms
- [ ] I can justify Hermes and Metro’s roles clearly
- [ ] I can implement platform-specific UI the clean way
- [ ] I can explain list virtualization and tune a FlatList
- [ ] I have a production debugging playbook memorized
