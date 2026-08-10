# 01. What the Bridge is

> Source: `interview-prep/react-native/15-bridge.md`

### Topics to learn
- [ ] React Native's original JS-to-native communication channel
- [ ] MessageQueue / batched bridge calls
- [ ] Asynchronous by default
- [ ] Serialization of arguments and return values
- [ ] UI Manager commands traveling across the same conceptual boundary
- [ ] Native module method calls as bridge messages

### Mental model (memorize and draw)

```text
+------------------+          +------------------+          +------------------+
|   JS Thread      |          |     Bridge       |          |  Native side     |
|  React + app JS  |  ----->  |  serialize/batch |  ----->  |  Modules / UI    |
|                  |  <-----  |  deserialize     |  <-----  |  Main/UI thread  |
+------------------+          +------------------+          +------------------+
```

Flow for a typical call:

1. JS invokes a native module method (or UI update is scheduled).
2. Arguments are prepared/serialized into a bridge-friendly payload.
3. Messages are queued and often batched.
4. Native receives messages, dispatches to the right module/UI manager.
5. Results/callbacks/events travel back asynchronously.

### Interview answer (30 seconds)

> "The legacy Bridge is an asynchronous message channel between the JS runtime and native code. Calls and data are serialized and batched across that boundary. It made React Native portable early on, but serialization cost, asynchrony, and eager module loading became bottlenecks - which is why the New Architecture moved to JSI and Turbo Modules."

---
