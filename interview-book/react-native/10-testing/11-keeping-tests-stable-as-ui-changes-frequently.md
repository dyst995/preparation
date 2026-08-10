# 11. Keeping tests stable as UI changes frequently

> Source: `interview-prep/react-native/10-testing.md`

### Topics to learn
- [ ] Querying by role/label/testID instead of exact text/structure where copy or layout churns often
- [ ] Avoiding brittle snapshot tests on frequently-changing UI (snapshots on rapidly evolving screens become "update snapshot" reflexes, not real verification)
- [ ] Testing behavior/outcomes ("the success screen shows the reference number"), not implementation details ("the component's internal state is X")
- [ ] Isolating flaky sources: fake timers for anything timer-based, deterministic mocked responses, disabling animations in tests
- [ ] Test IDs as a deliberate, stable contract between design/dev, not an afterthought sprinkled randomly

### Interview question

**Q: The UI on your team changes constantly and tests keep breaking for unrelated reasons. How do you fix that?**

> "First, I check if tests are asserting on brittle things � exact copy via `getByText` for text that changes often, or snapshot tests on screens with frequent visual churn, both of which break for reasons unrelated to actual regressions. I shift toward role/label/testID queries and behavior-level assertions � 'the success state is shown,' not 'this exact JSX tree matches.' I also make sure anything timer- or animation-driven uses fake timers and has animations disabled in the test environment, since real timing is a huge source of flakiness. The underlying principle is: tests should break when behavior actually changes, not when someone tweaks a class name or copy string."

---
