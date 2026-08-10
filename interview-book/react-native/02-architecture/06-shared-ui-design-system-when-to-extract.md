# 06. Shared UI / design system  when to extract

> Source: `interview-prep/react-native/02-architecture.md`

### Don�t extract too early

If you have 2 buttons with similar padding, you don�t need a design system.

### Do extract when

- [ ] Multiple features repeat the same visual language
- [ ] Product has a UI kit / Figma library
- [ ] You need accessibility and consistency for fintech trust
- [ ] Cross-squad contribution needs constraints

### Design system contents (practical)

- Tokens: colors, spacing, typography, radii
- Primitives: Button, TextField, ListRow, Screen, InlineError
- Patterns: EmptyState, LoadingState, ErrorState
- Rules: no raw hex in features if tokens exist

### Interview answer

> �I extract a shared UI kit when repetition and inconsistency become real costs. I keep it at primitives + tokens first, not a gigantic abstraction layer. Feature-specific composites stay in the feature until they�re reused.�

---
