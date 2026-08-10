# 08. Navigation resets & common flow completions

> Source: `interview-prep/react-native/04-navigation.md`

### When to reset

- Logout
- Finished onboarding
- Completed payment flow that shouldn�t back into intermediate confirm pages
- Switching organizations/accounts (if multi-tenant)

### Tools/concepts

- `CommonActions.reset`
- Replacing screens instead of endless pushes
- Nested reset when needed

### Example: payment success

After success, reset to `Receipt` with params, or replace confirm screens so back goes to wallet home, not amount entry.

---
