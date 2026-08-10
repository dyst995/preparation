# 06. Backend CI concepts (generalized, not tied to a specific mobile pipeline)

> Source: `interview-prep/devops-cloud/04-git-ci-basics.md`

### Topics to learn
- [ ] Standard pipeline shape: lint -> unit test -> (integration test) -> build -> containerize -> deploy
- [ ] Fail fast: cheap checks (lint) before expensive ones (integration tests, builds)
- [ ] Environments: dev/staging/production, each potentially with its own deploy job and variables
- [ ] Artifact promotion: build once, deploy the same artifact/image to multiple environments (don't rebuild per environment - risk of drift)
- [ ] Rollback strategy: keep previous image tags/versions available for quick rollback
- [ ] Database migrations as a deploy step, and why they need care (run before or after the new code deploys, backward-compatible schema changes)

### Model spoken answer

"For a backend service, I structure the pipeline as fail-fast stages: lint first since it's cheap and catches obvious mistakes immediately, then unit tests, then a build step that produces one artifact - typically a Docker image tagged with the commit SHA - and that exact image gets promoted through staging and production rather than rebuilt per environment, so what you tested is exactly what you deploy. Database migrations are their own careful step, usually run just before or after deploy depending on whether the change is backward compatible with the currently running code, since you don't want a brief window where old code hits a new schema it doesn't understand, or vice versa."

---
