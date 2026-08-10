# 02. Context API  where it fits and where it fails

> Source: `interview-prep/react-native/03-state-management.md`

### Topics to learn
- [ ] Context for dependency injection (theme, i18n, services)
- [ ] Why Context is a poor high-frequency store
- [ ] Split contexts to avoid rerender fan-out
- [ ] Context + memoization realities

### Use Context for
- Theme
- I18n
- Auth �presence� at a coarse grain (sometimes)
- Injecting a query client or services

### Avoid Context for
- Rapidly changing values (e.g. scroll position, per-keystroke state)
- Large global business stores without selectors

### Answer sketch

> �Context is great for low-frequency app-wide dependencies. It�s not my default global data store because any value change re-renders consumers unless carefully split and memoized. For complex client state I prefer Zustand; for server state, React Query.�

---
