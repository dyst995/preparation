# 11. Interview question bank (detailed)

> Source: `interview-prep/react-native/02-architecture.md`

### Q1. How would you structure a mid-size fintech RN app from scratch?

**Answer framework:**
1. App shell + providers
2. Feature folders by business capability
3. Shared UI tokens/primitives
4. Auth-conditioned navigation
5. React Query for server state, small client store for UI/session extras
6. Secure storage for tokens
7. Native module boundary isolated
8. CI + staging flavor from day one

### Q2. Why feature-based over `components/` + `screens/`?

High cohesion, easier ownership, safer refactors, better scalability. Give a legacy pain example.

### Q3. How do features communicate?

Public exports, shared contracts, navigation params for flow state, server as source of truth for business data. Avoid circular imports.

### Q4. Where do you put reusable buttons and form controls?

`shared/ui` if generic; feature UI if domain-specific (e.g. `TransferAmountInput`).

### Q5. How do you prevent architecture decay?

- Module boundary linting
- Code review checklists
- �No new code in legacy folders�
- Periodic dependency reviews
- Keep features� public APIs narrow

### Q6. Walk through modernizing a legacy RN app.

Use the strangler playbook above + your crash metrics.

### Q7. How do you handle multiple products/white-labels?

Flavors, theming tokens, feature flags, careful native package naming. Don�t fork the whole repo if avoidable.

### Q8. When is microfrontends/package-splitting worth it in RN?

Usually later: monorepo packages for shared UI/core when multiple apps or teams need clear ownership. Not a day-one requirement for one app.

---
