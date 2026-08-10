# 03. Asynchrony: what you can and cannot do cleanly

> Source: `interview-prep/react-native/15-bridge.md`

### Topics to learn
- [ ] Bridge calls are async by nature
- [ ] Sync native reads were awkward/limited in classic architecture
- [ ] Race conditions when JS assumes immediate native state
- [ ] Ordering guarantees within batches vs across systems

### Practical implications

- You cannot treat a native module call like a cheap local function.
- UI that needs "read native layout now and branch synchronously" was painful on Bridge.
- Error handling must assume delayed failures.
- Debugging requires correlating JS logs with native logs across time.

### Interview question

**Q: Why were synchronous native calls a problem on the old architecture?**

> "Because the Bridge was designed around async serialized messages. A true sync call would block waiting on the other side and fight the queue model. That made certain native interop patterns awkward. JSI enables more direct calls, so Turbo Modules can support sync methods where they are actually appropriate - used carefully, because sync work can still block the JS thread."

---
