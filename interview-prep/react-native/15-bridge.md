# 15 - The React Native Bridge (Legacy Architecture)

> Goal: Explain the classic RN Bridge like a senior who has debugged bridge congestion, serialization cost, and migration to the New Architecture - not like someone who only memorized "async JSON bridge."

Your CV lists native Android/iOS integrations and Turbo Modules. Interviewers will often start with the Bridge so they can see whether you understand *why* Turbo Modules exist.

Mark progress with `[x]`.

---

## Learning objectives

1. Draw the Bridge architecture (JS thread <-> MessageQueue <-> Native modules / UI manager).
2. Explain serialization, batching, and asynchrony precisely.
3. Diagnose bridge congestion symptoms in production apps.
4. Contrast Bridge-era Native Modules with JSI/Turbo Modules.
5. Explain what still uses Bridge concepts during New Architecture migration (interop).
6. Tell a CV-ready story: when bridge limitations forced native/Turbo Module work.

---

## 1. What the Bridge is

### Topics to learn
- [ ] React Native's original JS-to-native communication channel
- [ ] MessageQueue / batched bridge calls
- [ ] Asynchronous by default
- [ ] Serialization of arguments and return values
- [ ] UI Manager commands traveling across the same conceptual boundary
- [ ] Native module method calls as bridge messages

### Mental model (memorize and draw)

```text
+------------------+          +------------------+          +------------------+
|   JS Thread      |          |     Bridge       |          |  Native side     |
|  React + app JS  |  ----->  |  serialize/batch |  ----->  |  Modules / UI    |
|                  |  <-----  |  deserialize     |  <-----  |  Main/UI thread  |
+------------------+          +------------------+          +------------------+
```

Flow for a typical call:

1. JS invokes a native module method (or UI update is scheduled).
2. Arguments are prepared/serialized into a bridge-friendly payload.
3. Messages are queued and often batched.
4. Native receives messages, dispatches to the right module/UI manager.
5. Results/callbacks/events travel back asynchronously.

### Interview answer (30 seconds)

> "The legacy Bridge is an asynchronous message channel between the JS runtime and native code. Calls and data are serialized and batched across that boundary. It made React Native portable early on, but serialization cost, asynchrony, and eager module loading became bottlenecks - which is why the New Architecture moved to JSI and Turbo Modules."

---

## 2. Serialization and batching (the expensive parts)

### Topics to learn
- [ ] Why objects/arrays/strings must cross a boundary safely
- [ ] Cost of large payloads (images as base64 anti-pattern, huge maps)
- [ ] Batching reduces round-trips but can delay individual work
- [ ] High-frequency events (scroll, gesture, sensor) as congestion sources
- [ ] Callbacks and event emitters as reverse traffic

### What gets expensive

| Pattern | Why it hurts on Bridge |
|---|---|
| Sending large objects every frame | Serialize + deserialize repeatedly |
| JS-driven animations without native driver | Constant bridge traffic to update styles |
| Chatty native events (every scroll tick into JS heavy work) | Floods MessageQueue + JS thread |
| Passing huge base64 blobs through module APIs | Memory + CPU on both sides |
| Eagerly initializing many native modules | Startup tax before first screen |

### Senior heuristic

Cross the bridge for **commands and small results**, not for **high-frequency streams of bulky data**. If you need high-frequency updates, prefer:
- native-driven UI (Reanimated / native animations)
- shared memory / JSI patterns (New Arch)
- coalescing events (send summaries, not every tick)

---

## 3. Asynchrony: what you can and cannot do cleanly

### Topics to learn
- [ ] Bridge calls are async by nature
- [ ] Sync native reads were awkward/limited in classic architecture
- [ ] Race conditions when JS assumes immediate native state
- [ ] Ordering guarantees within batches vs across systems

### Practical implications

- You cannot treat a native module call like a cheap local function.
- UI that needs "read native layout now and branch synchronously" was painful on Bridge.
- Error handling must assume delayed failures.
- Debugging requires correlating JS logs with native logs across time.

### Interview question

**Q: Why were synchronous native calls a problem on the old architecture?**

> "Because the Bridge was designed around async serialized messages. A true sync call would block waiting on the other side and fight the queue model. That made certain native interop patterns awkward. JSI enables more direct calls, so Turbo Modules can support sync methods where they are actually appropriate - used carefully, because sync work can still block the JS thread."

---

## 4. Threads and the Bridge

### Topics to learn
- [ ] JS thread runs React + most business logic
- [ ] Native/UI thread lays out and draws views
- [ ] Native modules may do work on background threads
- [ ] Bridge congestion vs JS thread blockage vs UI thread jank - different diagnoses

### Symptom table (interview gold)

| Symptom | Likely layer |
|---|---|
| UI frozen, taps delayed, React not updating | JS thread busy |
| Scroll still moves but JS reactions lag | Native scroll OK; JS/bridge overloaded |
| Dropped frames during style thrash from JS | Bridge + UI updates / JS-driven animation |
| Startup slow before first meaningful paint | Module init + bundle + bridge setup |
| Native crash with JS still "fine" until next call | Native module bug, not Bridge itself |

---

## 5. Bridge-era Native Modules (relationship)

The Bridge is the *transport*. Legacy Native Modules are the *API endpoints* on the native side.

Classic pattern:
- Android: `ReactContextBaseJavaModule` / package registration
- iOS: `RCTBridgeModule`
- Methods exported to JS
- Promises, callbacks, or event emitters for results

Deep dive for implementation details: [16-native-modules.md](./16-native-modules.md).

Deep dive for modern replacement: [17-turbo-modules.md](./17-turbo-modules.md).

Integrations overview (biometrics, DataWedge, patches): [07-native-modules.md](./07-native-modules.md).

---

## 6. Bridge congestion - how seniors debug it

### Topics to learn
- [ ] Identify chatty modules with logging/profiling
- [ ] Reduce event frequency (throttle/debounce/coalesce at native side)
- [ ] Move work off JS reactions to scroll
- [ ] Avoid sending full state blobs; send IDs + fetch
- [ ] Prefer native UI updates for animations

### Production checklist
- [ ] No per-frame JS bridge writes for animation
- [ ] Native events coalesced when possible
- [ ] Large payloads not shuttled through module methods
- [ ] Startup does not touch unused native modules eagerly (legacy limitation - motivates Turbo Modules lazy load)
- [ ] Perf markers around suspect crossings

### Anti-patterns seniors reject
- Blaming "RN is slow" without measuring bridge vs JS vs UI
- Fixing congestion by micro-memoizing React while still blasting scroll events into JS
- Base64 round-tripping files through the bridge when native file URIs exist

---

## 7. New Architecture migration context

### Topics to learn
- [ ] JSI replaces many Bridge responsibilities for module calls
- [ ] Fabric replaces legacy renderer pipeline
- [ ] Turbo Modules replace legacy native module system
- [ ] Interop layers allow gradual migration
- [ ] Some libraries still Bridge-based during transition

### Interview framing

> "I don't treat Bridge knowledge as obsolete trivia. Most production apps still have legacy modules or interop paths. Understanding Bridge failure modes helps me decide when a Turbo Module or native-driven approach is justified - like hardware SDK integrations on Clean House or custom native libraries on Wizer."

---

## 8. CV tie-backs (use these)

| CV theme | Bridge angle |
|---|---|
| Turbo Modules listed on CV | Explain as evolution *from* Bridge bottlenecks |
| Zebra DataWedge (Clean House) | Hardware events must not naively flood JS |
| Crash / perf work | Distinguish bridge congestion from JS render cost |
| Native Android/iOS integrations | You operated at the boundary the Bridge abstracts |

---

## Interview question bank

1. What is the React Native Bridge?
2. Why serialize data across JS and native?
3. What is batching and why does it exist?
4. Give an example of bridge congestion.
5. How do Bridge limitations show up in animations?
6. How do legacy Native Modules use the Bridge?
7. What problems do Turbo Modules solve that the Bridge caused?
8. How do you tell JS-thread blockage from bridge congestion?
9. Does New Architecture remove the need to understand the Bridge?
10. When would you still write a bridge-style integration today?

### Model answers (short)

**Congestion example:**
> "A screen listens to raw scroll events in JS and does heavy work each tick - serialization and JS execution compound, list feels fine at OS level but interactions hitch. Fix by reducing event frequency, moving work, or using native-driven gestures/animations."

**Why Turbo Modules:**
> "Lazy init, typed Codegen contracts, and JSI invocation reduce the serialize-everything async tax of classic Bridge modules - especially for modules not needed at startup."

---

## Hands-on drills

- [ ] Draw Bridge architecture from memory in 60 seconds
- [ ] Explain Bridge vs JSI to a junior in 3 minutes
- [ ] List 5 anti-patterns that flood the Bridge
- [ ] Map one of your native integrations onto Bridge-era constraints
- [ ] Prepare a 90-second answer: "Why did RN need a New Architecture?"

---

## Senior-Level Best Practices

### Decision framework
- Measure first: JS profile vs native vs message volume
- If high-frequency UI: prefer native driver / Reanimated / Fabric-friendly paths
- If occasional commands: Bridge-era modules may still be fine in legacy apps
- If new module on New Arch: prefer Turbo Module (see chapter 17)

### Production checklist
- [ ] No unbounded event emitters into JS
- [ ] Payload sizes reviewed for native APIs
- [ ] Startup path audited for eager module costs
- [ ] Release builds profiled, not only debug
- [ ] Migration plan documented for legacy modules

### Failure modes

| Failure | Debug approach |
|---|---|
| App hitching on gesture-heavy screens | Sample JS thread; count native events; throttle |
| Slow TTI | Trace native module init; defer non-critical modules |
| Random delayed callbacks | Log correlation IDs across JS/native; check queue delays |
| Memory spikes on module calls | Inspect payload size; avoid base64 files |

### Harder follow-ups

**Q: If Fabric and Turbo Modules exist, why interview Bridge at all?**
> "Because production reality is mixed. Seniors debug hybrid systems and can explain tradeoffs historically and practically."

**Q: Can you make Bridge 'fast enough' instead of migrating?**
> "Sometimes, by reducing chatter and payload size. But you cannot invent efficient sync JSI-style interop on pure Bridge. Migration is about the model, not only micro-opts."

### Staff monologue
> "The Bridge taught RN teams an important lesson: boundaries have physics. Serialization and asynchrony are not abstractions you can ignore at scale. My native work - DataWedge, custom iOS preview, Turbo Modules - is all about choosing the right boundary technology for the job, not sprinkling native code everywhere."

---

## Mastery checklist

- [ ] I can draw and narrate the Bridge without notes
- [ ] I can diagnose congestion vs JS vs UI issues
- [ ] I can explain Bridge -> JSI/Turbo Modules evolution clearly
- [ ] I can connect Bridge limits to at least one CV integration story
- [ ] I know when Bridge knowledge still matters in New Arch apps
