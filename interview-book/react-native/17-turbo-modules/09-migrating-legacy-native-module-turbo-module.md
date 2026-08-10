# 09. Migrating legacy Native Module -> Turbo Module

> Source: `interview-prep/react-native/17-turbo-modules.md`

### Step playbook

1. **Inventory** methods, events, constants, threading assumptions
2. **Write a Codegen spec** matching the public JS contract
3. **Implement native** against generated interfaces
4. **Keep JS facade stable** so features don't churn
5. **Enable New Arch** in a branch / gated build
6. **Verify** on real devices; watch startup and first-use latency
7. **Remove** duplicate legacy path after confidence

### Risk matrix

| Risk | Mitigation |
|---|---|
| Library dependency not Turbo-ready | Interop layer; upgrade library; wrap yourself |
| Spec misses an edge method | Audit JS usage; add tests around facade |
| Sync method accidentally heavy | Ban sync except allowlisted methods |
| iOS/Android parity drift | Spec is gate; reject platform-only surprises unless documented |

---
