# 09. Bridge / JSI cost, and when it still matters

> Source: `interview-prep/react-native/06-performance.md`

### Topics to learn
- [ ] Why frequent small native calls still have overhead even on the New Architecture
- [ ] Batching native calls instead of calling per-item in a loop
- [ ] Avoiding chatty native module APIs (many tiny calls vs one call with a batched payload)
- [ ] Synchronous vs asynchronous native calls � when sync is safe (JSI enables it) and when it's dangerous (blocking UI thread)

### Interview question

**Q: You have a Turbo/Native Module and a loop that calls it 500 times. What's wrong, and what would you do?**

**Strong answer:**
> "Even with JSI's lower per-call overhead versus the old bridge, 500 individual native calls in a loop still pay serialization and call overhead 500 times, and if the native side does any work per call, that adds up on whichever thread it runs on. I'd redesign the API to accept a batch � pass the whole array once and let native process it in one call � rather than calling per item. This is the same principle as batching network requests: fewer, larger calls beat many small ones."

---
