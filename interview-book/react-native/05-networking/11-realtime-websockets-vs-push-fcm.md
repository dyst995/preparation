# 11. Realtime: WebSockets vs push (FCM)

> Source: `interview-prep/react-native/05-networking.md`

### WebSockets / Socket.IO

Best for:

- Active session realtime (delivery status while app open)
- Collaborative / live dashboards
- Bi-directional messaging while connected

### FCM push

Best for:

- Notifying users when app is backgrounded/killed
- Event alerts (payment received, delivery update)
- Re-engagement / actionable taps into screens

### Often used together

Example from Clean House:

- WebSockets for live updates while using the app
- FCM for updates when not in foreground

### Interview answer

> �WebSockets give live in-app updates; push notifications wake or inform users when they�re not actively connected. For delivery tracking I�d use sockets during an active session and FCM for out-of-app updates. I wouldn�t replace push with sockets.�

---
