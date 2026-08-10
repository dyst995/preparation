# 06. Error handling & reconnection

> Source: `interview-prep/nestjs/04-websockets-realtime.md`

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
