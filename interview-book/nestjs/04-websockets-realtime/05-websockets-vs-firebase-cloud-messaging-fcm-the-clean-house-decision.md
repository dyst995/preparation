# 05. WebSockets vs Firebase Cloud Messaging (FCM) - the Clean House decision

> Source: `interview-prep/nestjs/04-websockets-realtime.md`

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
