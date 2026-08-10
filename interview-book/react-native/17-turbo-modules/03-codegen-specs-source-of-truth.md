# 03. Codegen specs (source of truth)

> Source: `interview-prep/react-native/17-turbo-modules.md`

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
