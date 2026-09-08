# Debugging toolkit — Answers

## Core recall

1. Wrong UI → React DevTools; dev JS → LogBox/RN DevTools; Android native → Logcat+Crashlytics; iOS native → Xcode+symbolicated Crashlytics; perf → Perf Monitor + list/why-did-you-render carefully; prod-only → release + parity + flags + breadcrumbs.
2. **RN DevTools** is the **current** JS/Hermes debugger. **Flipper** is **legacy**; know it exists.
3. **DevTools:** tree/props/hooks/profiler. **LogBox:** **dev** JS exceptions overlay.
4. **Logcat** + **Crashlytics** (symbolicated/mapped).
5. Without **dSYM**, frames are **addresses**, not functions.
6. **Perf Monitor** (JS vs UI FPS), then profiler — not LogBox.
7. A **release** (or release-like) build, **same version**, right **env/flags**.
8. So production stacks are **human-readable**.

## Explain why

1. Wrong tool wastes hours (Instruments on a `useState` bug; DevTools on a `.so` abort).
2. Debug **isn’t** the shipped binary (R8, Hermes bytecode, `__DEV__`, APIs).
3. JS may run in **Chrome**, not Hermes-on-device — **timing and bugs differ**.
4. One OEM’s Android fork **hides** in the average.
5. It **hooks renders** and can **create** the jank you “found.”
6. Release **strips** the overlay; users see freeze/crash, not a redbox.

## Compare and contrast

1. **React DT:** React tree. **RN DT:** RN/Hermes debugger (modern). **LogBox:** dev exceptions.
2. **Legacy plugin host** vs **current** first-party direction.
3. **Live USB log** vs **fleet, versioned, symbolicated** reports.
4. **JS throw** vs **native abort** vs **main thread** not responding (Android).
5. Invariants, Metro, overlays vs **what customers run**.
6. **Which thread is hot** vs **which component** vs **native CPU/alloc**.

## Predict the output

1. **Native** (or native-in-vendor). Don’t start in React DevTools.
2. **JS.** Reproduce **release** of **that version**, feature path, flags, data.
3. Any two: R8 strip, Hermes-only, prod API, `__DEV__` hide, missing permission string, ProGuard.
4. **JS thread blocked** ([threads](../4.%20threads/notes.md)); Profiler / Hermes sample — not UI Instruments first.

## Debugging

1. “I can use Flipper if that’s the shop; **my default is RN DevTools + Crashlytics + native IDEs.** Classify first.”
2. **dSYMs** not uploaded / not matching the build.
3. **App version, OS, device/OEM, once vs always** — then matching **release** repro.
4. **Measured the wrong binary**; memo theater. Release + isolate thread first.

## Application

1. React DevTools; Logcat + Crashlytics.
2. Classify JS/native → matching **release** → breadcrumbs/segment/diff → symbolicate or JS path.
3. Breadcrumb for **prod** (last action, screen); `console.log` is **dev** and noisy in release.
4. Ship to **% of users** so the next crash is bounded.

## Interview questions

1. **Spoken:** Classify JS vs native; reproduce **release** + version; Crashlytics breadcrumbs + OS/device + diffs; native → symbolicate + IDE; JS → feature/data/race/upgrade; **staged rollout**.  
   **Follow-ups:** Stack frames. Debug isn’t prod. Flipper is legacy.

2. **Spoken:** UI → React DT. Android crash → Logcat/Crashlytics. Jank → Perf Monitor then profiler.

3. **Spoken:** Which screen/device/release? Perf Monitor JS vs UI; then Profiler or native; fix top offender; re-measure. (Performance chapter.)

4. **Spoken:** Segment Crashlytics; reproduce on **that** OEM/OS; OEM memory or permission quirks — not a generic JS guess.

5. **Spoken:** Crashlytics + breadcrumbs + release logging you **shipped**; Error Boundaries; no LogBox.

## Connections

1. JS FPS dead → JS tools; UI FPS dead → native/layout.
2. Maps **minified Hermes** back to `Foo.tsx`.
3. A `__DEV__`-only guard **hides** the bug until store.
4. Turbo/legacy module abort → **Logcat/Xcode**, not LogBox.
5. **dSYM + mapping** (and often source maps) on every release build.
