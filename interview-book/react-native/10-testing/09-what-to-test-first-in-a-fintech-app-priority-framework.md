# 09. What to test first in a fintech app (priority framework)

> Source: `interview-prep/react-native/10-testing.md`

### Topics to learn
- [ ] Risk-based prioritization: financial correctness > auth/security > core navigation > everything else
- [ ] Under time pressure, what's non-negotiable vs nice-to-have
- [ ] Regression-proofing the exact bugs that have bitten you before (crash-rate stories, precision bugs)

### Priority order

1. **Money math and formatting** � smallest bug, largest consequence; unit test every formatting/rounding/precision edge case.
2. **Auth and session handling** � login, token refresh, biometric gate, session timeout; a bug here is a security incident, not just a UX bug.
3. **Idempotency/double-submit logic** � directly prevents duplicate financial transactions.
4. **Core money-movement flows end-to-end (integration)** � transfer, QR payment, wallet balance display.
5. **Navigation-critical paths** � deep link/notification routing to the correct screen, especially the killed-state cold-start path.
6. **Everything else** � settings, profile, non-critical display screens; lighter coverage is acceptable.

### Interview question

**Q: Given limited time before a release, what would you test first in a fintech app?**

> "I'd start with money math � formatting, rounding, precision � since a subtle bug there is the highest-consequence, lowest-visibility class of bug. Next, auth and session handling, because a security gap is worse than a crash. Then idempotency and double-submit protection specifically, since that's the exact bug class that turns into duplicate real-money transactions. Only after those would I invest in broader integration coverage of the main money-movement flows end-to-end, and finally navigation-critical paths like deep link and notification routing. Everything else � settings, static screens � gets the lightest coverage since the blast radius of a bug there is low."

---
