# 01. Gateways in NestJS

> Source: `interview-prep/nestjs/04-websockets-realtime.md`

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
