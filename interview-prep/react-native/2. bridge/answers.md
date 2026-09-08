# The old Bridge architecture — Answers

## Core recall

1. An **asynchronous serialized message channel** between the JS runtime and native code. Calls and data are queued/batched, copied across, then dispatched to modules/UI.
2. **Async:** results are not on the next JS line. **Serialize:** copy to a bridge-friendly payload (JSON-like historically). **Batch:** many messages grouped to cut round-trips (can delay a single item).
3. **No.** Bridge is **transport**. Native Modules are **endpoints** that send/receive those messages.
4. JS values are not native objects; the old architecture does not share them by pointer. You **encode a copy**.
5. **Large payloads** and **high-frequency** messages (scroll/gestures/JS-per-frame styles). Also base64 blobs, chatty emitters.
6. A true sync wait **blocks JS** on a queue designed for async messages — awkward and limited. “Read native now in the same tick” doesn’t fit.
7. The **MessageQueue** (and JS/native packing) is overloaded by too many or too fat crossings.
8. **Native / UI thread** (native driver, Reanimated) — **not** per-frame JS → Bridge → style updates.

## Explain why

1. JS and native are **different runtimes**. There is no in-process `div.appendChild`. You need a **channel** to ask native to mount views and run modules.
2. **Help:** fewer round-trips. **Hurt:** a call can wait in the batch; latency isn’t “immediate native.”
3. Each frame **serializes** a UI command. That’s congestion + JS work. Native-driven animation updates views **without** that per-frame JS crossing.
4. **Scroll** can run on the **UI thread**. **JS** still processes events/setState over the Bridge — hitchy reactions, smooth pan.
5. You **copy megabytes twice** (and hold them in JS). Native already could use a **path/URI**.
6. Async is the **shape** of the API. A **small occasional** command is fine. Pain is **volume, size, and pretending it’s a local call**.

## Compare and contrast

1. **Transport vs API.** Modules use the Bridge; they are not the Bridge.
2. **Congestion:** message volume/size. **JS blocked:** React/timers/taps stall because the **JS thread** is busy (even with a quiet queue).
3. **Native-driven:** UI thread owns the animation. **JS-driven:** every tick crosses the Bridge.
4. **Command:** one serialize, acceptable. **Per-tick:** queue flood.
5. **Bridge:** serialize + async + often eager modules. **JSI/Turbo:** more direct calls, less copy tax, lazy modules, possible sync where appropriate.
6. **CPU copying** vs **programming model** (callbacks, no local getters, modules feel remote). Both are “the boundary.”

## Predict the output

1. **Native has not necessarily run yet.** The setter/get is **async**. The next line still sees old JS state. Use the Promise/callback.
2. **Scroll physics:** often OK (native). **JS UI** bound to every `onScroll` **hitches** (serialize + setState + render).
3. **Bridge + JS + UI updates** chatty. Frames drop because you’re doing per-frame **crossings**, not because “UIView can’t animate.”
4. **Serialize/deserialize ~5MB twice**, JS heap spike, likely jank/GC. Use a native URI / shared native buffer instead.

## Debugging

1. **Congestion + JS work on a hot native event.** Throttle/coalesce, don’t `setState` every tick, move work off the scroll path, native-driven gestures. Don’t start with random `memo`.
2. **JS thread blocked** (render, parse, loop). Bridge congestion usually still lets some native motion continue; total tap-death is often JS.
3. Enable **`useNativeDriver`** (if the property supports it) or Reanimated UI-thread work so frames aren’t Bridge messages.
4. Legacy modules often **init eagerly**. Unused modules still cost startup. **Turbo Modules lazy load** is the New Arch answer (plus deferring work yourself).

## Application

1. JS invoke → serialize payload → queue/batch → native dispatch → async result/events serialized back to JS.
2. Coalesce events on native side; throttle JS listeners; native driver/Reanimated; send IDs not blobs; don’t listen to raw high-frequency sensors in JS.
3. “Don’t round-trip file bytes through JS — pass a native URI / let native read the file.”
4. The Bridge’s **copy + async + eager modules** became bottlenecks; Turbo Modules (JSI, typed, lazy) exist to **change that model**, not to rename NativeModules.

## Interview questions

1. **Spoken:** Legacy Bridge = async serialized batched channel JS ↔ native. Flexible, but costly for high-frequency updates, large payloads, and tight interop. New Architecture uses JSI and Turbo Modules to cut that tax.  
   **Follow-ups:** Scroll/gesture/JS animation congestion. Animations: native driver / UI thread, not per-frame JS Bridge writes.

2. **Spoken:** Different heaps/runtimes; you must encode a copy so native can read arguments and JS can read results.

3. **Spoken:** Channel is async messages. Sync wait blocks JS and fights the queue. JSI can do sync **carefully**; heavy sync still blocks JS.

4. **Spoken:** JS blocked: React/taps/timers stall globally. Congestion: often native scroll still works; JS-driven reactions and chatty modules hitch. Profile **which** thread and **message volume**.

5. **Spoken:** Production is mixed — legacy modules and interop remain. Interviewers check that you know **why** the new model exists, not only the new names.

## Connections

1. Host views live in **native**. Old RN had to **message** that world; that channel is the Bridge.
2. Name the layer: JS busy vs **queue** overloaded vs **UI** drawing. Same “jank,” different fix.
3. **Serialize-everything**, **async-only**, **eager modules** — JSI/Turbo/Fabric attack those (and renderer alignment), not “JSON but faster” only.
4. If every scan/event is a Bridge message into JS, you **flood** the queue. Coalesce native-side or use a tighter (JSI) path.
5. **No.** Interop and old libraries still exist. Seniors debug **hybrid** boundaries.
