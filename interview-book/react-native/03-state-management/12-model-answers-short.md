# 12. Model answers (short)

> Source: `interview-prep/react-native/03-state-management.md`

### Zustand vs Redux vs React Query

> �React Query for server state. Zustand for lightweight global client/UI state. Redux when client workflows are complex or the codebase is already Redux-standardized. I avoid putting API caches into Redux by default.�

### How do you keep performance good with global state?

> �Narrow selectors, split stores by domain, keep high-frequency state local, and don�t put rapidly changing values in a wide global provider.�

---
