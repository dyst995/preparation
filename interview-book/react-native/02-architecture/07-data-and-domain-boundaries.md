# 07. Data and domain boundaries

> Source: `interview-prep/react-native/02-architecture.md`

### Topics to learn
- [ ] API DTOs vs UI models
- [ ] Mapping/adapters at the boundary
- [ ] Keeping money/calculation logic pure and tested
- [ ] Avoiding �god� API service files

### Example rule

- `api/` returns typed DTO
- `model/mappers.ts` converts to domain/UI model
- Screens never do ad-hoc field renaming everywhere

This becomes critical in fintech (balances, statuses, payment states).

---
