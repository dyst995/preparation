# 07. Notification ? navigation (deep-link-style routing)

> Source: `interview-prep/react-native/08-push-firebase-device.md`

### Topics to learn
- [ ] Designing a consistent notification data payload contract (e.g. `{ type: 'TRANSACTION', transactionId: '...' }`)
- [ ] Central notification-routing function mapping payload ? navigation action
- [ ] Reusing the same routing logic for real deep links and for notification taps (DRY)
- [ ] Auth-gating: what if the target screen requires login and the user is logged out?
- [ ] Validating the payload before trusting it (never navigate blindly on untrusted/malformed data)

### Payload contract example

```ts
type NotificationData = {
  type: 'TRANSACTION' | 'CHAT' | 'PROMO' | 'SECURITY_ALERT';
  id?: string;
};

function routeFromNotification(data: NotificationData, navigationRef: NavigationRef) {
  if (!isAuthenticated()) {
    // queue it, send to login, resume after auth
    pendingDeepLink.set(data);
    navigationRef.navigate('Login');
    return;
  }

  switch (data.type) {
    case 'TRANSACTION':
      if (!data.id) return; // guard against malformed payload
      navigationRef.navigate('TransactionDetails', { id: data.id });
      break;
    case 'CHAT':
      navigationRef.navigate('ChatThread', { threadId: data.id });
      break;
    // ...
  }
}
```

### Interview question

**Q: How do you open a specific screen from a push notification?**

> "I standardize a small typed payload contract from the backend � a `type` plus an id. I have one central routing function that maps that payload to a navigation action, and I reuse the same function whether the trigger was a real deep link URL or a tapped notification, so the logic isn't duplicated. I validate the payload before navigating � malformed or missing ids just no-op rather than crash. If the user isn't authenticated, I stash the intended destination, send them through login, and resume navigation after auth succeeds instead of losing their intent."

---
