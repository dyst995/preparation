# 15. Tie-backs to your experience (use in answers)

> Source: `interview-prep/react-native/10-testing.md`

- Your crash-rate reduction stories (MyCreditInfo ~20%?0.03%, Wizer ~15%?0.09%, Online School ~28%?0.15%) are strong evidence for "why do you prioritize tests around risk" � you've lived the cost of untested/undertested legacy code and fixed it production-side; testing strategy is the proactive version of the same discipline.
- EasyPay's money-movement screens (QR payments, transfers, wallet, loans) are your best concrete example for "what would you integration-test first in a fintech app."
- Wizer's Flitt payments integration and Clean House's WebSocket + FCM real-time flow are good examples for discussing mocking external/native dependencies (payment gateway responses, socket events, push handlers) in tests.
- Fastlane-driven CI/CD pipelines (Orient Logic, Online School) pair naturally with "where do tests run in your pipeline" � unit/integration on every PR, E2E smoke tests gating release builds.

---
