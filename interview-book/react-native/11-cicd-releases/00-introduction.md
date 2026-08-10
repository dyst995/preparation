# 11 - Builds, CI/CD, Releases & Store Ops — Introduction

> Source: `interview-prep/react-native/11-cicd-releases.md`

> Goal: Speak fluently and confidently about the exact pipeline you built and ran in production - Fastlane + GitLab Runner for Android and iOS, signing, versioning, OTA tradeoffs, store submission, staged rollouts, and hotfixes - at a depth that survives senior/staff follow-ups.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Explain the difference between debug and release builds at the bundling, signing, and native-config level.
2. Walk through Android keystore management and iOS certificate/profile management without hand-waving.
3. Write and explain real Fastlane lanes for both platforms (build, sign, upload, changelog, notify).
4. Design a GitLab CI pipeline (with a self-hosted Runner, including a macOS runner for iOS) end-to-end.
5. Defend a versioning scheme (build numbers vs marketing versions) that survives multiple release trains.
6. Compare CodePush/EAS Update OTA delivery vs full store releases, including what Apple/Google policy allows.
7. Run a store submission checklist from memory for both Google Play and the App Store.
8. Explain staged rollouts and how you use them as a safety net.
9. Describe Proguard/R8 at a level that shows you understand shrinking, not just "it obfuscates code."
10. Handle CI secrets securely (no secrets in git, no secrets in logs).
11. Describe a hotfix strategy under production pressure, including when OTA is enough and when it isn't.

---
