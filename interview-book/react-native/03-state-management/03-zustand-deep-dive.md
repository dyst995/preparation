# 03. Zustand  deep dive

> Source: `interview-prep/react-native/03-state-management.md`

### Topics to learn
- [ ] Creating stores
- [ ] Selectors and shallow comparison
- [ ] Actions colocated with state
- [ ] Slices pattern for larger stores
- [ ] Middleware: `persist`, `devtools`, `subscribeWithSelector`
- [ ] When to split multiple stores vs one store
- [ ] Avoiding storing server lists in Zustand

### Why Zustand works well in RN

- Minimal boilerplate
- Excellent selector-based subscriptions
- Easy to use outside React (rare, but useful)
- Fits feature-based architecture (feature stores or small app stores)

### Patterns

**Good:** UI/client store

```text
walletUiStore: { selectedAccountId, isFilterOpen, setSelectedAccountId }
```

**Bad:** duplicating transactions list already fetched by React Query

### Selector discipline

- Subscribe only to the slice you need
- Prefer multiple small selectors over selecting the whole store
- Keep actions stable

### Interview questions

**Q: How does Zustand prevent unnecessary re-renders?**

> �Components select slices of state. They re-render only when the selected value changes. If you select the entire store, you lose that benefit.�

**Q: One store or many?**

> �I start with small domain stores (auth, wallet UI). I merge only when coordination costs dominate. I don�t create a dozen toy stores for no reason.�

---
