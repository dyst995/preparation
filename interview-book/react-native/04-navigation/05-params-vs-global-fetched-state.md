# 05. Params vs global/fetched state

> Source: `interview-prep/react-native/04-navigation.md`

### Use route params for
- IDs (`transferId`, `accountId`)
- Flow flags for this journey (`fromQr: true`)
- Small, serializable handoff data

### Do not put in params
- Huge objects / full API models (stale risk)
- Sensitive secrets
- Data that can change while the screen is open (prefer fetch by ID)

### Interview answer

> �I pass identifiers and flow context as params, then fetch authoritative data on the screen with React Query. That avoids stale param objects and keeps deep links simple.�

---
