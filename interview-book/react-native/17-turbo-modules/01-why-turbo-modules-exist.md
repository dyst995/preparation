# 01. Why Turbo Modules exist

> Source: `interview-prep/react-native/17-turbo-modules.md`

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
