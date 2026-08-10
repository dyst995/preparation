# 10. Derived state and duplication traps

> Source: `interview-prep/react-native/03-state-management.md`

### Anti-patterns

- Copying React Query data into Zustand �for convenience�
- Storing filtered lists separately instead of deriving
- Multiple sources for `user`

### Better

- Select/filter from query data in render or via memoized selectors
- Keep canonical user profile in React Query
- Keep `selectedUserId` (client choice) in Zustand if needed

---
