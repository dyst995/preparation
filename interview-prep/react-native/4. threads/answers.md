# Threads: JS, UI/main, native modules — Answers

## Core recall

1. **JS:** React + most app JS. **UI/main:** native layout, draw, native gestures. **Native module threads:** optional background I/O/compute **if implemented that way**.
2. **No.** Implementation-defined; sync-on-JS or sync-on-main is common enough to ask.
3. Any four: static-looking UI / dead taps / stuttery JS navigation / late timers/`setState` / lists not updating.
4. Any three: huge `JSON.parse`, long sync loops, expensive huge-tree renders, JS image processing, unbounded startup work.
5. **Yes.** The **JS thread** (React/handlers) is stuck; native process can still draw the last tree / run native scroll.
6. **Scroll recognition and compositing** run on the **UI thread**, not the JS call stack.
7. **JS-driven** scroll reactions: `onScroll`, `setState`, JS parallax, JS animations.
8. **UI thread** — native driver / Reanimated UI runtime, not per-frame JS.

## Explain why

1. `async` yields at `await`, not around CPU. A loop still **occupies the one JS stack**.
2. Press handling for JS components **queues work on JS**. If JS is busy, the callback **doesn’t run**. Pixels can be old native frames.
3. Native pan doesn’t need JS. JS can be **dead** while UI FPS for scroll looks fine.
4. **Layout/draw** on main can drop **UI** frames independently of React.
5. JS **waits** for native to return — the JS stack isn’t free. Same UX as a JS loop.
6. That’s **JS CPU**, not message-queue volume. Bridge congestion is **chatty crossings**; parse is **local JS time**.

## Compare and contrast

1. **JS blocked:** React/taps/timers. **UI busy:** native scroll/animation stutters too.
2. **JS blocked:** no JS time. **Congestion:** too many/too fat JS↔native messages (often **with** JS work on each event).
3. **Native-driven:** UI thread updates views. **`setState`:** every frame needs **JS**.
4. **Background thread:** JS free during I/O. **JSI sync:** JS **blocked** for the whole native body.
5. **ANR:** Android **main** thread not pumping. **JS stall:** Hermes busy; may not be an ANR. **JS exception:** crash/redbox, different from a busy loop.
6. **JS** is one stack. RN **also** has UI (and maybe module) threads. The slogan hides the UI thread.

## Predict the output

1. **JS Pressable:** dead/late for ~3s. **Scroll:** can still **fling** (UI thread). Explain: loop holds JS; native scroll doesn’t need it.
2. **Smooth:** native scroll. **Hitchy:** anything from `onScroll`/`setState`. JS busy; UI mostly scrolling.
3. **App feels frozen** (taps/React) until decode returns — **JS blocked** by sync JSI.
4. **During I/O:** JS can render. **Hitch:** when the **callback** hits JS with a huge payload or a big `setState`.

## Debugging

1. **JS thread blocked** (or JS not processing events). Native scroll working is a **clue**, not a contradiction.
2. **UI/main thread** — native layout/draw or main-thread native work.
3. Memo doesn’t run until **after** parse. **Shrink/defer/offload parse**; then render cost.
4. Move the animation to **native driver / Reanimated (UI thread)**; stop per-frame `setState`.

## Application

1. JS → React/logic; UI → layout/draw/native gestures; module threads → optional native async.
2. Don’t parse giant JSON on first paint; defer; smaller payloads; virtualize list; don’t decode images in JS on startup.
3. RN’s **host views** layout/draw on the **platform main thread**; JS is a **second** thread that **describes** UI. Web has compositor too, but RN interviews expect this split by name.
4. Don’t do heavy work every tick — throttle/coalesce or keep the hot path native.

## Interview questions

1. **Spoken:** React + app JS on JS thread; layout/draw on UI thread. JS blocked → React/events stall; process can still be alive. Move heavy work off the path, virtualize lists, keep high-frequency animation off JS/Bridge.  
   **Follow-ups:** Native scroll on UI thread; JS listeners still jank. Isolate JS FPS vs UI FPS; don’t guess “RN is slow.”

2. **Spoken:** Native driver / Reanimated / native gesture handler; no per-frame JS `setState`; coalesce scroll events.

3. **Spoken:** No. JSI sync still **is** JS time. Threads still exist.

4. **Spoken:** Congestion = queue/chatter. JS blocked = CPU/sync on JS (parse, render, sync JSI). Can happen together (`onScroll` both).

5. **Spoken:** JS FPS = can React/JS keep up. UI FPS = can native draw/scroll keep up. They can diverge.

## Connections

1. Native views are **not** JS objects; a **platform thread** must layout/paint them.
2. JS **prepares** work; Bridge/JSI **crosses**; **UI thread** applies/draws. Module threads optional for native I/O.
3. Virtualization means **fewer components to render** on JS per frame — protects **JS**, not a substitute for UI-thread layout cost of a huge native tree.
4. Sync-on-JS or sync-on-main turns “native” into a **thread bug**.
5. Once you can **name** JS vs UI vs chatter, the next step is **FPS overlay + profiler** — performance chapter.
