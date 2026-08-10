# 02. Core building blocks

> Source: `interview-prep/react-native/17-turbo-modules.md`

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
