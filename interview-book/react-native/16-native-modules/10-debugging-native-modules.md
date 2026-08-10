# 10. Debugging Native Modules

> Source: `interview-prep/react-native/16-native-modules.md`

### Topics to learn
- [ ] JS: method undefined -> name mismatch / not registered
- [ ] Promise never resolves -> native forgot resolve/reject
- [ ] Android Logcat stack traces
- [ ] Xcode exception breakpoints / device logs
- [ ] Crashlytics native stacks symbolication
- [ ] Reproducing on release builds

### Failure table

| Bug | Typical cause |
|---|---|
| `undefined is not a function` | Wrong module/method name; not linked |
| App crash on method call | Native NPE / force unwrap / wrong thread |
| Event not received | Emitter not subclassed correctly; no listeners; wrong event name |
| Works in debug only | Proguard/R8 stripping; missing keep rules |
| Flaky Activity null | Calling too early / after teardown |

---
