# 09. Staged rollouts

> Source: `interview-prep/react-native/11-cicd-releases.md`

### Topics to learn
- [ ] Play Store staged rollout percentages
- [ ] App Store phased release mechanics
- [ ] Halting/rolling back a rollout
- [ ] Correlating rollout percentage with crash monitoring
- [ ] Deciding rollout speed based on blast radius of the change

### Why staged rollouts matter

A staged rollout limits the "blast radius" of a bad release. Instead of 100% of users getting a broken build simultaneously, you expose 5-10% first, watch Crashlytics/vitals, and only increase the percentage once metrics look healthy.

### Practical playbook

1. Ship to internal/closed testing track first; sanity-check manually.
2. Promote to production at a low percentage (e.g. 10%).
3. Watch crash-free rate, ANR rate, and any custom health metrics for a defined window (e.g. a few hours to a day depending on traffic volume).
4. If healthy, increase rollout (e.g. 10% -> 50% -> 100%).
5. If unhealthy, halt the rollout (Play allows halting without full user impact) and prepare a fix or rollback.

### Interview question

**Q: How do staged rollouts fit into your CI/CD pipeline?**

> "My `promote_production` Fastlane lane takes a rollout percentage as a parameter. A release always starts at a conservative percentage, gated behind manual approval in GitLab. I keep the crash dashboard open during the rollout window and only bump the percentage - also via a manual pipeline job - once metrics look clean. If something regresses, halting the rollout is a one-click action in the Play Console, and for iOS I'd pause the phased release the same way."

---
