# 07. Full interview question bank (rapid fire)

> Source: `interview-prep/nestjs/04-websockets-realtime.md`

1. **What does `@WebSocketGateway()` wrap by default?** -> Socket.IO server/namespace.
2. **Socket.IO vs raw `ws` - name two differences.** -> reconnection/rooms built-in vs manual; fallback transport vs WS-only.
3. **Why doesn't an HTTP `AuthGuard` protect a gateway?** -> different execution context; must read from the socket handshake, not HTTP headers.
4. **How do you scale WebSockets across multiple server instances?** -> sticky sessions + Redis adapter for cross-instance broadcast.
5. **WebSockets vs FCM - what's the deciding factor?** -> app state (foreground/live vs background/killed) and latency/guarantee needs.
6. **How do you avoid flooding a socket with high-frequency data?** -> throttle/debounce emits.
7. **What happens to room membership on reconnect?** -> lost; client must re-join explicitly.
8. **What's `WsException` for?** -> structured error responses from gateway handlers, analogous to `HttpException`.

---
