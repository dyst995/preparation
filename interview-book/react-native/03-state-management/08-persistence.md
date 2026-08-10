# 08. Persistence

> Source: `interview-prep/react-native/03-state-management.md`

### Topics to learn
- [ ] What is safe to persist
- [ ] What must use Keychain/Keystore
- [ ] Zustand persist middleware caveats
- [ ] Rehydration timing and splash/bootstrap
- [ ] Migrating persisted schemas (versioning)

### Persist vs do not persist

| Persist OK (usually) | Do not persist in plain storage |
|---|---|
| Theme preference | Access/refresh tokens |
| Language | PANs / CVV / secrets |
| Non-sensitive UI flags | Raw personal financial payloads if avoidable |

### Interview answer

> �I persist non-sensitive UI preferences casually. Tokens and secrets go to secure storage. I version persisted state and handle rehydration explicitly during bootstrap so navigation doesn�t race.�

---
