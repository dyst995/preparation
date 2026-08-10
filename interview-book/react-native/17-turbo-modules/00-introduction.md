# 17 - Turbo Modules (New Architecture Native Modules) — Introduction

> Source: `interview-prep/react-native/17-turbo-modules.md`

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
