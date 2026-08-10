# 06. Feature flags / remote config for risky releases

> Source: `interview-prep/react-native/12-upgrades-stability.md`

### Topics to learn
- [ ] Remote config as a kill switch for a risky feature
- [ ] Percentage rollout of a feature independent of the binary rollout
- [ ] Combining feature flags with staged binary rollouts for layered safety
- [ ] Avoiding "flag debt" (flags that never get cleaned up)

### Why this matters for stability

A staged binary rollout protects against a bad *build*. A feature flag protects against a bad *feature* without needing a new build at all - you can disable just the risky code path remotely, often faster than any hotfix release.

### Practical pattern

```text
if (remoteConfig.isEnabled('new_transfer_flow')) {
  return <NewTransferFlow />;
}
return <LegacyTransferFlow />;
```

- Ship the new flow dark (flag off) in a normal release.
- Enable for a small % of users via remote config, watch Crashlytics/analytics for that cohort specifically.
- Ramp or roll back the flag directly - no new binary/review cycle needed for the rollback.
- Remove the flag and the legacy path once the new flow is proven stable, to avoid flag debt.

### Interview question

**Q: How do feature flags help with production stability?**

> "They decouple 'code is deployed' from 'code is active.' I can ship a risky change dark, ramp it to a small percentage of users via remote config, and if something goes wrong, disable it instantly without waiting on a new build, review, or rollout - which is much faster than any hotfix pipeline. It's a second, independent safety layer on top of staged binary rollouts: one protects against a bad build, the other protects against a bad feature inside an otherwise fine build."

---
