# 08. Store release checklists

> Source: `interview-prep/react-native/11-cicd-releases.md`

### Google Play checklist

- [ ] `versionCode` incremented, `versionName` matches intended release
- [ ] Signed AAB built with correct signing config (release, not debug)
- [ ] Proguard/R8 mapping file uploaded (for readable crash stacks)
- [ ] Target API level meets current Play requirements
- [ ] Privacy policy URL present and accurate
- [ ] Data safety form up to date (permissions match what the app actually collects)
- [ ] Release notes written for the track
- [ ] Screenshots/store listing current if UI changed materially
- [ ] Internal/closed testing track validated before production promotion
- [ ] Staged rollout percentage decided (not 100% by default for risky releases)
- [ ] Crash-free users dashboard open and monitored post-release

### App Store checklist

- [ ] Build number incremented, marketing version matches intended release
- [ ] Correct provisioning profile (App Store distribution) used for the export
- [ ] dSYMs uploaded (via Fastlane/Crashlytics) for symbolicated crash stacks
- [ ] App Store screenshots/metadata current for all required device sizes
- [ ] Export compliance (encryption) question answered correctly
- [ ] Privacy nutrition labels match actual data collection/SDKs
- [ ] TestFlight build validated by internal/external testers first
- [ ] Release strategy chosen: automatic release vs manual release after approval
- [ ] Phased release enabled for production (Apple's own staged rollout over ~7 days) when appropriate
- [ ] Crashlytics/App Store Connect crash trends monitored post-release

### Interview question

**Q: What do you check in the first 24-48 hours after a store release?**

> "Crash-free users/sessions rate versus the previous version, any spike in a specific crash signature tied to the new build, ANR rate on Android, key funnel metrics if the release touched a critical flow like payments, and store console warnings (policy, pre-launch report issues). If crash-free rate drops meaningfully, I pause or roll back the staged rollout percentage rather than letting it continue to 100%."

---
