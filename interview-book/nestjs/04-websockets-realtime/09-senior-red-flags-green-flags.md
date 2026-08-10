# 09. Senior red flags / green flags

> Source: `interview-prep/nestjs/04-websockets-realtime.md`

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
