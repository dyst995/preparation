# 09. Senior red flags / green flags

> Source: `interview-prep/devops-cloud/04-git-ci-basics.md`

### Green flags
- Knowing when NOT to rebase (shared/pushed branches) as clearly as when to rebase.
- Explaining revert vs reset precisely, including the shared-history safety distinction.
- Describing Fastlane lanes and specific actions (gym/match/pilot/supply) rather than "Fastlane just builds the app."
- Explaining why iOS CI needs a macOS runner specifically, showing real infrastructure awareness.
- Talking about artifact promotion (build once, deploy everywhere) rather than rebuilding per environment.

### Red flags
- Treating merge and rebase as interchangeable with no opinion on when to use which.
- Using `git reset --hard` + force-push on a shared branch as a casual habit.
- Not knowing what a CI "stage" vs "job" is.
- Claiming Fastlane/CI experience with no ability to name a single actual action or concept beyond "it automates builds."

---
