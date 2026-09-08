# New Architecture: JSI, Fabric, Turbo Modules, Codegen — Answers

## Core recall

1. **JSI:** native↔JS substrate (direct-ish refs/calls). **Fabric:** new **UI renderer**. **Turbo Modules:** native **module** system on JSI. **Codegen:** generates typed glue from a spec.
2. Hold **JS references** and call the runtime **without** packing every call as an async serialized Bridge message.
3. **No.** Fabric is the **renderer** (views). Modules are **Turbo Modules**.
4. **Serialize/async** call path; **eager** init; **hand-kept** untyped contracts.
5. **Input:** typed spec (TS/schema). **Output:** native stubs + type-safe bindings.
6. Concurrent React may **pause/discard render**; Fabric aims to **commit a consistent native tree** and prioritize UI work — aligned with that model.
7. **Legacy Bridge modules** can still run via **interop** while some of the app is on New Arch. Dual support / mixed libraries.
8. **No.** Faster is one outcome. Point is **interop + lazy modules + types + concurrent-ready renderer**. Wins depend on patterns and **library support**.

## Explain why

1. Fabric is **one** piece (UI). JSI/Turbo/Codegen are the **module/talk/types** story. Collapsing them hides whether you understand modules vs renderer.
2. Sync means **JS waits**. Heavy native work **blocks JS** (taps/React stall) — same class of bug as blocking JS for any other reason.
3. You **don’t pay native init** for unused modules at launch → better **TTI** when many modules exist.
4. One spec → both sides generated → **drift** (Kotlin updated, JS not) is harder. Types fail at **build/codegen**, not only in production.
5. The SDK’s **native module** may still be Bridge-only or crash on Fabric. Your JS being “ready” doesn’t make **their** `.so`/Pod New-Arch-safe.
6. Fabric changes **how views mount**. A **chatty JS event loop** is still JS + data copies. Use native-driven animation / fewer events; don’t expect the renderer flag to delete `onScroll` abuse.

## Compare and contrast

1. **Queue of serialized messages** vs **C++ refs/calls** with less copy tax and possible sync.
2. **Bridge modules:** async messages, often eager. **Turbo:** JSI, lazy, Codegen-typed.
3. **Fabric = UI pipeline.** **Turbo = native APIs** (camera, biometrics, SDKs).
4. **Codegen = generates code.** **JSI = runtime interop layer.**
5. **Hermes = JS engine** (bytecode, TTI). **New Arch = renderer + module system.** Can use Hermes without understanding Fabric.
6. Speed slogan vs **less serialization, lazy load, types, concurrent-friendly commit**.

## Predict the output

1. **Once:** lazy **native init** on first `get`. **Avoid:** paying that init for **unused** modules at startup (legacy eager pattern).
2. **JS thread blocked** until I/O finishes. Sync is “no Promise,” not “free” and not “runs on UI only.”
3. **No.** That’s still **high-frequency JS work** (and likely copies). Fabric doesn’t remove `setState` per tick.
4. Codegen/types catch **contract** mismatches if native implements the **generated** interface. If native **bypasses** the spec, you can still ship a **runtime** lie — discipline is “native implements generated stubs.”

## Debugging

1. **Fabric = renderer.** Native modules = **Turbo Modules** (on **JSI**). Don’t use Fabric as the module word.
2. **Vendor blocker.** Stay on interop or delay New Arch; don’t flip main without a support matrix and rollback.
3. **Turbo Modules / JSI** weren’t going to fix **UI event chatter**. Look at **JS thread**, event frequency, native driver — maybe Fabric helps commits, but the symptom is the **scroll listener**.
4. **Codegen spec wasn’t updated** (or wasn’t regenerated). Kotlin-only change **broke the contract**.

## Application

1. JSI (talk) → Turbo Modules (APIs) → Fabric (UI) → Codegen (types) → mention interop.
2. **New** native on New Arch → Turbo. **Quiet legacy** in a mixed app → don’t rewrite under deadline; schedule migration.
3. e.g. `getVersion(): string` (sync) and `takePhoto(): Promise<string>`.
4. “It can be faster, but I’m buying a **better interop and render model**; we still measure and check libraries.”

## Interview questions

1. **Spoken:** JSI = more direct JS–native interface. Fabric = new renderer aligned with modern React commits. Turbo Modules = lazy, Codegen-typed modules on JSI, cheaper than Bridge modules.  
   **Follow-ups:** Codegen generates the contract. Not *just* faster — model + library support.

2. **Spoken:** Drop serialize-everything async tax, eager init, and handwritten drifting APIs — JSI + lazy + spec.

3. **Spoken:** Justified for **tiny** native reads. Dangerous if the native body is **heavy** — blocks JS. Prefer async/Promises for I/O.

4. **Spoken:** Audit every native dep’s New Arch support; migrate in a branch; interop for stragglers; don’t mix with unrelated feature work; rollback plan. Vendor without support = wait or isolate.

5. **Spoken:** When JS couldn’t do it (platform SDK, hardware, tight perf) — e.g. integrations you’d otherwise shove through a congested Bridge. Not for a `Platform.OS` string.

## Connections

1. Copy + async-only + queue congestion → need **direct-ish calls** (JSI) and a new **module** design.
2. Same **interruptible render / atomic commit** idea; Fabric is the **native host** implementation, not `react-dom`.
3. Eager Bridge modules tax **TTI**; Turbo **lazy** init is the structural fix.
4. JSI sync still **occupies JS**. UI thread still draws. Don’t say “JSI deleted threads.”
5. **Hybrid production** and “why this exists.” Interviewers often start at the Bridge on purpose.
