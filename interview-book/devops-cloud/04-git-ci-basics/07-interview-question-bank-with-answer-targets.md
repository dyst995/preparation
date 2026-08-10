# 07. Interview question bank (with answer targets)

> Source: `interview-prep/devops-cloud/04-git-ci-basics.md`

1. **Merge vs rebase - when do you use each?** -> rebase own unpublished feature branch for a clean linear history; merge (or just don't rebase) shared/published branches to avoid rewriting others' history.
2. **Revert vs reset?** -> revert creates a new undo commit, safe for shared history; reset rewrites the branch pointer/history, only safe locally/unpublished.
3. **What is cherry-pick used for?** -> applying one specific commit from one branch onto another, e.g. porting a hotfix from a release branch to main.
4. **What does `.gitlab-ci.yml` define, and what's the relationship between stages and jobs?** -> the pipeline; stages define ordering, jobs within a stage run in parallel.
5. **What is a GitLab Runner, and why did you need a specific one for iOS builds?** -> the agent that executes CI jobs; iOS builds require macOS + Xcode, so you need a macOS-capable runner, tagged and routed specifically for those jobs.
6. **How do you keep secrets out of a CI pipeline's committed config?** -> CI/CD variables configured in project settings, masked and scoped to protected branches, never hardcoded in .gitlab-ci.yml.
7. **What does Fastlane's `match` do, and why does it exist?** -> synchronizes iOS signing certificates/provisioning profiles across a team via an encrypted shared repo, avoiding "works on my machine" signing issues and manual certificate management.
8. **What's the difference between `gym`, `deliver`, and `pilot`?** -> gym builds/signs the binary; deliver uploads App Store metadata/binaries for release; pilot manages TestFlight beta distribution.
9. **Why build one artifact and promote it through environments instead of rebuilding per environment?** -> guarantees what was tested is exactly what's deployed; avoids environment-specific build drift.
10. **How would you structure a backend CI pipeline from scratch?** -> lint -> test -> build (Docker image tagged by commit SHA) -> deploy with manual gate for production, migrations handled carefully around the deploy boundary.

---
