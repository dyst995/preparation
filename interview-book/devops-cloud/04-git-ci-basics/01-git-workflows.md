# 01. Git workflows

> Source: `interview-prep/devops-cloud/04-git-ci-basics.md`

### Topics to learn
- [ ] Feature branching (branch per feature/ticket, PR/MR into main or develop)
- [ ] Git Flow (main/develop/feature/release/hotfix branches) - awareness, know when it's overkill
- [ ] Trunk-based development (short-lived branches, frequent merges to main, heavy reliance on feature flags) - awareness
- [ ] Protected branches, required reviews, required CI checks before merge
- [ ] Release branches / release candidates (relevant to your Fastlane/mobile release experience)

### Comparison

| Workflow | Good for | Trade-off |
|---|---|---|
| Feature branching + PRs | Most teams, most sizes | Straightforward, works with any release cadence |
| Git Flow | Scheduled/versioned releases, multiple maintained versions | More ceremony/branches than most teams need today |
| Trunk-based | High-velocity teams with strong CI/feature flags | Requires discipline and feature-flag infrastructure to avoid breaking main |

### Model spoken answer

"Day to day I work with feature branches off main, opened as a merge request/PR for review and CI checks before merging. For mobile release cycles specifically - like the Android/iOS pipelines I built with GitLab Runner and Fastlane - a release-branch or release-candidate model made more sense, since app store review adds a real time delay and you need a stable snapshot to promote through internal testing, staged rollout, and store review rather than constantly shipping off a fast-moving main branch."

---
