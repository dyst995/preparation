# 07. Error modeling

> Source: `interview-prep/react-native/05-networking.md`

### Topics to learn

- [ ] Normalize errors into a single app error type
- [ ] Distinguish: network down, timeout, 4xx, 5xx, validation
- [ ] Field-level validation errors vs global errors
- [ ] User-safe messages vs internal diagnostic details
- [ ] Mapping 401/403/409/422 specifically

### Suggested shape

```text
AppError {
  code: 'NETWORK' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'VALIDATION' | 'CONFLICT' | 'SERVER' | 'UNKNOWN'
  message: string          // user-facing
  details?: unknown        // field errors, etc
  correlationId?: string
  retriable: boolean
}
```

### UI mapping

- NETWORK ? offline banner / retry
- VALIDATION ? inline field errors
- UNAUTHORIZED ? session reset
- CONFLICT ? explain business conflict (e.g. already submitted)
- SERVER ? generic retry + support code

---
