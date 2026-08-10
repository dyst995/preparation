# 02. Nested navigation architecture

> Source: `interview-prep/react-native/04-navigation.md`

### Typical production shape

```text
NavigationContainer
  RootStack
    Bootstrap
    AuthStack
      Login
      Register
      ForgotPassword
    AppTabs
      HomeStack
      WalletStack
      PaymentsStack
      ProfileStack
    ModalStack (optional)
      Receipt
      Help
```

### Rules of nesting

- Tabs own top-level sections
- Each tab often has its own stack for hierarchy
- Cross-tab jumps need care (navigate to tab first, then screen)
- Don�t put every screen in one giant flat stack if the product has clear sections

### Common gotcha

Navigating to a screen in another tab without targeting the right nested navigator ? �action not handled� / unexpected back behavior.

---
