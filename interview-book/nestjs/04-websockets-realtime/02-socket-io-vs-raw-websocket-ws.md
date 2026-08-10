# 02. Socket.IO vs raw WebSocket (ws)

> Source: `interview-prep/nestjs/04-websockets-realtime.md`

### Topics to learn
- [ ] Socket.IO's extras: automatic reconnection, rooms/namespaces, fallback transports, ack callbacks, built-in event multiplexing
- [ ] Raw `ws`: closer to the wire, smaller footprint, no built-in reconnection/room logic (you build it)
- [ ] Protocol compatibility: Socket.IO uses its own handshake/protocol on top of WS (not a plain WS client can't just connect to a Socket.IO server without the client library, generally)
- [ ] When lighter-weight `ws` is preferable (simple pub/sub, talking to non-JS/non-Socket.IO clients, minimal dependency footprint)

### Comparison table

| | Socket.IO | Raw `ws` |
|---|---|---|
| Reconnection | Built-in, automatic with backoff | Manual |
| Rooms/namespaces | Built-in | Manual (track your own maps) |
| Fallback transport | Can fall back to long-polling if WS is blocked | WS only |
| Client library required | Yes (Socket.IO client) | Any standard WS client works |
| Overhead | Slightly heavier | Minimal |
| Multiplexing (multiple logical channels over one connection) | Native (namespaces) | Manual |
| Good fit | Feature-rich app realtime (chat, live tracking, dashboards) | Simple bidirectional streams, IoT-style clients, when you want protocol-level control |

### Interview question

**Q: When would you choose raw `ws` over Socket.IO?**
> "When I don't need rooms/namespaces/auto-reconnect out of the box, want the smallest possible dependency and protocol overhead, or need to interoperate with a non-Socket.IO client (a different language/platform that only speaks plain WebSocket). For a feature-rich in-app realtime experience like live delivery tracking with per-order rooms and resilient reconnection on flaky mobile networks, Socket.IO's built-ins save real engineering time, which is why it's the more common default for product features."

---
