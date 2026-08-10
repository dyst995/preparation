# 02. Serialization and batching (the expensive parts)

> Source: `interview-prep/react-native/15-bridge.md`

### Topics to learn
- [ ] Why objects/arrays/strings must cross a boundary safely
- [ ] Cost of large payloads (images as base64 anti-pattern, huge maps)
- [ ] Batching reduces round-trips but can delay individual work
- [ ] High-frequency events (scroll, gesture, sensor) as congestion sources
- [ ] Callbacks and event emitters as reverse traffic

### What gets expensive

| Pattern | Why it hurts on Bridge |
|---|---|
| Sending large objects every frame | Serialize + deserialize repeatedly |
| JS-driven animations without native driver | Constant bridge traffic to update styles |
| Chatty native events (every scroll tick into JS heavy work) | Floods MessageQueue + JS thread |
| Passing huge base64 blobs through module APIs | Memory + CPU on both sides |
| Eagerly initializing many native modules | Startup tax before first screen |

### Senior heuristic

Cross the bridge for **commands and small results**, not for **high-frequency streams of bulky data**. If you need high-frequency updates, prefer:
- native-driven UI (Reanimated / native animations)
- shared memory / JSI patterns (New Arch)
- coalescing events (send summaries, not every tick)

---
