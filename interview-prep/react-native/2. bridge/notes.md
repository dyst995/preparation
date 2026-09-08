# The old Bridge architecture

## What you need to know

The **legacy Bridge** is React Native’s original **asynchronous, serialized message channel** between the **JS runtime** and **native code**. JS cannot call `UIView` / Android `View` like a local function. It **queues messages**, they are **batched**, **serialized** (historically JSON-like), sent across the boundary, **deserialized**, then native runs the work. Results and events come **back the same way**.

It made RN portable (one JS bundle, two platforms). The **physics of the boundary** — copy cost, asynchrony, queue congestion — became the reason for **JSI / Turbo Modules / Fabric**.

This unit is the **old transport**. Prerequisite: [host vs DOM](../1.%20rn-vs-web/notes.md) (commit hits native views). Threads (JS vs UI) get their own section; here you only need: **JS prepares messages; native executes; neither is a free function call.** Full chapter: [15-bridge.md](../15-bridge.md). New Architecture is the **next** unit, not this one.

Curriculum this unit completes:

- Async serialized Bridge + batching
- Why large / frequent crossings are expensive
- Why sync native reads were painful
- Congestion and JS-driven animation symptoms
- Bridge = transport; legacy Native Modules = endpoints

---

## Mental model (draw this)

```text
JS thread (React + app JS)
        |  enqueue call / UI command / listen for events
        v
   Bridge (serialize, batch, MessageQueue)
        |  bytes / JSON-like payload
        v
Native (modules, UI manager)
        |  work on UI thread or native module threads
        v
   Bridge (serialize results / events back)
        v
JS thread (callbacks, setState, events)
```

Typical crossing:

1. JS wants native work (create a view, `NativeModules.Foo.bar()`, schedule a style update).
2. Arguments are turned into a **bridge-friendly payload**.
3. Messages **queue** and are often **batched** (fewer round-trips; individual items can wait in the batch).
4. Native dispatches to the **UI manager** or a **native module**.
5. Callbacks, promises, and **event emitters** return **asynchronously**. JS must not assume the native world has already changed on the next line.

**Bridge = transport.** Legacy Native Modules (`RCTBridgeModule`, `ReactContextBaseJavaModule`) are **APIs on the native side** that *use* that transport. Don’t say “the Bridge is a native module.”

---

## Serialization and batching

**Why serialize:** JS objects are not native objects. You cannot pass a JS array into Kotlin by pointer on the old architecture. The Bridge **copies** a representation both ways.

**What gets expensive:**

| Pattern | Why it hurts |
| --- | --- |
| Large objects / maps every call | CPU + memory on **both** sides, every time |
| High-frequency messages (scroll ticks, gestures, sensors) | Queue fills; JS and native spend time packing/unpacking, not “doing the feature” |
| Huge blobs (base64 files through a module) | Worst of both: fat payload + copies |
| JS-driven style updates every frame | Constant UI commands over the Bridge |

**Batching** exists to avoid one kernel-ish round-trip per tiny call. Tradeoff: a message can **sit in the batch** so latency is not “one call = one immediate native run.”

Senior heuristic: cross the Bridge for **commands and small results**, not for **high-frequency streams of bulky data**.

```js
// Congestion-shaped: every scroll tick → JS → maybe native again
function onScroll(e) {
  heavyWork(e.nativeEvent.contentOffset.y);
}

// Better direction: fewer events, or keep the hot path native
// (throttle/coalesce, or Reanimated / native driver — later tools)
```

Passing a **file URI** (native already has the file) beats **base64 of the whole file** through JS.

---

## Asynchronous by default — why sync calls hurt

The Bridge was designed as **async messages**. A **true synchronous** native read (“block JS until native returns a number”) **fights that model**: you’d stall the JS thread waiting on the queue and the other side.

Practical consequences:

- You cannot treat `NativeModules.Camera.getSize()` like a cheap local getter. It’s **later**, via Promise/callback.
- “Read layout **now** and branch in the same render” was **awkward**. Layout lives on the **native** side; JS finds out **after** a round trip (`onLayout`, measure callbacks).
- Failures can arrive **late**. Logs on JS and native are **time-shifted**.

This is why the New Architecture’s **JSI** (direct-ish references, possible **sync** methods on Turbo Modules) is a **model change**, not a 10% faster JSON parser. Sync on JSI can still **block the JS thread** if the native work is heavy — use it for **small reads**, not “decode a 20MB image on JS’s stack.”

---

## Congestion vs “RN is slow”

**Bridge congestion:** too many / too fat messages on the queue (often **plus** JS doing work on every event).

Classic symptoms from the outline:

- **Laggy animations** if **driven from JS** (every frame: JS computes → serialize style → native apply). Prefer **native driver** / **Reanimated** work on the UI thread so the animation does not need per-frame Bridge traffic.
- **Scroll still moves** (native scroll view on the UI thread) but **JS reactions hitch** (parallax, JS listeners, setState every tick).
- Gestures that **flood** events into JS.

Different from:

| Feeling | More likely |
| --- | --- |
| Taps dead, React not updating, timers late | **JS thread** blocked (huge render, JSON.parse, `while`) |
| Scroll OK, JS-driven overlay janks | Native scroll OK; **Bridge + JS** overloaded |
| Dropped frames from JS style thrash | Bridge + UI updates |
| Native crash, JS “fine” until the next call | Native module bug, not “the Bridge broke JSON” |

Do not diagnose congestion by only wrapping components in `React.memo` while still blasting **every scroll event** into JS.

---

## What it felt like to write native modules

On the old architecture, modules felt **far away**:

- Eager init cost (startup tax if many modules register).
- Everything looks like **messages**, not in-process calls.
- Types were easy to get wrong (untyped payloads).

That motivates **Turbo Modules** (lazy, Codegen-typed, JSI invocation) — next unit. This unit: **why** they exist.

Interop during migration: production apps often still have **legacy modules** or an **interop** path. Bridge knowledge is not trivia.

---

## Common mistakes and misconceptions

- **“The Bridge is Fabric / is Turbo Modules.”** Those are New Architecture replacements for renderer / modules. The Bridge is the **legacy channel**.
- **“Async means slow.”** Async is the **model**. Pain is **copy + frequency + queue**, not the word async.
- **“Batching always makes things faster.”** It reduces round-trips; it can **delay** a single call.
- **“Native scroll jank means the Bridge.”** Native scroll can be fine while JS/bridge is the hitch.
- **“Memoization fixes congestion.”** If the problem is **message volume**, cut **events and payload size** (or go native-driven).
- **“New Architecture means I can forget the Bridge.”** Mixed apps still hit legacy paths; interviewers start here to see if you know **why** JSI exists.

---

## Connections to other concepts

`JS wants host work → Bridge copies/queues → native views/modules → async back`

- **[RN vs web](../1.%20rn-vs-web/notes.md):** web commit is in-process DOM APIs; RN commit **crosses** this channel (legacy).
- **Threads** (section 4 of `01-fundamentals.md`): congestion ≠ JS blocked ≠ UI thread jank.
- **New Architecture** (next section): JSI/Turbo Modules/Fabric **change the model** (less serialize-everything, possible sync, lazy modules).
- **Animations / Reanimated:** keep per-frame work **off** the Bridge.
- CV: Turbo Modules on your resume are the **evolution from** these bottlenecks; hardware events (e.g. DataWedge) must not **naively flood** JS.

---

## Interview perspective

You should be able to:

1. Draw JS ↔ serialize/batch ↔ native in 30 seconds.
2. Name **async + serialize + batch** as the three load-bearing words.
3. Give a **congestion** example (scroll/gesture/JS animation).
4. Say where **animations** should live (native driver / UI thread, not per-frame JS Bridge writes).
5. Open **JSI/Turbo Modules** as the response to these physics — without reciting Codegen unless asked.

Preserved spoken answer:

> The legacy bridge is an asynchronous communication channel between JS and native. Calls and data are serialized and batched across that boundary. It’s flexible, but serialization and asynchrony become bottlenecks for high-frequency updates, large payloads, and modern native interop. The New Architecture reduces that overhead with JSI and Turbo Modules.

Congestion example:

> A screen listens to raw scroll events in JS and does heavy work each tick — serialization and JS execution compound. The list can still scroll at the OS level while interactions hitch. Fix by reducing event frequency, moving work, or using native-driven gestures/animations.

Animations follow-up: **Do not** drive high-frequency style updates from JS across the Bridge. **Native driver / Reanimated** keep the animation on the UI side.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
