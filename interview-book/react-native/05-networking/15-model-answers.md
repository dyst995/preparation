# 15. Model answers

> Source: `interview-prep/react-native/05-networking.md`

### Network drop mid-transfer

> �UI is pending with an idempotency key. I do not let the user spam duplicate submits. I re-check transfer status with the server (status endpoint) instead of blindly posting again. Then I show success/failure based on authoritative status.�

### API versioning on mobile

> �Mobile clients lag behind backend deploys. I prefer additive changes, negotiated versioning, and backwards-compatible responses. Breaking changes require coordinated app release and min-version enforcement.�

---
