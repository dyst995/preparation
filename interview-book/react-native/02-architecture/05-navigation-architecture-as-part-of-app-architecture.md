# 05. Navigation architecture as part of app architecture

> Source: `interview-prep/react-native/02-architecture.md`

### Pattern: separate auth stack and app stack

```text
RootNavigator
  if !hydrated: Splash/Bootstrap
  if !authenticated: AuthStack
  else: AppStack (tabs/drawer + nested stacks)
```

### Why this matters

- Prevents �go back to Login� bugs
- Makes deep links easier to reason about
- Clarifies ownership of session state

### Topics to learn
- [ ] Conditional navigators vs runtime redirect hacks
- [ ] Where session state lives (auth feature + secure storage)
- [ ] How payment flows get their own nested stack
- [ ] Modal flows vs push flows

---
