# 09. StyleSheet & Flexbox (RN vs web)

> Source: `interview-prep/react-native/01-fundamentals.md`

### Topics to learn
- [ ] Yoga layout engine basics
- [ ] Default `flexDirection: 'column'` in RN (vs row on web in many CSS resets � know RN default)
- [ ] No cascading CSS; styles are JS objects
- [ ] Density / pixel ideas (`PixelRatio`) at high level
- [ ] Shadows differ iOS vs Android
- [ ] `StyleSheet.create` benefits (some validation + referential stability)
- [ ] Absolute positioning and safe areas

### Important differences to memorize

1. **Default flex direction** in RN is `column`.
2. **No CSS cascade / selectors** � you compose style arrays.
3. **Subset of CSS-like properties**, not full CSS.
4. **Units** are density-independent pixels conceptually (not `px`/`rem` like web).
5. **Inheritance** is limited; text styles often need to live on `Text`.

### Interview question

**Q: How does Flexbox differ in RN?**

> �RN uses Flexbox via Yoga, but defaults differ � notably `flexDirection` defaults to column. There�s no CSS cascade; styles are explicit objects/arrays. Only a subset of CSS concepts exist, and platform-specific styling (especially shadows and fonts) still matters. I treat layout as mobile-first Flexbox, not web CSS.�

---
