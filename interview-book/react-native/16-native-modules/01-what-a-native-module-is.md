# 01. What a Native Module is

> Source: `interview-prep/react-native/16-native-modules.md`

A **Native Module** exposes native platform capabilities to JavaScript through RN's native-module system.

In the **legacy architecture**, that exposure goes through the **Bridge**:
- JS calls `NativeModules.MyModule.doSomething(...)`
- Bridge serializes the call
- Native implementation runs
- Result returns via promise/callback/event

### Topics to learn
- [ ] `NativeModules` JS API
- [ ] Module name must match what native registers
- [ ] Method argument type limitations over the Bridge
- [ ] One module can expose many methods
- [ ] Modules are traditionally eagerly initialized (startup cost)

---
