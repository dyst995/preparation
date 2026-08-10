# 14. Green flags / red flags

> Source: `interview-prep/react-native/04-navigation.md`

**Green**
- Hydration-aware auth gating
- Centralized link/notification routing
- Typed params
- Intentional resets after irreversible flow steps

**Red**
- `navigate('Home')` as the auth strategy
- Passing full objects in params as a habit
- Deep links that ignore auth
- Notification handlers calling navigate everywhere ad hoc

---
