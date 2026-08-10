# 06. Android implementation shape (interview depth)

> Source: `interview-prep/react-native/17-turbo-modules.md`

### Topics to learn
- [ ] Implement the Codegen-generated TurboModule interface
- [ ] Kotlin/Java class providing method bodies
- [ ] Package / module provider registration for New Arch
- [ ] Coroutines/executors for background work
- [ ] Main thread for UI / certain Android APIs
- [ ] Avoid blocking the JS runtime with sync heavy work

### What interviewers want to hear

You won't necessarily whiteboard every annotation from memory, but you should say:

1. Spec is generated into a Java/Kotlin interface.
2. Your module class implements that interface.
3. You register a module provider so the registry can lazy-construct it.
4. You keep threading discipline identical to any serious Android code.
5. You return results through the generated promise types / sync returns as declared.

---
