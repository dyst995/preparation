# 07. Integration tests for critical flows

> Source: `interview-prep/react-native/10-testing.md`

### Topics to learn
- [ ] Definition: multiple units (components + hooks + query client + navigation) exercised together, network/native mocked at the boundary
- [ ] Choosing which flows deserve integration coverage (see section 9)
- [ ] Structuring an integration test: render the flow's entry screen, simulate real user actions end-to-end, assert on the final visible outcome
- [ ] Balancing realism vs speed/flakiness � integration tests shouldn't hit a real backend

### Example shape (transfer flow, described)

1. Render the "New Transfer" screen wrapped in real navigation + real query client, with the network layer mocked to return a valid recipient lookup and a successful transfer response.
2. Simulate: select recipient ? type amount ? tap confirm ? tap biometric-confirm (mocked to succeed).
3. Assert: a success/receipt screen is now visible with the correct amount and reference number.
4. Add a second integration test where the mocked transfer response is a failure, asserting the error state renders with a retry option and no navigation to a false success screen.

### Interview question

**Q: What would you write an integration test for in a payments app, versus a unit test?**

> "Unit tests cover isolated logic � does the money formatter produce the right string, does the validation schema reject a negative amount. An integration test covers the full user-observable flow � can a user actually go from 'select recipient' through 'confirm' to 'see a receipt,' with the network and native layers mocked at the boundary but everything above that real. I'd write integration tests for the money-movement flows specifically because that's where a passing set of isolated unit tests can still hide a broken wiring bug between screens � the failure mode I most want an early warning for."

---
