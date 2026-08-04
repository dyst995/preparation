# 04 - WebSockets & Realtime: Gateways, Socket.IO vs WS, Socket Auth, FCM vs Sockets

> Goal: design a realtime feature end to end - gateway, auth, scaling - and make a confident, reasoned call between WebSockets and push notifications, using the Clean House delivery-tracking system as your reference story.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Explain what a Nest Gateway is and how it maps to Socket.IO/WS under the hood.
2. Compare Socket.IO and raw `ws`, and justify picking one.
3. Implement authentication on a WebSocket connection, not just HTTP routes.
4. Explain how to scale WebSockets horizontally (sticky sessions, Redis adapter).
5. Make a clear, defensible call between WebSockets and FCM push notifications for a given feature, tied to the Clean House real-time delivery story.
6. Handle socket errors, disconnects, and reconnection gracefully.

---

## 1. Gateways in NestJS

### Topics to learn
- [ ] `@WebSocketGateway()` decorator, optional port/namespace/options
- [ ] `@SubscribeMessage('event')` to handle inbound events
- [ ] `@WebSocketServer()` to access the underlying server instance (emit to rooms/broadcast)
- [ ] Gateway lifecycle hooks: `OnGatewayInit`, `OnGatewayConnection`, `OnGatewayDisconnect`
- [ ] Namespaces (`/delivery`, `/chat`) to logically separate concerns on one server
- [ ] Rooms (per-order, per-user, per-clinic) to scope broadcasts

### Minimal gateway

```typescript
@WebSocketGateway({ namespace: 'delivery', cors: { origin: '*' } })
export class DeliveryGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinOrderRoom')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() orderId: string) {
    client.join(`order:${orderId}`);
    return { event: 'joinedOrderRoom', data: orderId };
  }

  notifyOrderStatusChange(orderId: string, status: string) {
    this.server.to(`order:${orderId}`).emit('orderStatusChanged', { orderId, status });
  }
}
```

The service layer (e.g. `DeliveryService`) calls `notifyOrderStatusChange()` after updating the DB - the gateway is the transport, not where business logic lives, same principle as controllers.

### Rooms vs namespaces

| | Namespace | Room |
|---|---|---|
| Purpose | Logical separation of a whole feature area | Fine-grained grouping within a namespace (e.g. one room per order) |
| Set at | Connection time (`io('/delivery')`) | Any time via `socket.join(roomName)` |
| Typical use | `/delivery`, `/chat`, `/admin` | `order:123`, `user:45`, `clinic:7` |

### Interview questions

**Q: What does a Nest Gateway actually wrap?**
> "By default it wraps Socket.IO - `@WebSocketGateway` sets up a Socket.IO server/namespace, `@SubscribeMessage` maps to Socket.IO event listeners, and `@WebSocketServer()` gives me the raw server instance to emit/broadcast from outside a single client handler, e.g. from a service after a DB update. Nest can also be configured to use the raw `ws` adapter instead, if you don't need Socket.IO's extra features."

**Q: Why put clients into rooms instead of broadcasting everything to everyone?**
> "Rooms scope broadcasts to only the clients who care - e.g. only the customer and driver tracking a specific delivery join `order:123`. Broadcasting globally and filtering client-side wastes bandwidth and leaks other users' data to every connected client."

---

## 2. Socket.IO vs raw WebSocket (`ws`)

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

## 3. Authenticating WebSocket connections

### Topics to learn
- [ ] Why HTTP guards (`AuthGuard('jwt')`) don't automatically protect gateways
- [ ] Passing the JWT during the handshake (`auth` payload, or query param, or header depending on client)
- [ ] Verifying the token in `handleConnection` (or a dedicated `WsGuard` using `CanActivate` for `@SubscribeMessage` handlers)
- [ ] Disconnecting unauthorized clients immediately, not just ignoring their messages
- [ ] `WsException` for surfacing structured errors back to the client
- [ ] Re-authenticating on token refresh (short-lived access tokens expiring mid-connection)

### Handshake-based auth

```typescript
// client
const socket = io('/delivery', { auth: { token: accessToken } });
```

```typescript
handleConnection(client: Socket) {
  try {
    const token = client.handshake.auth?.token;
    const payload = this.jwtService.verify(token, { secret: this.config.get('JWT_ACCESS_SECRET') });
    client.data.user = payload; // attach identity for later use in this connection's lifetime
  } catch {
    client.emit('error', { message: 'Unauthorized' });
    client.disconnect(true);
  }
}
```

### Guard-based auth for individual messages

```typescript
@Injectable()
export class WsJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    return !!client.data.user; // set during handleConnection
  }
}

@UseGuards(WsJwtGuard)
@SubscribeMessage('sendMessage')
handleMessage(@ConnectedSocket() client: Socket, @MessageBody() dto: SendMessageDto) { /* ... */ }
```

### Handling mid-connection token expiry

Since access tokens are short-lived but a socket connection can stay open for a long time, options:
1. Re-validate on a timer and force a client-side re-handshake with a fresh token before expiry.
2. Accept a "refresh" event over the socket carrying a new token, re-verify, and update `client.data.user`.
3. Simpler: keep the connection auth check coarse (connection-time only) but scope sensitive actions to also re-check via `WsJwtGuard` against a short grace window, disconnecting if it's expired.

### Interview questions

**Q: Why doesn't my existing `AuthGuard('jwt')` protect my WebSocket gateway automatically?**
> "Because that guard is written against the HTTP execution context - it reads `Authorization` headers off an HTTP request. A WebSocket connection's handshake is a different execution context (`context.switchToWs()`), so I need a WS-specific way to extract and verify the token, typically from the handshake `auth` payload, and a guard adapted to read from the socket handshake instead of an HTTP request object."

**Q: How do you handle an access token expiring while a socket connection is still open?**
> "Either proactively refresh: the client re-authenticates over the socket (or reconnects) with a new token shortly before expiry, verified server-side and used to update the connection's stored identity; or reactively: guard sensitive events with a fresh expiry check and disconnect if it's stale, forcing the client to reconnect with a fresh token. I'd lean proactive for a long-lived feature like live delivery tracking, since a mid-track disconnect is a worse UX than a silent background token refresh."

---

## 4. Scaling WebSockets

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

## 5. WebSockets vs Firebase Cloud Messaging (FCM) - the Clean House decision

This is one of your strongest cross-domain stories: **you implemented real-time delivery updates using *both* WebSockets and FCM together on Clean House**, which is exactly the "know when to use which" answer interviewers are fishing for.

### Topics to learn
- [ ] What each technology is actually good at
- [ ] App state matters: foreground vs background vs killed
- [ ] Delivery guarantees: sockets are "while connected," FCM is "best-effort but OS-delivered even when the app isn't running"
- [ ] Battery/connection cost trade-offs
- [ ] The common production pattern: sockets for live in-app experience, push for out-of-app/background alerting
- [ ] Debouncing/throttling to avoid overwhelming either channel with high-frequency updates (e.g. live GPS coordinates)

### Decision table

| | WebSockets | FCM (push notification) |
|---|---|---|
| Works when app is foregrounded | Yes, ideal - live, low-latency, bidirectional | Overkill; usually suppressed/handled silently |
| Works when app is backgrounded | Only briefly, OS suspends the connection eventually | Yes - this is exactly what FCM is for |
| Works when app is killed | No | Yes |
| Latency | Very low, real-time | Seconds of delay possible, best-effort |
| Delivery guarantee | None beyond "while connected" (must design for reconnect/replay) | Best-effort via OS/Google's infrastructure, generally reliable but not guaranteed |
| Good for | Live tracking screen open, live chat, live dashboards, typing indicators | "Your delivery has arrived," "your order status changed," re-engagement, anything the user needs to know even with the app closed |
| Battery/connection cost | Persistent connection has some baseline cost | Cheap - OS-managed, no persistent app connection needed |

### The Clean House pattern (your actual answer)

> "On Clean House, when the customer or driver has the app open and is actively watching a delivery, I push live updates over WebSockets - driver location, status changes - because it needs to feel instant and the connection is already open. But drivers and customers don't keep the app open the whole time, so for anything that needs to reach them regardless of app state - 'delivery assigned,' 'driver arrived,' 'delivery completed' - I send it through Firebase Cloud Messaging, which the OS delivers even if the app is backgrounded or killed. In practice the backend does both: it updates the DB, emits over the socket to whoever's actively connected to that order's room for the live experience, and also fires an FCM push for the state-change events that matter even if nobody's looking at the screen right now."

### Interview questions

**Q: Why not just use WebSockets for everything realtime, including notifications?**
> "Because a WebSocket connection doesn't survive the app being backgrounded for long or killed outright on mobile OSes - the OS suspends network activity to save battery. If a driver's app is killed and I only rely on sockets, they simply never find out a new delivery was assigned. FCM exists specifically to be delivered by the OS outside of the app's own process, which is the only reliable channel for that scenario."

**Q: Why not just use FCM for everything and skip sockets?**
> "FCM has meaningful latency (seconds, sometimes more under poor conditions) and isn't designed for high-frequency updates like live GPS coordinates every few seconds - that would spam the notification system and drain battery/quota. For an actively open live-tracking screen, a socket connection gives near-instant updates without generating a notification for every tiny movement."

**Q: How do you avoid overwhelming a socket connection with very frequent location updates?**
> "Throttle/debounce on the emitting side - e.g. only emit location updates at most every few seconds, or only when the position changed meaningfully - rather than emitting on every raw GPS tick. The client also only needs smooth-enough updates for a map marker, not every single reading."

---

## 6. Error handling & reconnection

### Topics to learn
- [ ] `WsException` for structured errors from gateway handlers
- [ ] Global WS exception filter (`@Catch(WsException)` with `WsExceptionsHandler` concepts)
- [ ] Client-side reconnection strategy (Socket.IO's built-in backoff, or manual for raw `ws`)
- [ ] Idempotent room-rejoin on reconnect (client rejoins `order:123` after reconnecting, doesn't assume state survived)
- [ ] Detecting stale/zombie connections (heartbeat/ping-pong, `pingInterval`/`pingTimeout` in Socket.IO)

### Interview question

**Q: What happens to in-flight room membership if a client's socket disconnects and reconnects?**
> "Room membership doesn't survive a reconnect - a new connection is a new socket ID. The client needs to re-join the rooms it cares about right after reconnecting, e.g. re-emit `joinOrderRoom` for the order it was tracking. I treat 'reconnected' as 're-establish all subscriptions,' not 'automatically resumed where we left off,' and I make sure rejoin logic is idempotent so it's safe to call even if the server never actually dropped the room."

---

## Full interview question bank (rapid fire)

1. **What does `@WebSocketGateway()` wrap by default?** -> Socket.IO server/namespace.
2. **Socket.IO vs raw `ws` - name two differences.** -> reconnection/rooms built-in vs manual; fallback transport vs WS-only.
3. **Why doesn't an HTTP `AuthGuard` protect a gateway?** -> different execution context; must read from the socket handshake, not HTTP headers.
4. **How do you scale WebSockets across multiple server instances?** -> sticky sessions + Redis adapter for cross-instance broadcast.
5. **WebSockets vs FCM - what's the deciding factor?** -> app state (foreground/live vs background/killed) and latency/guarantee needs.
6. **How do you avoid flooding a socket with high-frequency data?** -> throttle/debounce emits.
7. **What happens to room membership on reconnect?** -> lost; client must re-join explicitly.
8. **What's `WsException` for?** -> structured error responses from gateway handlers, analogous to `HttpException`.

---

## Hands-on drills

- [ ] Build a minimal gateway with a `joinRoom` event and a service method that emits to that room.
- [ ] Add handshake-based JWT auth to the gateway; disconnect unauthorized clients.
- [ ] Write a `WsJwtGuard` and apply it to a specific `@SubscribeMessage` handler.
- [ ] Sketch (on paper) the Redis adapter architecture across 3 server instances and 2 connected clients on different instances.
- [ ] Write out, from memory, the WebSockets-vs-FCM decision table, then compare it to this chapter.
- [ ] Rehearse the Clean House realtime delivery story out loud in under 90 seconds.

---

## Senior red flags / green flags

### Green flags
- Frames the WS-vs-FCM decision around **app state** (foreground/background/killed), not just "one is faster."
- Knows gateways need their own auth handling, not inherited HTTP guards.
- Has a concrete plan for scaling WebSockets horizontally (sticky sessions + Redis adapter), not just "it'll work."
- Thinks about reconnection and room-rejoin explicitly, not just the happy path.
- Can describe using both technologies *together* in the same feature, not as an either/or.

### Red flags
- "WebSockets and push notifications do the same thing."
- Assumes a socket connection survives app backgrounding/killing on mobile.
- No answer for scaling WebSockets beyond a single instance.
- Doesn't throttle high-frequency emits (e.g. raw GPS ticks).
- Thinks HTTP guards automatically protect gateways.

---

## Tie-backs to your experience

- **Clean House**: real-time delivery updates via WebSockets *and* FCM - your primary, most concrete story for this entire chapter.
- **VetApp**: background jobs (chapter 06) could plausibly emit socket notifications for appointment confirmations to an admin dashboard - a reasonable extension to mention if asked "would you add realtime to VetApp?"
- **Freelance work**: Socket.IO explicitly listed among your freelance stack - broadens this beyond a single project if probed for range.

---

## Mastery checklist

- [ ] I can implement a gateway with rooms and namespace from memory.
- [ ] I can explain and implement handshake-based JWT auth for sockets.
- [ ] I can explain horizontal scaling of WebSockets (sticky sessions + Redis adapter).
- [ ] I can give a crisp, confident WebSockets-vs-FCM decision framework.
- [ ] I have a rehearsed Clean House realtime STAR story under 90 seconds.
