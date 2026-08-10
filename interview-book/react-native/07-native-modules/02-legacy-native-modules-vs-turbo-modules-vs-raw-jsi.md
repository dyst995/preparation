# 02. Legacy Native Modules vs Turbo Modules vs raw JSI

> Source: `interview-prep/react-native/07-native-modules.md`

### Topics to learn
- [ ] Legacy Native Modules: bridge-based, async-only in practice, all modules loaded eagerly at startup
- [ ] Turbo Modules: JSI-based, lazily loaded, typed via Codegen
- [ ] Raw JSI: the lowest-level interface Turbo Modules (and Fabric) are built on
- [ ] Backward compatibility layer (interop) during migration periods
- [ ] Why "legacy modules still exist" is a normal, expected interview answer during a New Architecture transition

### Comparison table

| Aspect | Legacy Native Modules | Turbo Modules | Raw JSI |
|---|---|---|---|
| Transport | Async bridge (serialized messages) | JSI (direct references, no serialization round-trip for the call itself) | JSI directly |
| Loading | All native modules instantiated eagerly at app startup | Lazy ? only instantiated when first accessed from JS | N/A (you control it) |
| Typing | Manual, easy to get JS/native signatures out of sync | Generated from a typed spec via Codegen ? compile-time-checked contract | Whatever you build |
| Sync calls | Not really supported cleanly | Possible where appropriate | Fully possible (with care) |
| Who writes it | You implement a `ReactContextBaseJavaModule`/`RCTBridgeModule` conforming class | You implement against a Codegen-generated interface/spec | You write raw C++/JSI bindings (rare for app-level work; more common for library authors) |
| Typical use today | Legacy codebases, libraries not yet migrated | New modules on New Architecture apps | Library/SDK-level performance-critical work |

### Interview questions

**Q: What's the practical difference between a legacy Native Module and a Turbo Module?**

**Strong answer:**
> "Legacy Native Modules go through the async bridge ? every call is serialized, sent across, and deserialized, and all modules are instantiated eagerly at app startup whether you use them or not. Turbo Modules are built on JSI, so calls avoid that serialization overhead, and modules are lazily instantiated only when first accessed ? better startup cost when you have many modules. Turbo Modules are also defined through a typed Codegen spec, so the JS and native signatures can't silently drift out of sync the way they can with legacy modules where you hand-write both sides independently."

**Q: Is JSI the same as a Turbo Module?**

**Strong answer:**
> "No ? JSI is the underlying interface that lets JS and native hold direct references to each other's objects/functions. Turbo Modules are a specific system built on top of JSI for exposing native modules to JS, with lazy loading and Codegen-generated typing. JSI itself is lower-level; Fabric (the renderer) is also built on it. Think of JSI as the foundation, Turbo Modules and Fabric as the two major systems built on that foundation."

---
