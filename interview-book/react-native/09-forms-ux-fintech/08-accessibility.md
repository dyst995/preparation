# 08. Accessibility

> Source: `interview-prep/react-native/09-forms-ux-fintech.md`

### Topics to learn
- [ ] `accessible`, `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`
- [ ] `accessibilityState` (`disabled`, `selected`, `busy`) for custom controls
- [ ] Minimum touch target size (roughly 44�44pt iOS / 48�48dp Android guidance)
- [ ] Dynamic type / font scaling support (`allowFontScaling`, avoiding fixed-height text containers that clip scaled text)
- [ ] Color contrast for critical text (amounts, error states)
- [ ] Screen reader flow order (grouping related elements, avoiding a chaotic reading order)
- [ ] Announcing dynamic changes (e.g. `AccessibilityInfo.announceForAccessibility` for a payment result)

### Interview question

**Q: What accessibility basics do you apply by default in a fintech screen?**

> "Every interactive element gets a meaningful `accessibilityLabel` and correct `accessibilityRole` � a custom `Pressable` styled as a button still needs `role=\"button\"` for screen readers. I keep touch targets at least ~44pt/48dp even if the visual design is smaller, using hit-slop if needed. I avoid fixed-height text containers for amounts and labels so they don't clip when a user has larger system font sizes enabled, and I make sure error and success states aren't conveyed by color alone � there's always an icon or text label too. For state changes that aren't visually obvious to a screen reader user, like a payment completing, I announce it explicitly rather than relying on them to notice a visual change."

---
