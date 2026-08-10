# 04. Redux & Redux Toolkit  deep dive

> Source: `interview-prep/react-native/03-state-management.md`

### Topics to learn
- [ ] Single store + slices (RTK)
- [ ] Immutability via Immer in RTK
- [ ] Middleware (logging, listeners)
- [ ] When Redux complexity is justified
- [ ] DevTools time-travel value in complex flows
- [ ] Common overuse: stuffing everything into Redux

### When Redux still makes sense

- Complex multi-step client workflows with lots of cross-feature coordination
- Team already standardized on Redux
- Need mature middleware patterns / entity adapters for large client caches
- Existing codebase is Redux-heavy (Wizer-style ownership may include RTK Query)

### When Redux is unnecessary

- Mostly CRUD server data
- Simple UI state
- Small/medium apps where Zustand + React Query is enough

### Interview answer

> �Redux Toolkit is excellent when client-side state transitions are complex and shared widely. For many RN apps, React Query handles server state and Zustand handles light global client state with less boilerplate. I choose based on complexity, not fashion.�

---
