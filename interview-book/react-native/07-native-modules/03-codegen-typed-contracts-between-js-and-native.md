# 03. Codegen ? typed contracts between JS and native

> Source: `interview-prep/react-native/07-native-modules.md`

### Topics to learn
- [ ] Defining a spec (TypeScript/Flow-style types describing the native interface)
- [ ] Codegen generating native interface stubs (Java/Kotlin interface, Objective-C++/Swift-compatible protocol) from that spec
- [ ] Compile-time safety: mismatched types fail to build rather than crash/misbehave at runtime
- [ ] Reduced boilerplate vs hand-writing bridging code on both platforms
- [ ] Codegen as part of the build pipeline (runs during build, not something you hand-invoke constantly)

### Why this matters for interviews

Before Codegen, a common bug class was: JS calls a native method expecting a `string`, but the native implementation was changed to expect a `number`, and nothing catches it until a runtime crash or silent misbehavior in production. Codegen makes the spec the single source of truth, generating matching native scaffolding, so mismatches surface at build time.

### Interview question

**Q: Why does Codegen matter beyond "less boilerplate"?**

**Strong answer:**
> "The bigger win is correctness. Without Codegen, you hand-write the JS-side declaration and the native-side implementation separately, and nothing stops them from drifting apart ? a changed parameter type on one side becomes a runtime bug, sometimes only in production edge cases. Codegen generates the native interface from a single typed spec, so the contract is enforced at build time. Given how many crash-rate issues I've had to chase down to their root cause ? like on MyCreditInfo ? I care a lot about anything that turns a runtime crash into a compile-time error."

---
