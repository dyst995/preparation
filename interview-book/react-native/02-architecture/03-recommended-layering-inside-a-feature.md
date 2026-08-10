# 03. Recommended layering inside a feature

> Source: `interview-prep/react-native/02-architecture.md`

Even inside `features/payments/`, separate concerns:

```text
features/payments/
  ui/           # presentational components
  screens/      # route-level composition
  hooks/        # view-model-ish hooks
  model/        # types, validators, pure domain helpers
  api/          # REST/React Query endpoints
  native/       # feature-specific native wrappers (if needed)
  index.ts      # export only what other features may use
```

### Dependency direction (important)

```text
screens ? hooks ? api/model
ui ? hooks/screens
shared ? features (features may import shared)
features should NOT freely import other features� internals
```

Cross-feature communication options:
1. Import from the other feature�s **public** `index.ts` only
2. Lift shared contracts into `shared/`
3. Use app-level events/navigation params carefully (don�t build a global event bus unless needed)

---
