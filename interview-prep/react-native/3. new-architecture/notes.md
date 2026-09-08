# New Architecture: JSI, Fabric, Turbo Modules, Codegen

## What you need to know

The **New Architecture** is not “the Bridge but faster JSON.” It is a **different interop and rendering model**:

| Piece | Role | Replaces (roughly) |
| --- | --- | --- |
| **JSI** | C++ layer: native can hold JS references and call the runtime more directly | Serialize-everything async **message queue** for module calls |
| **Turbo Modules** | Native **module** system on JSI: lazy, typed | Legacy Bridge Native Modules |
| **Fabric** | New **UI renderer**: React commit ↔ native view mount/update | Legacy renderer / UI manager pipeline |
| **Codegen** | **Tooling**: typed native/JS glue from a spec | Hand-kept, drifting method signatures |

**Performance can improve**, but the interview bar is the **model**: less copy tax, lazy modules, typed contracts, a renderer that fits **concurrent React**. Wins depend on **app patterns and library support**.

Prerequisite: [the old Bridge](../2.%20bridge/notes.md). This unit is the **replacement pieces**. Implementation depth: [17-turbo-modules.md](../17-turbo-modules.md). Do not mash JSI into Fabric.

Curriculum this unit completes:

- JSI vs Bridge message queue
- Fabric vs “just Turbo Modules”
- Turbo Modules: lazy + JSI + Codegen
- Codegen as source of truth
- Concurrent React (high level)
- Migration / interop / dual support

---

## How to keep the four names unmixed

If they say “explain New Architecture,” walk **this order**:

1. **JSI** — how JS and native *talk*
2. **Turbo Modules** — native *APIs* on that substrate
3. **Fabric** — how *UI* mounts
4. **Codegen** — how *types* are generated
5. **Interop** — legacy still exists

Wrong: “New Architecture is Fabric.”  
Wrong: “JSI is a Turbo Module.”  
**JSI = substrate. Turbo Modules = modules. Fabric = renderer. Codegen = generator.**

---

## JSI (JavaScript Interface)

**What it is:** a **C++ API** so native code can hold **direct references** to JS objects/functions and invoke them **without** packing every call as an async JSON-like Bridge message.

**Why it exists:** the Bridge’s physics — **copy, queue, async-only** — made tight interop and small **synchronous** reads painful.

**Implications:**

- Native → JS calls are more **direct** (still not “free”; you can block the **JS thread**).
- **Sync** methods become *feasible where appropriate* (tiny getters), not “decode video on the JS stack.”
- Turbo Module **invocation cost** drops vs serialize/deserialize every time.

JSI is **not** the UI tree and **not** a module you import in app code. It is the **pipe** Turbo Modules (and parts of Fabric) sit on.

```text
Legacy:  JS  --serialize/batch-->  MessageQueue  --deserialize-->  native
New:     JS  <---- JSI references / calls ---->  native (C++)
```

---

## Fabric (the renderer)

**What it is:** the new **renderer** that **mounts and updates native views** in coordination with React **commits**.

**Why it exists:** the old UI pipeline was built for a world of sync recursive render + Bridge-shaped UI commands. Modern React wants **concurrent** render: pause, restart, discard **render** work, then **commit** a consistent tree. Fabric is “more aligned with modern React rendering” — **prioritization and consistency** of what lands on screen.

Interview-level, not a C++ shadow-tree lecture:

- React still **reconciles** (elements/fibers).
- Fabric is **how those commits become native views** more cleanly than the legacy UI manager path.
- Often **enabled together** with Turbo Modules; they are still **different jobs**.

You can have (during migration) **messy combinations**. Don’t claim “I turned on Fabric so JSI doesn’t matter.”

---

## Turbo Modules

**What they are:** the New Architecture **native module** system.

They attack three legacy taxes:

| Legacy pain | Turbo Module answer |
| --- | --- |
| Bridge serialize/async call path | **JSI** invocation |
| Eager module init at startup | **Lazy** load on first JS use |
| Hand-written JS/native signatures | **Codegen** from a shared spec |

**Prefer Turbo Modules** for **new** native work on a New Architecture app (platform APIs or performance JS cannot do). **Legacy modules** may still run through an **interop** layer during migration.

CV: you listed Turbo Modules — be ready with **when** (hardware/SDK/perf, not “because the blog said so”) and that you would **not** rewrite a quiet legacy module on a deadline just to rename it.

```ts
// Conceptual: JS asks the registry; module may not exist until first get
import NativeCamera from './NativeCamera'; // Codegen + TurboModuleRegistry.getEnforcing

await NativeCamera.takePhoto(); // first use can trigger lazy native init
```

---

## Codegen

**What it is:** you write a **typed spec** (TypeScript / Flow-ish schema). Codegen emits:

- Native **interface stubs** (Android/iOS)
- Type-safe **bindings**
- Less handwritten glue → **fewer mismatch bugs** (JS thinks `number`, native sent a map)

The spec is the **source of truth**. Drift (“I updated Kotlin but forgot JS”) is the old failure mode.

```ts
// Conceptual spec shape — not a full template to memorize
export interface Spec extends TurboModule {
  multiply(a: number, b: number): number; // may be sync if marked sync
  takePhoto(): Promise<string>;          // async / Promise
}
```

Codegen is **tooling**, not a runtime like JSI. Interview: “Codegen generates the typed native/JS contract from one spec.”

---

## Concurrent React (high level)

Fabric is designed so **concurrent features** (prioritized updates, interruptible render) can **commit to native UI** without the old pipeline’s “all UI commands look like Bridge batches” constraints.

You do **not** need to implement a scheduler in the interview. You **do** need: **render may be interrupted; commit should still mount a consistent native tree.** That’s why Fabric is paired with “modern React,” not only “faster shadow views.”

---

## Migration reality

- Libraries must **opt in** / support New Architecture. A payment/KYC SDK with **no** New Arch support can **block** “just enable it.”
- **Dual support** period: interop lets **legacy Bridge modules** run in a New Arch app. Seniors debug **hybrids**, not a clean flip.
- Green-field, small deps: adopt early. **Large fintech + vendor SDKs:** audit support, branch, rollback — don’t couple with unrelated features (see `01-fundamentals.md` senior table).

“Is it just faster?” **No.** Faster is **one outcome**. The point is **interop model + renderer + types + lazy modules**. Measure TTI/FPS; don’t promise a 2× win from a flag.

---

## Common mistakes and misconceptions

- **“New Architecture = Fabric.”** Four pieces; Fabric is the renderer only.
- **“JSI is always faster and always async-free.”** Sync JSI **can block JS**. Small reads yes; heavy work no.
- **“Turbo Modules delete the need to know the Bridge.”** Interop + old libs remain ([Bridge unit](../2.%20bridge/notes.md)).
- **“Codegen is JSI.”** Generator vs substrate.
- **“Enable New Arch, all npm native modules work.”** Check each library’s support matrix.
- **“Hermes = New Architecture.”** Hermes is the **JS engine**. Related to RN defaults, **not** the same as JSI/Fabric.

---

## Connections to other concepts

`Bridge taxes → JSI (talk) + Turbo Modules (APIs) + Fabric (UI) + Codegen (types)`

- **[Bridge](../2.%20bridge/notes.md):** the problems this model answers (copy, async-only, congestion, eager init).
- **[RN vs web](../1.%20rn-vs-web/notes.md):** Fabric is still **native host views**, not DOM.
- **Threads** (next fundamentals section): JSI sync still runs **on the JS thread** until native returns.
- **[17-turbo-modules.md](../17-turbo-modules.md):** specs, Android/iOS shape, migration steps.
- **Fiber / concurrent React** (web track): Fabric is the **host** half of “interruptible render, consistent commit.”

---

## Interview perspective

You should be able to:

1. Unmix **JSI / Fabric / Turbo Modules / Codegen** in one pass.
2. Say New Architecture is a **better interop + render model**, not a speed slogan.
3. Tie **lazy + typed + JSI** to Turbo Modules specifically.
4. Mention **library/vendor** blockers and **interop**.
5. Use your CV: new native work → Turbo Modules; legacy may stay until migrated.

Preserved spoken answers:

> JSI is the low-level interface that lets native and JS talk more directly. Fabric is the new UI renderer that mounts/updates native views more efficiently and fits modern React better. Turbo Modules are the new native module system built on JSI — lazy, typed via Codegen, and cheaper to call than legacy bridge modules.

> Performance is one outcome, but the deeper point is a better interop model: less serialization, lazy native modules, stronger typing, and a renderer designed for concurrent React. Real-world wins depend on app patterns and library support.

Turbo Module 45s (from the Turbo chapter, still valid):

> Turbo Modules are the New Architecture native module system. Instead of the legacy async Bridge queue, they use JSI. They can load lazily, which helps startup, and Codegen generates typed native interfaces from a shared spec. I still use legacy modules during migration; for new native work on New Architecture I prefer Turbo Modules.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
