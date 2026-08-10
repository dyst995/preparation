# 03. Authenticating WebSocket connections

> Source: `interview-prep/nestjs/04-websockets-realtime.md`

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
