# 08. Detox / Maestro  E2E awareness

> Source: `interview-prep/react-native/10-testing.md`

### Topics to learn
- [ ] Detox: gray-box E2E framework, synchronizes with the app's native/JS event loop to reduce flakiness, requires more setup (native build config)
- [ ] Maestro: black-box E2E framework, simpler YAML-based test flows, faster to write, growing popularity for its low setup friction
- [ ] Both run against a real (or near-real) app build on a simulator/emulator/device, unlike RNTL which runs in a Node/JSDOM-like environment
- [ ] Tradeoffs: E2E tests are the most realistic but slowest and most prone to environmental flakiness (timing, animations, network)
- [ ] Where E2E fits: a small number of true critical-path smoke tests (login, one full payment), not exhaustive coverage
- [ ] CI implications: E2E needs real device/simulator infrastructure, adds significant pipeline time

### Comparison table

| Aspect | Detox | Maestro |
|---|---|---|
| Approach | Gray-box, synchronizes with app internals to reduce race conditions | Black-box, interacts purely via UI like a real user |
| Setup complexity | Higher (native-level config, build variants) | Lower (YAML flow files, quicker to start) |
| Authoring speed | Slower to write, more powerful assertions | Very fast to write simple flows |
| Typical use | Teams wanting tight synchronization and mature CI integration | Teams wanting quick smoke-test coverage without heavy setup |

### Interview question

**Q: What's your awareness of Detox vs Maestro, even without deep hands-on depth?**

> "Both are E2E frameworks that run against a real app build on a simulator or device, which is a fundamentally different guarantee than RNTL's simulated environment. Detox is gray-box � it hooks into the app's own event loop to reduce flakiness from timing issues � but it has more setup overhead. Maestro is black-box and YAML-driven, much faster to get a smoke test running, which has made it popular for teams that want a thin layer of true E2E confidence without a heavy investment. I'd use either sparingly � a handful of true critical-path flows like login and one full payment � rather than trying to E2E-test everything, since they're the slowest and most environment-sensitive layer of the pyramid."

---
