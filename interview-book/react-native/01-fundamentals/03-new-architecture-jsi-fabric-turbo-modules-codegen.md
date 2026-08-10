# 03. New Architecture: JSI, Fabric, Turbo Modules, Codegen

> Source: `interview-prep/react-native/01-fundamentals.md`

### Topics to learn
- [ ] JSI (JavaScript Interface)
- [ ] Fabric renderer
- [ ] Turbo Modules
- [ ] Codegen (schema ? typed native bindings)
- [ ] Concurrent React features enabled by Fabric (high level)
- [ ] Migration reality: libraries must support new arch; dual support period

### JSI

JSI lets native code hold direct references to JS objects/functions via a C++ layer, instead of only talking through an async serialized bridge.

Implications:
- Native can call into JS more directly.
- Sync operations become more feasible where appropriate.
- Lower overhead for native module APIs.

### Fabric

Fabric is the new renderer:
- Better coordination between React commits and native UI mounting/updates.
- Designed to work with React�s concurrent model more cleanly.
- Improves prioritization and consistency of UI updates (interview-level: �more aligned with modern React rendering�).

### Turbo Modules

Turbo Modules are the new native module system:
- Lazy loading of modules (don�t pay init cost until used).
- Stronger typing via Codegen.
- More efficient invocation through JSI vs old bridge modules.

### Codegen

You define a typed spec (often TypeScript/Flow-ish schema). Codegen produces:
- Native interface stubs
- Type-safe bindings
- Less handwritten boilerplate and fewer mismatch bugs

### Practical interview framing (use your CV)

You listed **Turbo Modules**. Be ready to say:
- When you needed native performance or platform APIs unavailable in JS.
- That Turbo Modules are preferable for new native work on New Architecture.
- That legacy native modules may still exist during migration.

### Interview questions

**Q: Explain JSI, Fabric, and Turbo Modules simply.**

> �JSI is the low-level interface that lets native and JS talk more directly. Fabric is the new UI renderer that mounts/updates native views more efficiently and fits modern React better. Turbo Modules are the new native module system built on JSI � lazy, typed via Codegen, and cheaper to call than legacy bridge modules.�

**Q: Is New Architecture �just faster�?**

> �Performance is one outcome, but the deeper point is a better interop model: less serialization, lazy native modules, stronger typing, and a renderer designed for concurrent React. Real-world wins depend on app patterns and library support.�

---
