# 17 - Turbo Modules (New Architecture Native Modules)

> Goal: Explain and design Turbo Modules with JSI + Codegen like someone who listed them on their CV intentionally - lazy loading, typed specs, sync/async methods, Android/iOS implementation shape, migration from legacy modules, and production pitfalls.

Related chapters:
- Bridge theory: [15-bridge.md](./15-bridge.md)
- Legacy Native Modules: [16-native-modules.md](./16-native-modules.md)
- Integrations & when-native: [07-native-modules.md](./07-native-modules.md)
- Fundamentals overview: [01-fundamentals.md](./01-fundamentals.md)

Mark progress with `[x]`.

---

## Learning objectives

1. Explain how Turbo Modules differ from legacy Bridge Native Modules.
2. Describe JSI's role under Turbo Modules.
3. Write/describe a Codegen spec and what it generates.
4. Explain lazy initialization and startup impact.
5. Know when sync methods are justified vs dangerous.
6. Outline Android (Kotlin/Java) and iOS (Obj-C++/Swift interop) implementation responsibilities at interview depth.
7. Plan migration from a legacy module to a Turbo Module.
8. Connect Turbo Modules to your CV (native Android/iOS work, performance, modern RN architecture).

---

## 1. Why Turbo Modules exist

Legacy Native Modules paid three big taxes:

1. **Serialization / async Bridge transport** for calls
2. **Eager loading** of many modules at startup
3. **Hand-kept JS/native contracts** that drift

Turbo Modules address those:

| Legacy pain | Turbo Module answer |
|---|---|
| Bridge serialize/async call path | JSI-powered invocation |
| Eager module init | Lazy init on first JS use |
| Manual method signatures | Codegen from typed spec |
| Weak cross-platform parity | Shared spec as source of truth |

### Interview answer (45 seconds)

> "Turbo Modules are the New Architecture native module system. Instead of talking through the legacy async Bridge message queue, they use JSI for more direct JS-native interop. Modules can load lazily, which helps startup, and Codegen generates typed native interfaces from a shared spec so the contract doesn't drift. I still use legacy modules where needed during migration, but for new native work on New Architecture apps I prefer Turbo Modules."

---

## 2. Core building blocks

### Topics to learn
- [ ] **JSI** - C++ API allowing native to hold JS references / call into JS runtime more directly
- [ ] **TurboModule** system - module registry + lazy factories
- [ ] **Codegen** - generates strongly typed bindings from schema
- [ ] **Fabric** - separate but related: new renderer (often enabled together)
- [ ] **Interop layer** - legacy modules running in New Arch apps

### How to speak about them without mushing concepts

- **JSI** = communication substrate
- **Turbo Modules** = native module design built on JSI
- **Fabric** = UI rendering architecture
- **Codegen** = tooling that generates typed native/JS glue from specs

If an interviewer says "explain New Architecture," structure:
1. JSI
2. Turbo Modules
3. Fabric
4. Codegen
5. Migration/interop reality

---

## 3. Codegen specs (source of truth)

### Topics to learn
- [ ] Spec files in TypeScript (common) describing methods and event types
- [ ] Extending `TurboModule` and using `TurboModuleRegistry.getEnforcing`
- [ ] Method types: void, async/promise, sync
- [ ] Object aliases / enums in specs
- [ ] Generated artifacts for Android/iOS
- [ ] Spec lives with the module package

### Conceptual JS spec shape

```text
MyModuleSpec
  - multiply(a, b) -> number (could be sync if declared sync)
  - fetchToken(userId) -> Promise<string>
  - getConstants() -> { SDK_VERSION: string }
```

JS usage should go through the typed registry wrapper, not ad-hoc NativeModules.

### Why seniors love Codegen

- Compile-time / generate-time contract checking
- Less "works on my machine" signature drift
- Cross-platform method parity becomes explicit
- Better autocomplete and safer refactors

### Anti-pattern

Hand-writing mismatched native methods that aren't in the spec "just for now."

---

## 4. Lazy loading and startup

### Topics to learn
- [ ] Module factory runs on first access
- [ ] Unused modules don't pay init cost at launch
- [ ] Still pay cost on first use (design APIs accordingly)
- [ ] Avoid first-use on the critical interaction path without warming if needed

### Interview question

**Q: How do Turbo Modules improve TTI?**

> "Legacy modules were often initialized eagerly, so apps paid native setup cost for features never opened on cold start. Turbo Modules initialize lazily when first required from JS, which reduces startup work. The tradeoff is first-call latency later - for critical paths I may warm a module after first frame if needed."

---

## 5. Sync vs async methods

### Topics to learn
- [ ] Turbo Modules can expose sync methods via JSI
- [ ] Sync is powerful and dangerous
- [ ] Sync work runs in a way that can block JS if heavy
- [ ] Prefer async/promises for I/O and slow work
- [ ] Sync reserved for tiny pure reads (flags, small computations, cheap constants-like reads)

### Decision framework

| Method type | Use when | Avoid when |
|---|---|---|
| Async / Promise | Disk, network, hardware I/O, anything slow | Never wrong as default |
| Sync | Tiny deterministic reads needed inline | File I/O, bitmap work, anything unpredictable |
| Events | Streams (scans, progress) | One-shot request/response |

### Senior line

> "JSI making sync possible does not make sync wise. I default to async and require a measured reason for sync."

---

## 6. Android implementation shape (interview depth)

### Topics to learn
- [ ] Implement the Codegen-generated TurboModule interface
- [ ] Kotlin/Java class providing method bodies
- [ ] Package / module provider registration for New Arch
- [ ] Coroutines/executors for background work
- [ ] Main thread for UI / certain Android APIs
- [ ] Avoid blocking the JS runtime with sync heavy work

### What interviewers want to hear

You won't necessarily whiteboard every annotation from memory, but you should say:

1. Spec is generated into a Java/Kotlin interface.
2. Your module class implements that interface.
3. You register a module provider so the registry can lazy-construct it.
4. You keep threading discipline identical to any serious Android code.
5. You return results through the generated promise types / sync returns as declared.

---

## 7. iOS implementation shape (interview depth)

### Topics to learn
- [ ] Generated Obj-C protocols / C++ interop pieces (high level)
- [ ] Implement methods matching the spec
- [ ] Swift often needs an Obj-C++/bridging layer (reality check)
- [ ] RCT_EXPORT-style legacy knowledge still helps mentally, but Turbo path is spec-driven
- [ ] Main queue for UIKit

### Honest senior answer about Swift

> "On iOS, Turbo Module plumbing is often Obj-C++/generated protocol oriented. Swift can wrap platform APIs, but I plan for a bridging layer instead of pretending it's pure Swift all the way through."

---

## 8. Events in a Turbo Module world

### Topics to learn
- [ ] Event emitters still exist for streams
- [ ] Spec declares event types where applicable
- [ ] JS subscription lifecycle must clean up
- [ ] Coalesce high-frequency hardware events (DataWedge)

### Clean House framing

Even with Turbo Modules, barcode hardware is an event stream. Turbo improves the module system; it does not change the product need for careful event rates and device testing.

---

## 9. Migrating legacy Native Module -> Turbo Module

### Step playbook

1. **Inventory** methods, events, constants, threading assumptions
2. **Write a Codegen spec** matching the public JS contract
3. **Implement native** against generated interfaces
4. **Keep JS facade stable** so features don't churn
5. **Enable New Arch** in a branch / gated build
6. **Verify** on real devices; watch startup and first-use latency
7. **Remove** duplicate legacy path after confidence

### Risk matrix

| Risk | Mitigation |
|---|---|
| Library dependency not Turbo-ready | Interop layer; upgrade library; wrap yourself |
| Spec misses an edge method | Audit JS usage; add tests around facade |
| Sync method accidentally heavy | Ban sync except allowlisted methods |
| iOS/Android parity drift | Spec is gate; reject platform-only surprises unless documented |

---

## 10. Testing Turbo Modules

### Topics to learn
- [ ] Jest: mock the typed module registry facade
- [ ] Native unit tests for pure logic
- [ ] Device tests for vendor SDKs
- [ ] New Arch CI job (where feasible) so regressions surface early

### Anti-pattern

Only testing with New Architecture off while claiming Turbo Module expertise.

---

## 11. Performance & observability

### Watch
- Cold start time before/after migration
- First call latency to lazy modules
- JS thread stalls around sync methods
- Native crash rate attributed to module
- Event emit rate for streaming modules

### Production checklist
- [ ] Spec committed and reviewed like a public API
- [ ] No heavy sync methods
- [ ] Lazy modules not forced at startup accidentally
- [ ] JS facade is the only access point
- [ ] Crashlytics breadcrumbs around native entry points
- [ ] Documented Android/iOS threading notes in module README

---

## 12. CV storytelling (memorize)

### Positioning statement

> "I work across the JS-native boundary in production React Native - including native Android and iOS integrations. I understand the legacy Bridge module model and the New Architecture Turbo Module model: Codegen specs, lazy loading, and JSI-based calls. I choose native modules only when platform capability demands it, keep the surface area small, and design for upgrade safety."

### Story hooks
- **EasyPay**: native Android technologies alongside RN architecture decisions
- **Clean House**: hardware integration - perfect "module + events" discussion
- **Wizer**: custom native iOS library - capability gap, not cargo-cult native
- **MyCreditInfo**: patching native Android libraries - maintenance and risk ownership

---

## Interview question bank

1. What are Turbo Modules?
2. How do they differ from legacy Native Modules?
3. What is JSI in one minute?
4. What does Codegen generate and why?
5. How does lazy loading help startup?
6. When do you use sync methods?
7. How do Turbo Modules relate to Fabric?
8. How do you migrate a legacy module?
9. What breaks if the spec and native implementation diverge?
10. How would you design a Turbo Module for barcode scanning?
11. Swift + Turbo Modules - what's the catch?
12. Why list Turbo Modules on a CV - what does that signal?

### Strong answer - Q12

> "It signals I don't stop at JS screens. I've worked with the modern RN native module system - typed contracts, New Architecture constraints, and real device integrations - which matters for fintech and hardware-assisted apps where pure JS wrappers aren't enough."

---

## Hands-on drills

- [ ] Draw: JS facade -> TurboModuleRegistry -> JSI -> native impl
- [ ] Write a sample Codegen spec on paper for SecureBiometricsModule
- [ ] Convert a legacy promise method list into a Turbo spec
- [ ] Explain Bridge vs Turbo Modules in under 2 minutes
- [ ] Prepare a 60-second CV pitch linking Turbo Modules to one project

---

## Senior-Level Best Practices

### Decision framework
1. New native capability on New Arch -> Turbo Module by default
2. Spec first, native second, JS facade always
3. Async by default; sync only with proof
4. Events for streams; promises for commands
5. Measure startup and first-use after adding modules

### Anti-patterns seniors reject
- "Turbo Modules make everything faster" with no mechanism
- Giant modules exposing whole SDKs
- Platform behavior differences not represented in docs/tests
- Claiming New Arch support without a device CI path
- Mixing raw `NativeModules` and Turbo registry calls for the same feature

### Failure modes

| Failure | Debug |
|---|---|
| Module undefined at runtime | Registry name / New Arch flag / packaging |
| Codegen mismatch build break | Spec vs native method signatures |
| First screen hitch | Lazy init on critical path; warm after first frame |
| Native crash on method entry | Argument nullability; threading; OEM differences |

### Tradeoffs table

| Choice | Gain | Cost |
|---|---|---|
| Turbo Module | Typed, lazy, modern | Tooling complexity; New Arch requirements |
| Keep legacy module | Less short-term churn | Startup/perf/contract drift debt |
| Sync method | Immediate value | JS jank risk |
| Fat native SDK wrap | Speed of feature | Upgrade hell |

### Harder follow-ups

**Q: Do Turbo Modules eliminate the Bridge completely in all apps?**
> "Not overnight. Many apps run interop. Turbo Modules are the target model for native modules under New Architecture, but seniors still debug mixed environments."

**Q: How do you keep Android and iOS behavior aligned?**
> "The Codegen spec is the contract. Shared JS tests against the facade, platform test notes for unavoidable OS differences, and no silent platform-only methods without explicit API design."

**Q: When is a Turbo Module the wrong tool?**
> "When a maintained library already wraps the capability well, or when the need is pure JS. Native surface area is a liability - Turbo Modules reduce interop tax, they don't make native code free."

### Staff monologue
> "Listing Turbo Modules on my CV means I can operate on both sides of RN's boundary with modern tooling. The senior skill isn't generating a module - it's designing a tiny durable contract, choosing async/event semantics correctly, migrating without breaking production, and proving behavior on real devices under New Architecture constraints."

---

## Mastery checklist

- [ ] I can explain Turbo Modules vs legacy modules without confusing Fabric/JSI
- [ ] I can describe Codegen's role with an example spec
- [ ] I can discuss lazy loading and sync method tradeoffs
- [ ] I can outline Android/iOS implementation responsibilities
- [ ] I can migrate a legacy module playbook end-to-end
- [ ] I can pitch Turbo Modules using EasyPay / Clean House / Wizer / MyCreditInfo
