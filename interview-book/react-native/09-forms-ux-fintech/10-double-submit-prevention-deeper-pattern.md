# 10. Double-submit prevention (deeper pattern)

> Source: `interview-prep/react-native/09-forms-ux-fintech.md`

### Topics to learn
- [ ] Disabling the trigger element synchronously in the same event handler tick, before any `await`
- [ ] Using a ref-based in-flight guard rather than relying purely on state (state updates can lag a frame)
- [ ] Debouncing rapid re-taps distinctly from disabling (debounce for accidental double-taps, disable for the full request duration)
- [ ] Combining client guard + idempotency key (see section 6) as the full solution

### Interview question

**Q: In code, how exactly do you prevent a double network call from a fast double-tap, beyond just an idempotency key?**

> "I use a ref (not state) as an in-flight guard, because state updates can be asynchronous and a very fast double-tap can fire before a re-render disables the button. The handler checks and sets the ref synchronously at the very top, before any `await`, so the second tap is rejected immediately regardless of render timing. The button's disabled *visual* state can lag slightly behind, but the actual guard against firing two requests is the synchronous ref check plus the idempotency key as the ultimate server-side backstop."

---
