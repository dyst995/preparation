# 01. React Navigation building blocks

> Source: `interview-prep/react-native/04-navigation.md`

### Topics to learn
- [ ] Native Stack vs JS Stack
- [ ] Bottom Tabs
- [ ] Drawer (if used)
- [ ] Nested navigators
- [ ] NavigationContainer + linking config
- [ ] Common hooks: `useNavigation`, `useRoute`, `useFocusEffect`
- [ ] Screen options, headers, presentation modes (modal/card)

### Native Stack vs Stack

- **Native Stack**: uses platform native navigation primitives; generally better transitions/performance/feel.
- **JS Stack**: more flexible in some edge cases, but native stack is the usual default today.

### Interview answer

> �I default to native stack for platform-feel and performance, nest tab navigators for primary sections, and push feature stacks for flows like transfers or KYC. Nesting is deliberate � each navigator has a clear responsibility.�

---
