# 07. Push notification ? screen routing

> Source: `interview-prep/react-native/04-navigation.md`

### Topics to learn
- [ ] Notification payload conventions (`type`, `entityId`)
- [ ] Handling taps in foreground/background/killed states
- [ ] Deduplicating navigation actions
- [ ] Combining with deep link infrastructure
- [ ] Notifee / FCM interaction points

### Robust approach

- Define a small router: `notification.type ? navigation action`
- Centralize it (don�t scatter navigation in every push handler)
- Ensure NavigationContainer is ready before navigating
- Queue navigation intents if app still bootstrapping

### Interview question

**Q: How do you open a specific screen from a notification?**

> �The notification payload carries a type and entity id. A central handler waits until navigation and auth are ready, maps that payload to a typed navigation action, and routes into the correct nested screen. I reuse the same validation rules as deep links.�

---
