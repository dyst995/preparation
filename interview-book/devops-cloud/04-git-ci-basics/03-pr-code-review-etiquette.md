# 03. PR / code review etiquette

> Source: `interview-prep/devops-cloud/04-git-ci-basics.md`

### Topics to learn
- [ ] Small, focused PRs over huge ones
- [ ] Clear PR description: what changed and why, not just what
- [ ] Self-review before requesting review (catch obvious issues yourself first)
- [ ] As a reviewer: focus on correctness/design/maintainability first, nitpick style last (and ideally let a linter/formatter handle style entirely)
- [ ] Explain reasoning in review comments, not just "change this"
- [ ] Required CI checks passing before merge as a baseline gate

### Model spoken answer

"I try to keep PRs small and focused on one thing, with a description that explains the why, not just a list of changed files - that context is what actually helps a reviewer. As a reviewer, I prioritize correctness and design concerns over style, since style should mostly be enforced by a linter/formatter in CI rather than argued about in review comments. And I treat CI passing - lint, tests, build - as a non-negotiable baseline before merge, not something to override under time pressure."

---
