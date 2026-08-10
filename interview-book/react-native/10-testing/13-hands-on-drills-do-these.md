# 13. Hands-on drills (do these)

> Source: `interview-prep/react-native/10-testing.md`

- [ ] Write a Jest test for a money-formatting util covering at least one floating-point edge case.
- [ ] Write a Zustand store test that resets state in `beforeEach` and verifies an action mutates state correctly.
- [ ] Write an RNTL test for a form component using `getByLabelText` and `userEvent.type`.
- [ ] Write and run a mocked Notifee `__mocks__` file and a test asserting `displayNotification` is called with the right channel id.
- [ ] Write an integration test for a transfer flow: mock the network layer, simulate the full happy path, then write a second test for the failure path.
- [ ] Write a `getStateFromPath` test for at least one deep link route with valid and invalid params.
- [ ] Convert one brittle `getByText`-based test into a `getByRole`/`getByLabelText`-based test and explain why it's now more resilient.
- [ ] Sketch (on paper) 3 Detox/Maestro smoke-test scenarios you'd pick for a fintech app if you could only have 3.

---
