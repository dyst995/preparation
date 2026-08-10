# 12. Hotfix strategy

> Source: `interview-prep/react-native/11-cicd-releases.md`

### Topics to learn
- [ ] Deciding OTA vs emergency binary release
- [ ] Branching strategy for hotfixes (hotfix branch off production tag)
- [ ] Expedited review requests (Apple supports this for critical fixes)
- [ ] Fast-tracking through CI without skipping safety checks
- [ ] Post-incident staged rollout even for hotfixes

### Decision flow

1. **Classify the bug**: JS-only logic bug vs native/permissions/dependency issue.
2. **If JS-only and policy-safe**: ship via OTA immediately; still go through the normal PR/lint/test pipeline, just prioritized.
3. **If native or policy-sensitive**: cut a hotfix branch from the current production tag (not from main, which may have unrelated in-flight work), fix, run full CI, and release as a new build.
4. **iOS specifically**: if it's severe (payments broken, crash on launch), request Apple's expedited review to shorten review time - reserve this for genuinely urgent cases, not convenience.
5. **Still stage the rollout** for the hotfix itself where possible - a hotfix that's itself broken is a real risk, so even urgent releases benefit from a fast but staged rollout (e.g. 20% then quickly to 100% once confirmed clean) rather than 100% blind.
6. **Backport**: merge the hotfix branch back into main so the fix isn't lost in the next regular release.

### Interview question

**Q: Production is down for a payment flow. Walk me through your hotfix process.**

> "First I confirm scope and root cause fast - is this JS logic, a backend contract change, or a native/crash issue - using Crashlytics and recent release diffs. If it's a pure JS bug and within OTA policy limits, I ship an OTA fix immediately since that's minutes, not hours. In parallel, or instead if it needs a native fix, I branch a hotfix off the current production tag, keep the fix minimal and reviewed, run it through the full Fastlane/GitLab pipeline - I don't skip tests just because it's urgent, since a bad hotfix is worse than a slow one - and for iOs I'd request expedited review given the severity. I still roll out cautiously, watching crash and payment-success metrics, then backport the fix into main so it isn't lost."

---
