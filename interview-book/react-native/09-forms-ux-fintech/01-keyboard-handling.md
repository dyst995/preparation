# 01. Keyboard handling

> Source: `interview-prep/react-native/09-forms-ux-fintech.md`

### Topics to learn
- [ ] `KeyboardAvoidingView` and its platform-specific `behavior` prop (`padding` on iOS, `height`/`position` considerations on Android)
- [ ] `keyboardVerticalOffset` and header/safe-area interactions
- [ ] Modern alternatives: `react-native-keyboard-controller` (`KeyboardAvoidingView`/`KeyboardStickyView` replacements with smoother, native-driven animations)
- [ ] `ScrollView` + `keyboardShouldPersistTaps` for forms with buttons below inputs
- [ ] Avoiding layout jumps when the keyboard opens/closes
- [ ] Auto-scrolling to the focused input (`scrollToFocusedInput` patterns)
- [ ] `returnKeyType`, `onSubmitEditing`, and chaining focus between inputs (ref-based `focus()` calls)
- [ ] Numeric keypad types for money inputs (`keyboardType="decimal-pad"` / `numeric`) and their platform quirks (e.g. decimal separator differences by locale)

### Why this is harder than it looks

RN doesn't reflow the whole page like a web browser resizing its viewport. You explicitly own:
- Whether content pushes up (`padding`) or the view resizes to fit above the keyboard.
- Whether taps on buttons rendered above the keyboard are swallowed before the keyboard dismisses (`keyboardShouldPersistTaps="handled"` fixes this classic bug).
- Whether the focused input is visible at all once the keyboard opens (a bottom-of-screen input can end up hidden unless you scroll to it manually).

### Platform behavior differences

| Aspect | iOS | Android |
|---|---|---|
| Keyboard covers content by default | Yes, needs `KeyboardAvoidingView` | Usually handled by `windowSoftInputMode="adjustResize"` in the manifest, but can conflict with `KeyboardAvoidingView` if both fight over resizing |
| Recommended `behavior` | `padding` | Often `undefined`/`height`, or rely on manifest `adjustResize` and skip `KeyboardAvoidingView` entirely |
| Decimal keypad separator | Respects device locale automatically | Same, but older Android versions have had inconsistent `decimal-pad` support � test on real low-end devices |

### Interview question

**Q: A form's submit button gets hidden behind the keyboard on iOS but works fine on Android. Why, and how do you fix it?**

> "iOS doesn't automatically resize the view when the keyboard appears � Android often does via `adjustResize` in the manifest. On iOS I wrap the screen in `KeyboardAvoidingView` with `behavior=\"padding\"` (and a `keyboardVerticalOffset` accounting for the header/safe area), or migrate to `react-native-keyboard-controller` for a smoother native-driven experience. I also make sure the scroll container uses `keyboardShouldPersistTaps=\"handled\"` so the first tap on the button actually registers instead of just dismissing the keyboard."

---
