# 06. Fastlane + GitLab Runner CI/CD (cross-cutting story)

> Source: `interview-prep/react-native/14-behavioral-stories.md`

### STAR breakdown

- **Situation**: Multiple apps across your projects either had no CI/CD or had manual, error-prone release processes.
- **Task**: Build a reliable, repeatable Android + iOS release pipeline usable across projects.
- **Action**: Set up Fastlane lanes per platform (build, sign, upload, changelog, notify) and GitLab Runner infrastructure - including a self-hosted macOS runner for iOS builds - with staged rollouts and secrets handled securely.
- **Result**: Releases went from manual, risky, and slow to automated, auditable, and fast, directly enabling faster iteration and safer production releases across multiple apps.

### Spoken script (60-90s)

> "Across several projects I kept running into the same problem: releases were manual, which meant they were slow, inconsistent, and risky - easy to fat-finger a signing step or forget a version bump. I built out Fastlane lanes for both Android and iOS covering build, signing, store upload, and changelog/notification steps, and wired that into GitLab CI, including setting up a self-hosted macOS runner specifically for iOS since that needs Xcode. Signing secrets and API keys were handled through GitLab's protected, masked CI variables and, for iOS certificates specifically, through Fastlane match so the whole team and CI shared one signing identity instead of everyone minting their own certificates. Production releases were gated behind manual approval and used staged rollouts rather than shipping to everyone at once. The impact was direct: what used to be an error-prone manual process with real risk of a bad signing mistake became a one-click, auditable pipeline, which also meant we could react to production issues - hotfixes - far faster than before."

### Likely follow-ups
- See Chapter 11 in depth for any technical follow-up on this story (signing, pipeline stages, secrets).
- "What was the biggest pipeline failure you had to debug?" - have a specific incident ready (expired cert, versionCode collision, etc.).

---
