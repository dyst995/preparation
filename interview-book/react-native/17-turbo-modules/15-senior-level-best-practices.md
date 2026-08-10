# 15. Senior-Level Best Practices

> Source: `interview-prep/react-native/17-turbo-modules.md`

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
