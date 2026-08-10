# 09. Analytics events (high level)

> Source: `interview-prep/react-native/08-push-firebase-device.md`

### Topics to learn
- [ ] Screen view tracking vs custom events
- [ ] Naming conventions for events (consistent, low-cardinality, documented)
- [ ] Funnel thinking: signup ? KYC ? first transaction, etc.
- [ ] Avoiding PII in event properties
- [ ] Correlating crash spikes with recent feature/analytics events for root-causing regressions

### Interview question

**Q: How would you instrument analytics for a money-transfer funnel?**

> "I'd define discrete funnel steps � transfer initiated, recipient selected, amount entered, confirmation viewed, biometric/PIN confirmed, transfer succeeded/failed � each as a consistently named event with minimal, non-PII properties like amount bucket or currency, not exact recipient identity. That funnel tells product where users drop off, and pairing it with Crashlytics breadcrumbs helps correlate a spike in abandonment with an actual bug versus a UX friction point."

---
