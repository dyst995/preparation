# 13. Full interview question bank (with answer targets)

> Source: `interview-prep/react-native/11-cicd-releases.md`

### Builds & signing
1. **Debug vs release build differences?** - bundling, `__DEV__`, signing, minification, endpoints.
2. **What is Play App Signing and why does it matter?** - protects you if you lose your upload key.
3. **What are the iOS provisioning profile types?** - Development, Ad Hoc, App Store, Enterprise.
4. **Why use `fastlane match`?** - one shared encrypted signing identity for team + CI, avoids cert-limit errors.

### Pipeline design
5. **Why a self-hosted GitLab Runner for iOS?** - Xcode/macOS requirement, caching control.
6. **How do you structure `.gitlab-ci.yml` stages?** - install -> test -> build -> deploy, fail fast.
7. **How do you gate production releases?** - manual approval job + tag-triggered pipeline.
8. **How do you avoid `versionCode`/build number collisions?** - query the store's live latest value, don't use a local counter.

### OTA & store ops
9. **CodePush/EAS Update vs full release - tradeoffs?** - speed/rollback vs native capability/review requirement.
10. **What must always go through a full store release?** - native code, permissions, new deps, icons/splash.
11. **What's in your Play/App Store release checklist?** - see Section 8.
12. **What do you monitor after release?** - crash-free rate, ANR rate, key funnel metrics.

### Safety mechanisms
13. **How do staged rollouts work and why use them?** - limit blast radius, monitor before widening.
14. **What does R8 actually do?** - shrink, obfuscate, optimize; keep rules for reflection.
15. **How do you keep CI secrets safe?** - masked/protected variables, `match` encryption, least privilege, rotation on suspicion.
16. **Your hotfix strategy under production pressure?** - classify, OTA if safe, hotfix branch + full CI if native, expedited review if severe, still stage rollout, backport.

---
