# 02. The old Bridge architecture

> Source: `interview-prep/react-native/01-fundamentals.md`

### Topics to learn
- [ ] Asynchronous, serialized bridge
- [ ] JSON-like message batching between JS and native
- [ ] Why large/frequent crossings are expensive
- [ ] Why synchronous native calls were painful/limited
- [ ] Classic symptoms: laggy animations if driven from JS, bridge congestion

### How the bridge worked (mental model)

1. JS wants native work (e.g. create a view, call a native module).
2. The call is queued and sent across an asynchronous bridge.
3. Data is serialized (historically JSON-like), sent, deserialized on the other side.
4. Native does work, may send results back the same way.

### Problems

| Problem | Why it hurts |
|---|---|
| Serialization cost | Big objects / frequent messages = CPU + latency |
| Async-only by default | Hard to implement sync native reads cleanly |
| Congestion | Many events (scroll, gestures) can flood the bridge |
| Harder interop | Native modules felt �far away� from JS |

### Interview question

**Q: What is the bridge, and what problems does it cause?**

**Strong answer:**
> �The legacy bridge is an asynchronous communication channel between JS and native. Calls and data are serialized and batched across that boundary. It�s flexible, but serialization and asynchrony become bottlenecks for high-frequency updates, large payloads, and modern native interop. The New Architecture reduces that overhead with JSI and Turbo Modules.�

**Follow-ups to expect:**
- Can you give an example of bridge congestion?
- Did animations belong on the JS thread? (Prefer native driver / Reanimated UI thread work.)

---
