# 02. Type-based vs feature-based architecture

> Source: `interview-prep/react-native/02-architecture.md`

### Type-based (common in early apps)

```text
src/
  components/
  screens/
  hooks/
  services/
  utils/
  store/
```

**Pros**
- Easy to start
- Familiar to beginners

**Cons**
- Related code is scattered
- Changes to one feature touch many folders
- Hard to delete/refactor a feature safely
- Encourages a junk-drawer `utils/` and giant `components/`

### Feature-based (what you should defend)

```text
src/
  app/                    # app shell: providers, navigation root, config
  shared/                 # truly cross-feature primitives
    ui/
    lib/
    hooks/
    types/
  features/
    auth/
      api/
      model/
      ui/
      screens/
      hooks/
      index.ts             # public API of the feature
    wallet/
    payments/
    transfers/
    profile/
```

**Pros**
- High cohesion: everything for payments lives together
- Easier ownership by squads
- Easier to lazy-load or isolate
- Refactors are localized
- Public `index.ts` can hide internals

**Cons**
- Requires discipline about shared code
- Over-segmentation can create tiny noisy folders
- Need clear rules for cross-feature imports

### Interview answer

> �I prefer feature-based architecture for production apps. Each feature owns its screens, UI pieces, hooks, API calls, and domain logic. Shared code is only what is genuinely reused. This is how I modernized legacy apps: instead of a giant screens/components soup, we moved boundaries around business capabilities � wallet, auth, feed, etc. � which improved maintainability and reduced regression risk.�

---
