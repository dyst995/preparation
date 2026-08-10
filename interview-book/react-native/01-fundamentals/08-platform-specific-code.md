# 08. Platform-specific code

> Source: `interview-prep/react-native/01-fundamentals.md`

### Topics to learn
- [ ] `Platform.OS`, `Platform.select`
- [ ] File extensions: `.ios.tsx`, `.android.tsx`, `.native.tsx`
- [ ] When to split files vs inline selects
- [ ] Avoiding �platform soup� scattered everywhere

### Decision guide

| Approach | Use when |
|---|---|
| `Platform.select` | Small style/value differences |
| `Platform.OS` conditionals | Small behavioral branches |
| Separate platform files | Different structure, native APIs, or large divergence |
| Native module | Capability doesn�t exist in JS |

### Interview question

**Q: Platform.OS vs separate files?**

> �I use `Platform.select` for small differences like padding or shadow styles. If the screen structure, native API usage, or logic diverges substantially, I split `.ios` / `.android` files so each platform stays readable and testable. I avoid scattering platform checks across business logic.�

---
