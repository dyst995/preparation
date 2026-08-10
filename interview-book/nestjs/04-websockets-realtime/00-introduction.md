# 04 - WebSockets & Realtime: Gateways, Socket.IO vs WS, Socket Auth, FCM vs Sockets — Introduction

> Source: `interview-prep/nestjs/04-websockets-realtime.md`

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
