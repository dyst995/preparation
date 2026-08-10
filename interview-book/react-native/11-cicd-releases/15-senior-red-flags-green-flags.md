# 15. Senior red flags / green flags

> Source: `interview-prep/react-native/11-cicd-releases.md`

### Green flags interviewers love
- Knows the difference between upload key and app signing key without prompting.
- Ties every CI decision to a concrete failure mode it prevents (cert limits, versionCode collisions, secret leaks).
- Has an opinion on when OTA is inappropriate, not just when it's convenient.
- Talks about monitoring *after* release as part of the release process, not an afterthought.
- Can explain a real hotfix they shipped, including what went right/wrong.

### Red flags
- "Fastlane just automates the App Store, I don't know the details."
- Treats OTA as a way to bypass App Store review for real features.
- No opinion on staged rollouts ("we just release to 100%").
- Doesn't know keystores/certs expire or can be lost.
- Stores secrets in the repo "because it's private."

---
