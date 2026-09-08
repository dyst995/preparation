# Threads: JS, UI/main, native modules

## What you need to know

React Native is **not** “one thread that paints the app.” Interview diagnosis starts by naming **which thread is busy**:

| Thread | Typical work |
| --- | --- |
| **JS thread** | React render/reconciliation, most app JS, `setState`, timers, most event handlers written in JS |
| **UI / main thread** | Native **layout**, **drawing**, **native** gesture recognition, platform chrome (keyboard, status bar) |
| **Native module threads** | Native **async** I/O / heavy compute **if the module implementation offloads** — not guaranteed |

If **JS is blocked**, React cannot process updates or JS events promptly. The **OS process can still be alive**. Native scroll may still move. The app **feels frozen** for taps, navigation, lists driven by React.

This unit is **what runs where + how it feels**. Prerequisite: [host vs web](../1.%20rn-vs-web/notes.md), [Bridge](../2.%20bridge/notes.md), [New Architecture](../3.%20new-architecture/notes.md) (JSI **sync still occupies JS**). Deep profiling: [06-performance.md](../06-performance.md).

Curriculum this unit completes:

- JS vs UI vs native-module threads
- UX of a blocked JS thread
- Common JS blockers
- Why native scroll can stay smooth
- Gestures/animations that avoid JS
- Congestion vs JS-blocked vs UI-thread jank (names, not a profiler course)

---

## The JS thread

**What it is:** the thread that runs the **JS engine** (often Hermes). One JS call stack — **one piece of JS at a time** (same single-threaded JS model as the browser).

It runs:

- Component functions, reconciliation, most business logic
- `useEffect` / Promise callbacks / `setTimeout` (when the engine is free)
- JS-side of native **events** (`onPress` if handled in JS, `onScroll` listeners)

**Blocked** means that stack is busy with **synchronous** work: a long loop, `JSON.parse` of a huge payload, a giant render, image decode in JS, **sync JSI** that waits on native.

```js
// Blocks JS until finished — React cannot commit, timers wait
JSON.parse(hugeString);
for (let i = 0; i < 1e8; i++) {}

// Does NOT magically use another JS thread:
await fetch(url); // JS yields; native/network work elsewhere; then a callback occupies JS again
```

`async/await` **does not** move CPU work off JS. It only **yields** at awaits. A tight loop inside an `async` function still **blocks**.

---

## The UI / main thread

**What it is:** the platform **main thread** (iOS main / Android main). It **lays out and draws** native views and runs **native** gesture/scroll recognition.

If **this** thread is busy (huge view hierarchy, layout thrash, **synchronous native** work on main), **even native scroll and native-driven animations stutter**. That is a **different** bug from “JS FPS is zero.”

Android **ANR** (app not responding) is often **main-thread** blocking in native — not the same dashboard as a JS exception.

---

## Native module threads

Native modules **may** do work on a **background** thread (disk, network, crypto) and then hop back to JS or UI.

**Depending on implementation.** A sloppy module that does heavy work **synchronously on JS** (JSI sync) or **on the UI thread** will **not** save you. “We have a native module” ≠ “it runs off the critical path.”

---

## What “JS thread blocked” feels like

Preserved symptoms:

- UI may still show **static** frames (last committed native tree)
- **Taps feel dead** (JS never runs the handler)
- Navigation transitions **stutter** (JS-driven navigation work delayed)
- Timers / `setState` **late**
- Lists **stop updating** (no new React commits)

The user may still **see** a native `ScrollView` moving. That is **not** proof JS is healthy.

Common blockers (preserve):

- Heavy **JSON.parse** on JS
- Large **synchronous loops**
- Expensive **re-renders** of huge trees
- **Image processing in JS**
- Unbounded work on the **startup** path

```js
// Startup: parse a 8MB config on first screen — TTI death
useEffect(() => {
  const data = JSON.parse(giantBundle); // JS blocked during launch
  setRows(data);
}, []);
```

Fix **direction**: move parse off the critical path (smaller payloads, native parse, deferred work, virtualize lists so render stays cheap). Don’t “add `memo`” as the first move if the cost is **JSON.parse**.

---

## Why scroll can be smooth while JS is busy

**Native scroll views** (and many native gestures) run on the **UI thread**. They do not need JS to **advance the pan** every frame.

**JS-driven reactions** to scroll still need JS: `onScroll` → `setState` → re-render, JS parallax, Bridge/JSI traffic. Those **hitch** while the list **physically scrolls**.

Same split for animations: **native driver / Reanimated (UI runtime)** vs **`setState` every frame**.

---

## Gestures and animations that avoid JS bottlenecks

Strategies (interview, not a Reanimated tutorial):

- **Native driver** / **Reanimated** work that updates views on the **UI** side so per-frame work **does not occupy JS** (and does not flood the [Bridge](../2.%20bridge/notes.md)).
- **Don’t** attach heavy JS `onScroll` / `onGesture` work every tick.
- **Gesture Handler** native recognition vs JS `PanResponder` on a hot path.

If JS **must** react, **coalesce** (throttled offset, “scroll ended”) instead of every pixel.

---

## Three jank names (don’t mix them)

| Symptom pattern | Likely layer |
| --- | --- |
| Taps dead, React stuck, timers late; maybe native scroll still moves | **JS thread** busy |
| Native scroll/animation stutters even with quiet JS | **UI thread** (layout, fat native tree, main-thread native call) |
| Scroll OK, JS overlay/listeners hitch; lots of native events | **JS + Bridge/JSI chatter** (congestion + JS work) |

Perf Monitor’s **JS FPS vs UI FPS** (performance chapter) is how you **confirm**, not guess. This unit: **name the layer from symptoms first**.

---

## Common mistakes and misconceptions

- **“The app is frozen so the process is dead.”** JS can be stuck while native still draws the last frame / still scrolls.
- **“Smooth scroll means JS is fine.”** Opposite often true.
- **“async/await moves work off JS.”** Only at await points; CPU still JS.
- **“Native module ⇒ background thread.”** Implementation-defined.
- **“JSI fixed threads.”** Sync JSI **blocks JS** until native returns.
- **“Memo fixes blocked JS.”** If the block is `JSON.parse` or a `while`, memo doesn’t run.
- **“RN is single-threaded.”** **JS** is single-threaded; **UI** is another thread. That’s the whole point.

---

## Connections to other concepts

`JS (React) ↔ (Bridge/JSI) ↔ UI thread (views) ; native modules may use extra threads`

- **[RN vs web](../1.%20rn-vs-web/notes.md):** web also has a JS thread vs browser compositor, but RN’s **host** is native UI thread + explicit module threads.
- **[Bridge](../2.%20bridge/notes.md):** congestion is **message volume**; JS blocked is **no JS time left**. Both can coexist.
- **[New Architecture](../3.%20new-architecture/notes.md):** JSI sync is still **JS-thread** time.
- **Lists** (later in this chapter): virtualization cuts **JS render** cost so the JS thread stays free.
- **Hermes:** engine on the **JS** thread; GC pauses can **feel** like JS stalls.

---

## Interview perspective

You should be able to:

1. Fill the three-row table from memory.
2. List JS-blocked **symptoms** and **blockers**.
3. Explain **smooth native scroll + dead taps**.
4. Say where **animations/gestures** should run to spare JS.
5. Not call every hitch “the Bridge” or “RN is slow.”

Preserved spoken answers:

> React reconciliation and most app logic run on the JS thread. Native views layout and draw on the UI thread. If JS is blocked, React can’t process updates or events promptly — the app feels frozen even if the OS process is alive. That’s why we move heavy work off the critical path, virtualize lists, and keep high-frequency animations off the JS bridge where possible.

> Native scroll views can continue on the UI thread. But JS-driven reactions to scroll (e.g. JS listeners doing heavy work) can still jank.

Add if they push: “I name the layer — JS vs UI vs chatty JS/native events — then profile JS FPS vs UI FPS. Native modules only help if the implementation actually leaves those threads.”

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
