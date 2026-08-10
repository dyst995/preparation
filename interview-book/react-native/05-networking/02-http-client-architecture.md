# 02. HTTP client architecture

> Source: `interview-prep/react-native/05-networking.md`

### Topics to learn

- [ ] Axios vs fetch wrappers
- [ ] Base URL by environment
- [ ] Request interceptors (attach access token)
- [ ] Response interceptors (401 handling, normalization)
- [ ] Timeouts
- [ ] Request IDs / correlation IDs for support/debugging
- [ ] Cancelation (`AbortController`) when screens unmount

### Recommended layers

```text
UI / hooks (React Query)
  ? api functions (feature level)
    ? http client (shared)
      ? transport (axios/fetch)
```

Keep token logic out of screens.

---
