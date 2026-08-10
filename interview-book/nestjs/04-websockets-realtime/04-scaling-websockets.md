# 04. Scaling WebSockets

> Source: `interview-prep/nestjs/04-websockets-realtime.md`

### Topics to learn
- [ ] Why WebSockets are stateful/sticky - a client stays connected to one specific server instance
- [ ] Sticky sessions at the load balancer (route by cookie/IP hash) when running multiple instances
- [ ] The cross-instance broadcast problem: if client A is on instance 1 and needs a message triggered by an event on instance 2, plain in-memory `server.emit()` can't reach it
- [ ] Redis adapter (`@socket.io/redis-adapter`) - pub/sub across instances so `server.emit()` reaches all connected clients regardless of which instance they're on
- [ ] Horizontal scaling implications for background job workers that need to push realtime updates (VetApp/Clean House background processing -> socket notification)

### Redis adapter setup (concept)

```typescript
const pubClient = createClient({ url: redisUrl });
const subClient = pubClient.duplicate();
await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));
```

With this in place, `server.to(room).emit(...)` on *any* instance reaches clients connected to *any* instance, because the adapter republishes emits through Redis pub/sub to all instances.

### Interview question

**Q: If you scale your NestJS app to 3 instances behind a load balancer, what breaks with WebSockets first?**
> "Two things: the load balancer needs sticky sessions so a client's WS connection consistently reaches the same instance during its lifetime (or at least during the handshake for transports that upgrade), and any server-side `emit()` triggered by, say, a background job or a request landing on a *different* instance than the target client's connection won't reach that client without a shared broadcast layer. The standard fix is the Socket.IO Redis adapter - each instance publishes emits to Redis, and every instance subscribes and re-emits to its own locally connected clients, so it looks like one logical server from the outside."

---
