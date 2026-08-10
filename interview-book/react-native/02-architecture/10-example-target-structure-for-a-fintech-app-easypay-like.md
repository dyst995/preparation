# 10. Example target structure for a fintech app (EasyPay-like)

> Source: `interview-prep/react-native/02-architecture.md`

```text
src/
  app/
    providers/
    navigation/
    bootstrap/
  shared/
    ui/
    lib/http/
    lib/secure-storage/
    lib/money/
    hooks/
  features/
    auth/
    onboarding/
    wallet/
    qr-payments/
    transfers/
    loans/
    notifications/
    profile/
  native/                 # thin wrappers around native modules used app-wide
```

Be ready to draw this on a whiteboard in 60 seconds.

---
