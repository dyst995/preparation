# 11. Senior-Level Best Practices

> Source: `interview-prep/nestjs/04-websockets-realtime.md`

### Decision framework: designing for multi-instance WebSocket scale from day one

Even if you're launching on a single instance, design decisions made early determine how painful scaling out later is. Ask these questions before the first gateway is written, not after the second server is added:

1. **Will state (room membership, connection metadata) ever need to be visible outside the process that holds the socket?** If yes - and it almost always eventually is, once you scale past one instance - avoid keeping that state *only* in local process memory (a plain JS `Map` of `orderId -> Set<socketId>`) as the single source of truth; treat it as a local cache of something that could be reconstructed or is mirrored externally.
2. **Does a broadcast ever need to originate from outside a socket handler** - a background job, a Route Handler, a webhook, a cron reconciliation task? If yes, that emit has to reach clients connected to *any* instance, not just the instance that happens to run that code path - this is the exact problem the Redis adapter solves, and it's needed the moment any non-gateway code needs to emit.
3. **What's the actual concurrency/connection-count target?** A few hundred concurrent sockets on one instance is a non-issue; tens of thousands starts requiring attention to per-instance connection limits, file descriptor limits, and memory per connection - know roughly where the current design's ceiling is even if you're nowhere near it yet.
4. **Is sticky-session routing actually available at your load balancer layer?** Not every LB/hosting setup supports it cleanly (some serverless/edge platforms don't support persistent WebSocket connections at all) - this can be a hard constraint that shapes the whole realtime architecture, not just a scaling detail to handle later.

### Multi-instance WebSocket scaling - the full picture

```
                     +------------------+
   Client A -------> |  Load Balancer   |
   Client B -------> |  (sticky by      |
   Client C -------> |   cookie/IP)     |
                     +------------------+
                        |      |      |
                  Instance 1  Instance 2  Instance 3
                  (Client A)  (Client B)  (Client C)
                        \        |        /
                         \       |       /
                          +-------------+
                          |    Redis    |   <- pub/sub backbone
                          | (adapter)   |
                          +-------------+
```

- **Sticky sessions are necessary but not sufficient.** They keep a given client's connection consistently reaching the same instance, which handles the "client stays connected" half of the problem. They do nothing for the "an event from instance 2 needs to reach a client connected to instance 1" half - that's the Redis adapter's job, and skipping it is the most common mistake when a team scales out WebSockets for the first time (things mostly work because most traffic happens to originate from the same instance the client is on, until it doesn't, and a customer reports "I didn't get the update").
- **Redis adapter overhead is real but usually acceptable.** Every emit gets published to Redis and re-delivered to every instance (which then filters to only its own locally-connected clients in the relevant room), so there's a small latency and Redis-load cost per emit. For most product realtime use cases (delivery tracking, chat, dashboards) this is negligible; for extremely high-frequency, high-fanout broadcasts, it's worth load-testing specifically, since Redis pub/sub throughput and Redis itself can become the new bottleneck.
- **Reconnection storms.** If an instance goes down (deploy, crash, autoscale-in), every client connected to it disconnects simultaneously and reconnects, often to a different instance - a burst of reconnection + room-rejoin traffic hitting the remaining instances at once. Client-side reconnection backoff (Socket.IO's default exponential backoff helps) and server-side connection-rate awareness matter more at scale than in a single-instance setup where this scenario barely comes up.
- **Horizontal scaling changes how you think about connection-scoped rate limiting/throttling.** A per-connection message-rate limit implemented in local memory (a simple counter on the socket object) still works fine per-connection regardless of instance count, since it's scoped to one socket - but a *per-user* limit across that user's multiple simultaneous connections (web tab + mobile app, or multiple browser tabs) needs a shared store (Redis) the same way any other cross-instance shared state does.
- **Deploys are trickier with long-lived connections than with stateless HTTP.** A rolling deploy that terminates instance 1 forces every client connected there to reconnect - for a live delivery-tracking screen, that's a brief, tolerable blip if reconnection/room-rejoin logic is solid; for something more sensitive to interruption, consider draining connections (stop accepting new ones, wait for existing ones to naturally end or hit a max drain timeout) before terminating an instance, rather than a hard kill.

### Anti-patterns and failure modes

| Anti-pattern | Why it hurts | Fix |
|---|---|---|
| Room membership tracked only in a local in-memory `Map`, no Redis adapter | Broadcasts from other instances/background jobs silently never reach some clients | Configure the Socket.IO Redis adapter before scaling past one instance |
| No sticky sessions configured at the load balancer | Handshake/upgrade requests can bounce between instances mid-connection, causing connection failures | Configure sticky sessions (cookie or IP-hash based) at the LB layer |
| Assuming room membership survives a client reconnect | Client silently stops receiving updates for a room it thinks it's still in after a network blip | Client always re-joins rooms explicitly on every reconnect, treated as idempotent |
| No backpressure/throttling on high-frequency emits (raw GPS ticks, cursor positions) | Floods the Redis pub/sub layer and every instance's outbound socket buffers under load | Throttle/debounce at the source before emitting, not just at the client render layer |
| HTTP `AuthGuard` assumed to protect a gateway automatically | Gateway silently accepts unauthenticated connections | Explicit handshake-based auth check in `handleConnection`, separate from HTTP guards |
| No plan for instance termination during deploys | Every deploy causes a visible connection drop/reconnect burst for all connected clients | Client-side reconnect backoff + idempotent room-rejoin; consider connection draining before hard termination |

### Observability for realtime systems

- **Connections per instance** - a skewed distribution (one instance holding far more connections than others) can indicate a sticky-session misconfiguration or an uneven initial connection-routing decision at the LB.
- **Redis pub/sub message rate and latency** - since it's now a hard dependency for cross-instance delivery, its health directly determines whether "instance 2's event reaches instance 1's clients" works at all; treat it with the same monitoring rigor as the primary database.
- **Reconnection rate over time** - a baseline level is normal (network blips, mobile backgrounding); a sudden spike correlates strongly with a bad deploy, an instance crash, or a load-balancer health-check misfire.
- **Room join/leave event counts vs active connection counts** - a growing mismatch (far more joins than active connections would suggest) can indicate clients failing to properly leave rooms on disconnect, a slow memory/state leak on the server side over time.
- **Per-gateway-event latency** (time from a service-layer event to the emit actually reaching the client) - especially useful for diagnosing whether a "felt slow" report is a real backend delay or a client-side rendering issue.

### Team/scalability practices

- Document, explicitly, which events go over WebSockets and which go over FCM/push (or another out-of-band channel) as a living decision table, not tribal knowledge - this is exactly the kind of thing a new engineer will get wrong by intuition alone (assuming "realtime feature = socket" without considering app-backgrounded/killed states).
- Load-test realtime infrastructure specifically, not just HTTP endpoints - connection count, message fan-out rate, and Redis adapter throughput behave very differently under load than typical REST traffic patterns, and standard HTTP load-testing tools often don't model WebSocket connection lifecycles well.
- Treat the Redis instance backing the Socket.IO adapter as a production dependency with its own on-call/monitoring story, not an implementation detail - if it goes down, cross-instance realtime silently degrades to "only same-instance clients see updates," which is a subtle, hard-to-notice failure mode rather than a loud outage.

### Harder senior follow-up Q&A

**Q: Your Redis instance backing the Socket.IO adapter goes down for two minutes. What actually happens to connected clients, and how bad is it really?**
> "Existing connections to their own instance generally stay alive - the Redis adapter is for cross-instance pub/sub, not for holding the connections themselves - but any broadcast that needs to reach a client on a *different* instance than the one triggering the emit silently fails to deliver during that window, with no error surfaced by default. It's a quiet degradation, not a loud outage: same-instance clients keep working, cross-instance delivery just stops. I'd want monitoring specifically on the Redis adapter's connection health so this shows up as an alert rather than being discovered via a delayed-delivery user complaint."

**Q: How would you load-test a WebSocket-based delivery-tracking feature before a scaling milestone (say, 10x expected concurrent users)?**
> "I'd simulate realistic connection lifecycles, not just raw connection count - ramping up N concurrent client connections that each join a room, receive a realistic rate of location-update emits, and periodically disconnect/reconnect to simulate mobile network flakiness, using a tool that actually speaks the Socket.IO protocol (a raw WebSocket load tester won't accurately represent Socket.IO's handshake/room semantics). I'd watch per-instance CPU/memory, Redis pub/sub latency and throughput, and end-to-end emit-to-client-delivery latency under load, specifically looking for the point where cross-instance delivery latency starts degrading before connection count itself becomes the bottleneck."

**Q: A customer says they received a delivery-status push notification but the in-app live tracking screen never updated even though they had the app open. What's your first hypothesis?**
> "That's a strong signal the FCM push fired correctly (so the underlying event and the notification pipeline both worked) but the WebSocket delivery path specifically failed for that client - either their socket had silently disconnected without the client realizing it (a stale connection the client thinks is alive), they never rejoined the relevant room after a prior reconnect, or the emit happened on an instance that couldn't reach their instance via the Redis adapter. I'd check server-side logs for that connection around the event time - was it connected, was it in the expected room, did the emit actually get published - rather than assuming it's a client-side rendering bug first, since the two delivery channels (FCM vs socket) succeeding/failing independently is exactly what you'd expect if they're genuinely separate pipelines, which is the whole point of using both."

**Q: How do you handle authorization for joining a room - what stops a malicious client from just joining `order:12345` for an order that isn't theirs?**
> "Room joining has to be authorized server-side, not trusted from the client's request - the `joinOrderRoom` handler should look up the authenticated user attached to the socket (from `client.data.user`, set during handshake auth) and verify that user actually has a relationship to that order (customer or assigned driver) before calling `client.join()`, exactly the same ownership-check discipline as an HTTP endpoint. Silently trusting whatever room name the client sends is the WebSocket equivalent of trusting a client-supplied user ID on an HTTP request instead of using the authenticated identity - it would let any connected client eavesdrop on any order's live updates just by guessing or enumerating IDs."

**Q: You need to add a feature where an admin dashboard shows a live count of currently-connected drivers across the whole fleet, updated in real time, in a multi-instance deployment. How do you implement the count itself?**
> "I would not try to sum an in-memory counter across instances directly - each instance only knows about its own locally-connected clients. Instead, each instance would increment/decrement a shared Redis counter (or Redis set of connected driver IDs, which also handles the 'same driver connected twice' case correctly) on connect/disconnect, and the admin dashboard's live count would read from that Redis-backed source of truth, updated via the same Redis-adapter-backed broadcast mechanism already in place, rather than each instance independently trying to guess the fleet-wide total from its own partial view."

---
