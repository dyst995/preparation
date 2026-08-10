# 09. useFocusEffect, lifecycle, and data refresh

> Source: `interview-prep/react-native/04-navigation.md`

### Topics to learn
- [ ] Difference between mount and focus in nested tabs
- [ ] Refreshing data when a tab becomes focused
- [ ] Cleanup on blur
- [ ] Avoiding duplicate event subscriptions

### Gotcha

In tabs, screens may stay mounted. `useEffect` won�t re-run on focus. Use `useFocusEffect` for focus-driven refetch/logging.

---
